// All app data + every action that changes it. Screens read this with useFinance().
// Every action validates its input BEFORE touching the data, so an empty / zero / non-numeric entry can never reach Firestore or the totals.
// Actions that add something return true (added) or false (refused); loan items return 'ok' | 'empty' | 'exists'.
import React, { createContext, useContext, useMemo } from 'react';
import { useCloudStore } from './cloud';
import { useToast } from './components/ui';
import { DEFAULT_UTILITIES, INITIAL_LOANS } from './config';
import { buildGoal, reviseGoal, setGoalMonthAmount, cleanAmount, validAmount, num, newId } from './finance';

const DEFAULTS = { incomes: {}, utilities: {}, expenses: {}, loans: INITIAL_LOANS, savings: [] };
// same document keys as the original tracker, so data can be copied across if ever needed
const KEYS = { incomes: 'kutitap_incomes', utilities: 'kutitap_utilities', expenses: 'kutitap_expenses', loans: 'kutitap_loans', savings: 'kutitap_savings' };
const DOC_DEFAULTS = Object.fromEntries(Object.entries(KEYS).map(([n, k]) => [k, DEFAULTS[n]]));

const Ctx = createContext(null);
export const useFinance = () => useContext(Ctx);

const blankLoanCat = { columns: [], cells: {}, paidCells: {} };
const loanCat = (loans, cat) => loans[cat] || INITIAL_LOANS[cat] || blankLoanCat;
const cleanName = (s, max) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, max);

