import React, { useState } from 'react';
import { useFinance } from '../store';
import { MONTHS, monthKey, stepMonth, num, peso, cutoffSummary } from '../finance';
import { Sprite, MonthStepper, MonthSheet, MoneyInput, PaidToggle, IconButton, Sheet, Field } from '../components/ui';
import { IconPlus, IconTrash } from '../icons';
import spBunny from '../assets/pixel/bunny.png';

export default function Money({ period, setPeriod, ask, go }) {
  const d = useFinance();
  const [seg, setSeg] = useState('obligations');
  const [pick, setPick] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [newAmt, setNewAmt] = useState('');

  const mk = monthKey(period.mi, period.y);
  const month = MONTHS[period.mi];
  const income = d.incomes[mk]?.actual ?? '';
  const utilities = Object.entries(d.utilitiesOf(d.utilities, mk));
  const expenses = d.expenses[mk] || [];

  const c15 = cutoffSummary(d.loans, month, period.y, '15th');
  const c30 = cutoffSummary(d.loans, month, period.y, '30th');
  const loansDue = c15.total + c30.total;
  const loansHas = c15.has || c30.has;

  const savingsItems = d.savings.map((g) => ({ g, m: g.monthsList.find((m) => m.monthKey === mk) })).filter((x) => x.m);
  const savingsTotal = savingsItems.reduce((s, x) => s + num(x.m.amount), 0);

  // loans have no Paid button, so they are not part of the paid percentage
  const obItems = [...utilities.map(([, u]) => u), ...savingsItems.map((x) => x.m)];
  const obTotal = utilities.reduce((s, [, u]) => s + num(u.amount), 0) + loansDue + savingsTotal;
  const obPct = obItems.length ? Math.round((obItems.filter((i) => i.paid).length / obItems.length) * 100) : 0;

  const exTotal = expenses.reduce((s, e) => s + num(e.amount), 0);
  const exPct = expenses.length ? Math.round((expenses.filter((e) => e.paid).length / expenses.length) * 100) : 0;

  const due = obTotal + exTotal;
  const remaining = num(income) - due;
  const obPaid = obItems.filter((i) => i.paid).length;
  const exPaid = expenses.filter((e) => e.paid).length;

  const saveExpense = () => {
    if (!newCat.trim() && !newAmt) return;
    d.addExpense(mk, newCat || 'Expense', newAmt);
    setNewCat(''); setNewAmt(''); setAdding(false);
  };

  return (
    <div className="screen">
      <section className="panel butter">
        <MonthStepper value={period} onStep={(n) => setPeriod(stepMonth(period, n))} onOpen={() => setPick(true)} />
        <Field label="Income this month">
          <MoneyInput big value={income} onChange={(v) => d.setIncome(mk, v)} label={`Income for ${month} ${period.y}`} placeholder="Enter your income" />
        </Field>
        <div className="grid2">
          <div className="tile"><div className="tile-label">Monthly due</div><div className="tile-val pink">{peso(due)}</div><div className="tile-sub">Obligations + expenses</div></div>
          <div className="tile"><div className="tile-label">Remaining</div><div className={`tile-val ${remaining >= 0 ? 'green' : 'pink'}`}>{peso(remaining)}</div><div className="tile-sub">Income minus due</div></div>
        </div>
      </section>

      <div className="segment" role="tablist">
        <button type="button" role="tab" aria-selected={seg === 'obligations'} className={`seg ${seg === 'obligations' ? 'on' : ''}`} onClick={() => setSeg('obligations')}>Obligations<small>{obPaid}/{obItems.length} paid</small></button>
        <button type="button" role="tab" aria-selected={seg === 'expenses'} className={`seg ${seg === 'expenses' ? 'on' : ''}`} onClick={() => setSeg('expenses')}>Expenses<small>{expenses.length ? `${exPaid}/${expenses.length} paid` : 'none yet'}</small></button>
      </div>

      {seg === 'obligations' ? (
        <>
          <div className="list">
            <div className="sec-label">Utility bills</div>
            {utilities.map(([name, u]) => (
              <div key={name} className={`row ${u.paid ? 'paid' : ''}`}>
                <div className="row-name">{name}</div>
                <div className="row-line">
                  <MoneyInput value={u.amount} onChange={(v) => d.setUtilityAmount(mk, name, v)} label={`${name} amount`} />
                  <PaidToggle paid={!!u.paid} onToggle={() => d.toggleUtilityPaid(mk, name)} />
                </div>
              </div>
            ))}

            <div className="sec-label">Loans cutoffs <span className="tag">Auto-synced</span></div>
            {loansHas ? (
              <button type="button" className="row" onClick={() => go('loans')} style={{ textAlign: 'left' }}>
                <div className="row-top"><span className="row-name">Loans ({month})</span><span className="row-amt">{peso(loansDue)}</span></div>
                <div className="note">Still to pay · tap to open Loans</div>
              </button>
            ) : <div className="note">No loans due this month</div>}

            <div className="sec-label">Savings <span className="tag">Auto-synced</span></div>
            {savingsItems.length === 0 ? <div className="note">No savings goals due this month</div> : savingsItems.map(({ g, m }) => (
              <div key={g.id} className={`row ${m.paid ? 'paid' : ''}`}>
                <div className="row-top"><span className="row-name">{g.name}</span><span className="row-amt">{peso(num(m.amount))}</span></div>
                <PaidToggle paid={!!m.paid} onToggle={() => d.toggleGoalPaid(g.id, mk)} />
              </div>
            ))}
          </div>
          <div className="total-bar"><span>TOTAL</span><span>{peso(obTotal)}</span><span className="pct">{obPct}%</span></div>
        </>
      ) : (
        <>
          <button type="button" className="btn btn-pink btn-block" onClick={() => setAdding(true)}><IconPlus size={14} /> Add expense</button>
          {expenses.length === 0 ? (
            <div className="panel empty"><Sprite src={spBunny} className="spr-empty" />No expenses added yet.<br />Tap “Add expense” to log one!</div>
          ) : (
            <div className="list">
              {expenses.map((e) => (
                <div key={e.id} className={`row ${e.paid ? 'paid' : ''}`}>
                  <div className="row-line">
                    <input className="text-input" style={{ flex: 1, minWidth: 0 }} type="text" placeholder="Category" aria-label="Expense category" value={e.category} onChange={(ev) => d.changeExpense(mk, e.id, 'category', ev.target.value)} />
                    <IconButton label="Delete expense" tone="danger" onClick={() => ask('Delete this expense?', () => d.deleteExpense(mk, e.id))}><IconTrash size={16} /></IconButton>
                  </div>
                  <div className="row-line">
                    <MoneyInput value={e.amount} onChange={(v) => d.changeExpense(mk, e.id, 'amount', v)} label="Expense amount" />
                    <PaidToggle paid={!!e.paid} onToggle={() => d.toggleExpensePaid(mk, e.id)} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="total-bar"><span>TOTAL</span><span>{peso(exTotal)}</span><span className="pct">{exPct}%</span></div>
        </>
      )}

      <MonthSheet open={pick} value={period} onPick={setPeriod} onClose={() => setPick(false)} />
      <Sheet open={adding} title="Add expense" onClose={() => setAdding(false)}>
        <Field label="Category"><input className="text-input" type="text" autoFocus placeholder="e.g. Groceries" value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveExpense()} /></Field>
        <Field label="Amount"><MoneyInput value={newAmt} onChange={setNewAmt} label="Amount" placeholder="0" /></Field>
        <button type="button" className="btn btn-pink btn-block" onClick={saveExpense}>Save expense</button>
      </Sheet>
    </div>
  );
}
