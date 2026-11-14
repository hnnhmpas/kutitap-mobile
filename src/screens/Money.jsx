import React, { useState } from 'react';
import { useFinance } from '../store';
import { MONTHS, monthKey, stepMonth, num, peso, cutoffSummary, cutoffDay } from '../finance';
import { Sprite, MonthStepper, MonthSheet, MoneyInput, PaidToggle, IconButton, Sheet, Field, useToast } from '../components/ui';
import { IconPlus, IconTrash, IconRight } from '../icons';
import spBunny from '../assets/pixel/bunny.png';

export default function Money({ period, setPeriod, ask, go }) {
  const d = useFinance();
  const toast = useToast();
  const [pick, setPick] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [newAmt, setNewAmt] = useState('');
  const [err, setErr] = useState('');

  const mk = monthKey(period.mi, period.y);
  const month = MONTHS[period.mi];
  const income = d.incomes[mk]?.actual ?? '';
  const expenses = d.expenses[mk] || [];

  // loans: only what is still to pay on each cutoff (auto-synced from the Loans tab)
  const c15 = cutoffSummary(d.loans, month, period.y, '15th');
  const c30 = cutoffSummary(d.loans, month, period.y, '30th');
  const last = cutoffDay(month, period.y);
  const loansDue = c15.total + c30.total;
  const loansHas = c15.has || c30.has;

  // savings: this month's amount of every goal (auto-synced from the Savings tab)
  const savingsItems = d.savings.map((g) => ({ g, m: g.monthsList.find((m) => m.monthKey === mk) })).filter((x) => x.m);
  const savingsTotal = savingsItems.reduce((s, x) => s + num(x.m.amount), 0);
  const savingsPaid = savingsItems.filter((x) => x.m.paid).length;

  const exTotal = expenses.reduce((s, e) => s + num(e.amount), 0);
  const exPaid = expenses.filter((e) => e.paid).length;
  const exPct = expenses.length ? Math.round((exPaid / expenses.length) * 100) : 0;

  const due = exTotal + loansDue + savingsTotal;
  const remaining = num(income) - due;

  const openAdd = () => { setNewCat(''); setNewAmt(''); setErr(''); setAdding(true); };
  const saveExpense = () => {
    if (!(num(newAmt) > 0)) { setErr('Please enter an amount.'); return; }
    d.addExpense(mk, newCat || 'Expense', newAmt);
    setAdding(false);
    toast('Expense Added');
  };

  return (
    <div className="screen">
      <section className="panel butter">
        <MonthStepper value={period} onStep={(n) => setPeriod(stepMonth(period, n))} onOpen={() => setPick(true)} />
        <Field label="Income this month">
          <MoneyInput big value={income} onChange={(v) => d.setIncome(mk, v)} label={`Income for ${month} ${period.y}`} placeholder="Enter your income" />
        </Field>
        <div className="grid2">
          <div className="tile"><div className="tile-label">Monthly due</div><div className="tile-val pink">{peso(due)}</div><div className="tile-sub">Expenses + loans + savings</div></div>
          <div className="tile"><div className="tile-label">Remaining</div><div className={`tile-val ${remaining >= 0 ? 'green' : 'pink'}`}>{peso(remaining)}</div><div className="tile-sub">Income minus due</div></div>
        </div>
      </section>

      <button type="button" className="btn btn-pink btn-block" onClick={openAdd}><IconPlus size={16} /> Add expense</button>

      <div className="sec-label">Expenses <span className="tag">{expenses.length ? `${exPaid}/${expenses.length} paid` : 'none yet'}</span></div>
      {expenses.length === 0 ? (
        <div className="panel empty"><Sprite src={spBunny} className="spr-empty" />No expenses added yet.<br />Tap “Add expense” to log one!</div>
      ) : (
        <div className="list">
          {expenses.map((e) => (
            <div key={e.id} className={`row ${e.paid ? 'paid' : ''}`}>
              <div className="row-line">
                <input className="text-input" style={{ flex: 1, minWidth: 0 }} type="text" placeholder="Category" aria-label="Expense category" value={e.category} onChange={(ev) => d.changeExpense(mk, e.id, 'category', ev.target.value)} />
                <IconButton label="Delete expense" tone="danger" onClick={() => ask('Delete this expense?', () => { d.deleteExpense(mk, e.id); toast('Expense Deleted'); })}><IconTrash size={18} /></IconButton>
              </div>
              <div className="row-line">
                <MoneyInput value={e.amount} onChange={(v) => d.changeExpense(mk, e.id, 'amount', v)} label="Expense amount" />
                <PaidToggle paid={!!e.paid} onToggle={() => d.toggleExpensePaid(mk, e.id)} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="sec-label">Loan cutoffs <span className="tag">Auto-synced</span></div>
      {loansHas ? (
        <button type="button" className="row row-link" onClick={() => go('loans')}>
          <div className="row-top"><span className="row-name">{month.slice(0, 3)} 15th cutoff</span><span className="row-amt">{c15.has ? peso(c15.total) : '–'}</span></div>
          <div className="row-top"><span className="row-name">{month.slice(0, 3)} {last}th cutoff</span><span className="row-amt">{c30.has ? peso(c30.total) : '–'}</span></div>
          <div className="row-top"><span className="note">Still to pay · tap to open Loans</span><IconRight size={16} /></div>
        </button>
      ) : <div className="note">No loans due this month</div>}

      <div className="sec-label">Savings total <span className="tag">Auto-synced</span></div>
      {savingsItems.length === 0 ? <div className="note">No savings goals due this month</div> : (
        <button type="button" className="row row-link" onClick={() => go('savings')}>
          <div className="row-top"><span className="row-name">Savings ({month})</span><span className="row-amt">{peso(savingsTotal)}</span></div>
          <div className="row-top"><span className="note">{savingsPaid}/{savingsItems.length} goal{savingsItems.length === 1 ? '' : 's'} paid · tap to open Savings</span><IconRight size={16} /></div>
        </button>
      )}

      <div className="total-bar"><span>EXPENSES</span><span>{peso(exTotal)}</span><span className="pct">{exPct}%</span></div>

      <MonthSheet open={pick} value={period} onPick={setPeriod} onClose={() => setPick(false)} />
      <Sheet open={adding} title="Add expense" onClose={() => setAdding(false)}
        footer={<button type="button" className="btn btn-pink btn-block" onClick={saveExpense}>Save expense</button>}>
        <Field label="Category"><input className="text-input" type="text" autoFocus placeholder="e.g. Groceries" value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveExpense()} /></Field>
        <Field label="Amount"><MoneyInput value={newAmt} onChange={(v) => { setNewAmt(v); setErr(''); }} label="Amount" placeholder="0" /></Field>
        {err && <div className="form-err" role="alert">{err}</div>}
      </Sheet>
    </div>
  );
}