export function FinanceProvider({ children }) {
  const toast = useToast();
  const { data, update, status, ready } = useCloudStore(DOC_DEFAULTS, () => toast("Couldn't save to the cloud, that change was undone", 'warn'));
  const d = { incomes: data[KEYS.incomes], utilities: data[KEYS.utilities], expenses: data[KEYS.expenses], loans: data[KEYS.loans], savings: data[KEYS.savings] };
  // typing (amount boxes) is written after a short pause; add / delete / toggle are written straight away
  const up = (name, fn, now = false) => update(KEYS[name], fn, { now });

  const actions = useMemo(() => ({
    // income: a single amount the user types in
    setIncome: (mk, value) => up('incomes', (p) => ({ ...p, [mk]: { ...(p[mk] || {}), actual: cleanAmount(value) } })),

    utilitiesOf: (utilities, mk) => utilities[mk] || DEFAULT_UTILITIES,
    setUtilityAmount: (mk, name, value) => up('utilities', (p) => {
      const month = p[mk] || DEFAULT_UTILITIES;
      return { ...p, [mk]: { ...month, [name]: { ...(month[name] || DEFAULT_UTILITIES[name]), amount: cleanAmount(value) } } };
    }),
    toggleUtilityPaid: (mk, name) => up('utilities', (p) => {
      const month = p[mk] || DEFAULT_UTILITIES;
      const cur = month[name] || DEFAULT_UTILITIES[name];
      return { ...p, [mk]: { ...month, [name]: { ...cur, paid: !cur.paid } } };
    }, true),

    addExpense: (mk, category, amount) => {
      if (!validAmount(amount)) return false; // nothing is added for an empty or zero amount
      return up('expenses', (p) => ({ ...p, [mk]: [...(p[mk] || []), { id: newId(), category: cleanName(category, 40) || 'Expense', amount: cleanAmount(amount), paid: false }] }), true);
    },
    changeExpense: (mk, id, field, value) => up('expenses', (p) => ({ ...p, [mk]: (p[mk] || []).map((e) => (e.id === id ? { ...e, [field]: field === 'amount' ? cleanAmount(value) : value } : e)) })),
    toggleExpensePaid: (mk, id) => up('expenses', (p) => ({ ...p, [mk]: (p[mk] || []).map((e) => (e.id === id ? { ...e, paid: !e.paid } : e)) }), true),
    deleteExpense: (mk, id) => up('expenses', (p) => ({ ...p, [mk]: (p[mk] || []).filter((e) => e.id !== id) }), true),

    setLoanCell: (cat, rk, col, value) => up('loans', (p) => {
      const c = loanCat(p, cat);
      const v = cleanAmount(value);
      let paidCells = c.paidCells || {};
      if (!num(v) && paidCells[rk]?.[col]) { // an emptied entry has nothing left to pay
        const rest = { ...paidCells[rk] }; delete rest[col];
        paidCells = { ...paidCells, [rk]: rest };
      }
      return { ...p, [cat]: { ...c, paidCells, cells: { ...c.cells, [rk]: { ...(c.cells[rk] || {}), [col]: v } } } };
    }),
    toggleLoanPaid: (cat, rk, col) => up('loans', (p) => {
      const c = loanCat(p, cat);
      if (!num(c.cells[rk]?.[col])) return p;
      const paidCells = c.paidCells || {};
      return { ...p, [cat]: { ...c, paidCells: { ...paidCells, [rk]: { ...(paidCells[rk] || {}), [col]: !paidCells[rk]?.[col] } } } };
    }, true),
    addLoanColumn: (cat, rawName) => {
      const name = cleanName(rawName, 30);
      if (!name || /^__.*__$/.test(name)) return 'empty';
      let result = 'ok';
      up('loans', (p) => {
        const c = loanCat(p, cat);
        if (c.columns.some((x) => x.toLowerCase() === name.toLowerCase())) { result = 'exists'; return p; }
        // an item that was deleted earlier may have left amounts behind: a new item always starts empty
        const cells = {}, paidCells = {};
        Object.entries(c.cells || {}).forEach(([rk, row]) => { const r = { ...row }; delete r[name]; if (Object.keys(r).length) cells[rk] = r; });
        Object.entries(c.paidCells || {}).forEach(([rk, row]) => { const r = { ...row }; delete r[name]; paidCells[rk] = r; });
        return { ...p, [cat]: { ...c, columns: [...c.columns, name], cells, paidCells } };
      }, true);
      return result;
    },
    deleteLoanColumn: (cat, name) => up('loans', (p) => {
      const c = loanCat(p, cat);
      const cells = {}, paidCells = {};
      Object.entries(c.cells || {}).forEach(([rk, row]) => { const r = { ...row }; delete r[name]; if (Object.keys(r).length) cells[rk] = r; });
      Object.entries(c.paidCells || {}).forEach(([rk, row]) => { const r = { ...row }; delete r[name]; paidCells[rk] = r; });
      return { ...p, [cat]: { ...c, columns: c.columns.filter((x) => x !== name), cells, paidCells } };
    }, true),

    addGoal: (form) => {
      if (!String(form.name || '').trim() || !validAmount(form.amount)) return false;
      return up('savings', (p) => [...p, buildGoal({ ...form, name: cleanName(form.name, 60), amount: cleanAmount(form.amount) })], true);
    },
    editGoal: (id, form) => {
      if (!String(form.name || '').trim() || !validAmount(form.amount)) return false;
      return up('savings', (p) => p.map((g) => (g.id === id ? reviseGoal(g, { ...form, name: cleanName(form.name, 60), amount: cleanAmount(form.amount) }) : g)), true);
    },
    deleteGoal: (id) => up('savings', (p) => p.filter((g) => g.id !== id), true),
    toggleAutoCompute: (id) => up('savings', (p) => p.map((g) => (g.id === id ? { ...g, autoCompute: g.autoCompute === false } : g)), true),
    setGoalAmount: (id, key, value) => up('savings', (p) => p.map((g) => (g.id === id ? setGoalMonthAmount(g, key, cleanAmount(value)) : g))),
    toggleGoalPaid: (id, key) => up('savings', (p) => p.map((g) => (g.id === id ? { ...g, monthsList: g.monthsList.map((m) => (m.monthKey === key ? { ...m, paid: !m.paid } : m)) } : g)), true),
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  return <Ctx.Provider value={{ ...d, ...actions, loanCat: (cat) => loanCat(d.loans, cat), status, ready }}>{children}</Ctx.Provider>;
}
