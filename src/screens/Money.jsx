import React, { useRef, useState } from 'react';
import { useFinance } from '../store';
import { MONTHS, monthKey, stepMonth, num, peso, cutoffSummary, cutoffDay, validAmount, incomeOf, expCutoff } from '../finance';
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
  const [newCo, setNewCo] = useState('15th');
  const [err, setErr] = useState('');
  const busy = useRef(false); // a quick double tap on Save must not add the same expense twice

  const mk = monthKey(period.mi, period.y);
  const month = MONTHS[period.mi];
  const income = incomeOf(d.incomes[mk]); // { c15, c30 }
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

  // each payday pays for its own expenses and loan cutoff; savings is a monthly amount, so it comes off the month's remaining
  const exOf = (co) => expenses.filter((e) => expCutoff(e) === co);
  const sumOf = (list) => list.reduce((s, e) => s + num(e.amount), 0);
  const ex15 = sumOf(exOf('15th')), ex30 = sumOf(exOf('30th'));
  const left15 = num(income.c15) - ex15 - c15.total;
  const left30 = num(income.c30) - ex30 - c30.total;
  const due = exTotal + loansDue + savingsTotal;
  const remaining = left15 + left30 - savingsTotal;
  const groups = [{ id: '15th', label: `${month.slice(0, 3)} 15`, list: exOf('15th'), sum: ex15 }, { id: '30th', label: `${month.slice(0, 3)} ${last}`, list: exOf('30th'), sum: ex30 }];

  const openAdd = () => { setNewCat(''); setNewAmt(''); setNewCo('15th'); setErr(''); setAdding(true); };
  const saveExpense = () => {
    if (busy.current) return;
    if (!validAmount(newAmt)) { setErr('Please enter an amount above 0.'); return; }
    busy.current = true;
    if (d.addExpense(mk, newCat || 'Expense', newAmt, newCo)) toast('Expense Added');
    setAdding(false);
    setTimeout(() => { busy.current = false; }, 400);
  };

  return (
    <div className="screen">
      <section className="panel butter">
        <MonthStepper value={period} onStep={(n) => setPeriod(stepMonth(period, n))} onOpen={() => setPick(true)} />
        <div className="grid2">
          <Field label={`Income · ${month.slice(0, 3)} 15`}><MoneyInput value={income.c15} onChange={(v) => d.setIncome(mk, '15th', v)} label={`Income on the 15th of ${month} ${period.y}`} placeholder="15th pay" /></Field>
          <Field label={`Income · ${month.slice(0, 3)} ${last}`}><MoneyInput value={income.c30} onChange={(v) => d.setIncome(mk, '30th', v)} label={`Income on the ${last}th of ${month} ${period.y}`} placeholder="30th pay" /></Field>
        </div>
        <div className="grid2">
          <div className="tile"><div className="tile-label">Monthly due</div><div className="tile-val pink">{peso(due)}</div><div className="tile-sub">Expenses + loans + savings</div></div>
          <div className="tile"><div className="tile-label">Remaining</div><div className={`tile-val ${remaining >= 0 ? 'green' : 'pink'}`}>{peso(remaining)}</div><div className="tile-sub">Income minus due</div></div>
        </div>
        <div className="grid2">
          <div className="tile"><div className="tile-label">{month.slice(0, 3)} 15 left</div><div className={`tile-val ${left15 >= 0 ? 'green' : 'pink'}`}>{peso(left15)}</div><div className="tile-sub">After expenses + loans</div></div>
          <div className="tile"><div className="tile-label">{month.slice(0, 3)} {last} left</div><div className={`tile-val ${left30 >= 0 ? 'green' : 'pink'}`}>{peso(left30)}</div><div className="tile-sub">After expenses + loans</div></div>
        </div>
      </section>

      <button type="button" className="btn btn-pink btn-block" onClick={openAdd}><IconPlus size={16} /> Add expense</button>

      <div className="sec-label">Expenses <span className="tag">{expenses.length ? `${exPaid}/${expenses.length} paid` : 'none yet'}</span></div>
      {expenses.length === 0 ? (
        <div className="panel empty"><Sprite src={spBunny} className="spr-empty" />No expenses added yet.<br />Tap “Add expense” to log one!</div>
      ) : (
        groups.map((g) => (
          <div key={g.id} className="ex-group">
            <div className="group-head"><span>{g.label} expenses</span><span>{peso(g.sum)}</span></div>
            {g.list.length === 0 ? <div className="note">Nothing for the {g.id} yet</div> : (
              <div className="list">
                {g.list.map((e) => (
                  <div key={e.id} className={`row ${e.paid ? 'paid' : ''}`}>
                    <div className="row-line">
                      <input className="text-input" style={{ flex: 1, minWidth: 0 }} type="text" placeholder="Category" aria-label="Expense category" value={e.category} onChange={(ev) => d.changeExpense(mk, e.id, 'category', ev.target.value)} />
                      <IconButton label="Delete expense" tone="danger" onClick={() => ask('Delete this expense?', () => { d.deleteExpense(mk, e.id); toast('Expense Deleted'); })}><IconTrash size={18} /></IconButton>
                    </div>
                    <div className="row-line">
                      <MoneyInput value={e.amount} onChange={(v) => d.changeExpense(mk, e.id, 'amount', v)} label="Expense amount" />
                      <PaidToggle paid={!!e.paid} onToggle={() => d.toggleExpensePaid(mk, e.id)} />
                    </div>
                    <div className="segment sm" role="group" aria-label="Paid on">
                      {groups.map((o) => <button key={o.id} type="button" className={`seg ${expCutoff(e) === o.id ? 'on' : ''}`} aria-pressed={expCutoff(e) === o.id} onClick={() => d.changeExpense(mk, e.id, 'cutoff', o.id)}>{o.label}</button>)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
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
        <Field label="Paid from">
          <div className="segment" role="group" aria-label="Paid from">
            {groups.map((o) => <button key={o.id} type="button" className={`seg ${newCo === o.id ? 'on' : ''}`} aria-pressed={newCo === o.id} onClick={() => setNewCo(o.id)}>{o.label}<small>{o.id === '15th' ? 'mid-month pay' : 'end-month pay'}</small></button>)}
          </div>
        </Field>
        {err && <div className="form-err" role="alert">{err}</div>}
      </Sheet>
    </div>
  );
}
