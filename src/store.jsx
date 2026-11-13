// All app data + every action that changes it. Screens read this with useFinance().
import React, { createContext, useContext, useMemo } from 'react';
import { useCloudStore } from './cloud';
import { DEFAULT_UTILITIES, INITIAL_LOANS } from './config';
import { buildGoal, reviseGoal, setGoalMonthAmount } from './finance';

const DEFAULTS = { incomes: {}, utilities: {}, expenses: {}, loans: INITIAL_LOANS, savings: [] };
// same document keys as the original tracker, so data can be copied across if ever needed
const KEYS = { incomes: 'kutitap_incomes', utilities: 'kutitap_utilities', expenses: 'kutitap_expenses', loans: 'kutitap_loans', savings: 'kutitap_savings' };
const DOC_DEFAULTS = Object.fromEntries(Object.entries(KEYS).map(([n, k]) => [k, DEFAULTS[n]]));

const Ctx = createContext(null);
export const useFinance = () => useContext(Ctx);

const blankLoanCat = { columns: [], cells: {}, paidCells: {} };
const loanCat = (loans, cat) => loans[cat] || INITIAL_LOANS[cat] || blankLoanCat;

export function FinanceProvider({ children }) {
  const { data, update, status, ready } = useCloudStore(DOC_DEFAULTS);
  const d = { incomes: data[KEYS.incomes], utilities: data[KEYS.utilities], expenses: data[KEYS.expenses], loans: data[KEYS.loans], savings: data[KEYS.savings] };
  const up = (name, fn) => update(KEYS[name], fn);

  const actions = useMemo(() => ({
    // income: a single amount the user types in
    setIncome: (mk, value) => up('incomes', (p) => ({ ...p, [mk]: { ...(p[mk] || {}), actual: value } })),

    utilitiesOf: (utilities, mk) => utilities[mk] || DEFAULT_UTILITIES,
    setUtilityAmount: (mk, name, value) => up('utilities', (p) => {
      const month = p[mk] || DEFAULT_UTILITIES;
      return { ...p, [mk]: { ...month, [name]: { ...(month[name] || DEFAULT_UTILITIES[name]), amount: value } } };
    }),
    toggleUtilityPaid: (mk, name) => up('utilities', (p) => {
      const month = p[mk] || DEFAULT_UTILITIES;
      const cur = month[name] || DEFAULT_UTILITIES[name];
      return { ...p, [mk]: { ...month, [name]: { ...cur, paid: !cur.paid } } };
    }),

    addExpense: (mk, category, amount) => up('expenses', (p) => ({ ...p, [mk]: [...(p[mk] || []), { id: Date.now(), category: category.trim(), amount, paid: false }] })),
    changeExpense: (mk, id, field, value) => up('expenses', (p) => ({ ...p, [mk]: (p[mk] || []).map((e) => (e.id === id ? { ...e, [field]: value } : e)) })),
    toggleExpensePaid: (mk, id) => up('expenses', (p) => ({ ...p, [mk]: (p[mk] || []).map((e) => (e.id === id ? { ...e, paid: !e.paid } : e)) })),
    deleteExpense: (mk, id) => up('expenses', (p) => ({ ...p, [mk]: (p[mk] || []).filter((e) => e.id !== id) })),

    setLoanCell: (cat, rk, col, value) => up('loans', (p) => {
      const c = loanCat(p, cat);
      let paidCells = c.paidCells || {};
      if (!(parseFloat(value) || 0) && paidCells[rk]?.[col]) { // an emptied entry has nothing left to pay
        const rest = { ...paidCells[rk] }; delete rest[col];
        paidCells = { ...paidCells, [rk]: rest };
      }
      return { ...p, [cat]: { ...c, paidCells, cells: { ...c.cells, [rk]: { ...(c.cells[rk] || {}), [col]: value } } } };
    }),
    toggleLoanPaid: (cat, rk, col) => up('loans', (p) => {
      const c = loanCat(p, cat);
      if (!(parseFloat(c.cells[rk]?.[col]) || 0)) return p;
      const paidCells = c.paidCells || {};
      return { ...p, [cat]: { ...c, paidCells: { ...paidCells, [rk]: { ...(paidCells[rk] || {}), [col]: !paidCells[rk]?.[col] } } } };
    }),
    addLoanColumn: (cat, name) => up('loans', (p) => {
      const c = loanCat(p, cat);
      if (c.columns.includes(name)) return p;
      return { ...p, [cat]: { ...c, columns: [...c.columns, name] } };
    }),
    deleteLoanColumn: (cat, name) => up('loans', (p) => {
      const c = loanCat(p, cat);
      const cells = {}, paidCells = {};
      Object.entries(c.cells || {}).forEach(([rk, row]) => { const r = { ...row }; delete r[name]; if (Object.keys(r).length) cells[rk] = r; });
      Object.entries(c.paidCells || {}).forEach(([rk, row]) => { const r = { ...row }; delete r[name]; paidCells[rk] = r; });
      return { ...p, [cat]: { ...c, columns: c.columns.filter((x) => x !== name), cells, paidCells } };
    }),

    addGoal: (form) => up('savings', (p) => [...p, buildGoal(form)]),
    editGoal: (id, form) => up('savings', (p) => p.map((g) => (g.id === id ? reviseGoal(g, form) : g))),
    deleteGoal: (id) => up('savings', (p) => p.filter((g) => g.id !== id)),
    toggleAutoCompute: (id) => up('savings', (p) => p.map((g) => (g.id === id ? { ...g, autoCompute: g.autoCompute === false } : g))),
    setGoalAmount: (id, key, value) => up('savings', (p) => p.map((g) => (g.id === id ? setGoalMonthAmount(g, key, value) : g))),
    toggleGoalPaid: (id, key) => up('savings', (p) => p.map((g) => (g.id === id ? { ...g, monthsList: g.monthsList.map((m) => (m.monthKey === key ? { ...m, paid: !m.paid } : m)) } : g))),
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  return <Ctx.Provider value={{ ...d, ...actions, loanCat: (cat) => loanCat(d.loans, cat), status, ready }}>{children}</Ctx.Provider>;
}
