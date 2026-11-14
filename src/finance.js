// Pure money helpers (no React). Data shapes are the same as the original tracker.
import { LOAN_CATEGORIES } from './config';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthKey = (mi, y) => `${MONTHS[mi]}-${y}`;
export const num = (v) => parseFloat(v) || 0;
const fmt = (n) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });
export const peso = (n) => (n < 0 ? `-₱${fmt(Math.abs(n))}` : `₱${fmt(n)}`);
export const shown = (v) => (v === 0 || v === '0' || v == null ? '' : v); // blank instead of 0 in inputs

export const stepMonth = ({ mi, y }, d) => {
  const t = y * 12 + mi + d;
  return { mi: ((t % 12) + 12) % 12, y: Math.floor(t / 12) };
};
export const parseMonthKey = (key) => {
  const [m, y] = (key || '').split('-');
  return { mi: Math.max(0, MONTHS.indexOf(m)), y: parseInt(y) || new Date().getFullYear() };
};
export const cutoffDay = (month, year) => {
  if (month !== 'February') return '30';
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return leap ? '29' : '28';
};

// ---- loans ----
export const rowKey = (year, month, cutoff) => `${year}-${month}-${cutoff}`;
// total / paid / unpaid of one cutoff row of one category (amounts of deleted columns are ignored)
export const rowAmounts = (cat, key) => {
  let total = 0, paid = 0, unpaid = 0;
  Object.entries(cat?.cells?.[key] || {}).forEach(([col, v]) => {
    if (cat?.columns && !cat.columns.includes(col)) return;
    const n = num(v);
    if (n === 0) return;
    total += n;
    if (cat?.paidCells?.[key]?.[col]) paid += n; else unpaid += n;
  });
  return { total, paid, unpaid, allPaid: unpaid === 0 };
};
// all categories of one cutoff: only what is still payable is counted
export const cutoffSummary = (loans, month, year, cutoff) => {
  let total = 0, allPaid = true, has = false;
  LOAN_CATEGORIES.forEach((c) => {
    if (!loans[c]) return;
    const r = rowAmounts(loans[c], rowKey(year, month, cutoff));
    if (r.total > 0) { has = true; total += r.unpaid; if (!r.allPaid) allPaid = false; }
  });
  return { total, paid: has ? allPaid : false, has };
};
export const yearLoanTotals = (loans, year) => {
  let cost = 0, paid = 0, unpaid = 0;
  MONTHS.forEach((m) => ['15th', '30th'].forEach((c) => LOAN_CATEGORIES.forEach((cat) => {
    if (!loans[cat]) return;
    const r = rowAmounts(loans[cat], rowKey(year, m, c));
    if (r.total > 0) { cost += r.total; paid += r.paid; unpaid += r.unpaid; }
  })));
  return { cost, paid, unpaid };
};

// ---- income / dues ----
export const annualIncome = (incomes, year) => MONTHS.reduce((s, m) => s + num(incomes[`${m}-${year}`]?.actual), 0);
export const annualDues = (d, year) => {
  let sum = 0;
  MONTHS.forEach((m) => {
    const k = `${m}-${year}`;
    (d.expenses[k] || []).forEach((e) => { sum += num(e.amount); });
    ['15th', '30th'].forEach((c) => LOAN_CATEGORIES.forEach((cat) => {
      if (d.loans[cat]) sum += rowAmounts(d.loans[cat], rowKey(year, m, c)).total;
    }));
  });
  return sum;
};

// ---- savings ----
export const goalSaved = (g) => g.monthsList.reduce((s, m) => s + (m.paid ? num(m.amount) : 0), 0);
export const savingsTotals = (goals) => {
  const target = goals.reduce((s, g) => s + num(g.goalAmount), 0);
  const saved = goals.reduce((s, g) => s + goalSaved(g), 0);
  return { target, saved, left: Math.max(0, target - saved), count: goals.length, pct: target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0 };
};
export const monthRange = (sm, sy, em, ey) => {
  const n = ey * 12 + em >= sy * 12 + sm ? ey * 12 + em - (sy * 12 + sm) + 1 : 1;
  return Array.from({ length: n }, (_, i) => monthKey(...(({ mi, y }) => [mi, y])(stepMonth({ mi: sm, y: sy }, i))));
};
export const buildGoal = ({ name, amount, sm, sy, em, ey }) => {
  const total = num(amount);
  const keys = monthRange(sm, sy, em, ey);
  const each = Math.round(total / keys.length);
  return {
    id: Date.now(), name: name.trim(), goalAmount: total,
    startMonth: MONTHS[sm], startYear: sy, endMonth: MONTHS[em], endYear: ey,
    monthsList: keys.map((k, i) => ({ monthKey: k, amount: i === keys.length - 1 ? total - each * (keys.length - 1) : each, paid: false }))
  };
};
// Edit a goal. Paid months keep their amount; the rest is spread over the unpaid months.
export const reviseGoal = (goal, { name, amount, sm, sy, em, ey }) => {
  const total = num(amount);
  const keys = monthRange(sm, sy, em, ey);
  const old = goal.monthsList.map((m) => m.monthKey);
  if (total === goal.goalAmount && keys.length === old.length && keys.every((k, i) => k === old[i])) return { ...goal, name: name.trim() };
  const paidBy = {};
  goal.monthsList.forEach((m) => { if (m.paid) paidBy[m.monthKey] = m; });
  const keptPaid = keys.reduce((s, k) => s + (paidBy[k] ? num(paidBy[k].amount) : 0), 0);
  const unpaidKeys = keys.filter((k) => !paidBy[k]);
  const remaining = Math.max(0, total - keptPaid);
  const each = unpaidKeys.length ? Math.round(remaining / unpaidKeys.length) : 0;
  let seen = 0;
  return {
    ...goal, name: name.trim(), goalAmount: total, startMonth: MONTHS[sm], startYear: sy, endMonth: MONTHS[em], endYear: ey,
    monthsList: keys.map((k) => {
      if (paidBy[k]) return { ...paidBy[k] };
      seen++;
      return { monthKey: k, amount: Math.max(0, seen === unpaidKeys.length ? remaining - each * (unpaidKeys.length - 1) : each), paid: false };
    })
  };
};
export const droppedPaidMonths = (goal, sm, sy, em, ey) => {
  const keys = monthRange(sm, sy, em, ey);
  return goal.monthsList.filter((m) => m.paid && !keys.includes(m.monthKey)).length;
};
// Change one month: with auto-compute on, the rest of the goal is re-spread over the other UNPAID months (paid months stay).
export const setGoalMonthAmount = (goal, key, value) => {
  const n = value === '' ? 0 : num(value);
  const shownVal = value === '' ? '' : n;
  const set = (fn) => ({ ...goal, monthsList: goal.monthsList.map(fn) });
  const free = goal.monthsList.filter((m) => m.monthKey !== key && !m.paid);
  if (goal.autoCompute === false || free.length === 0) return set((m) => (m.monthKey === key ? { ...m, amount: shownVal } : m));
  const fixed = goal.monthsList.reduce((s, m) => s + (m.monthKey !== key && m.paid ? num(m.amount) : 0), 0);
  const target = Math.max(0, num(goal.goalAmount) - n - fixed);
  const each = Math.round(target / free.length);
  let acc = 0, seen = 0;
  return set((m) => {
    if (m.monthKey === key) return { ...m, amount: shownVal };
    if (m.paid) return m;
    seen++;
    const a = seen === free.length ? target - acc : each;
    acc += a;
    return { ...m, amount: Math.max(0, a) };
  });
};
