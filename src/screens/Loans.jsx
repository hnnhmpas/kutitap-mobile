import React, { useState } from 'react';
import { useFinance } from '../store';
import { LOAN_CATEGORIES, loanLabel } from '../config';
import { MONTHS, stepMonth, rowKey, rowAmounts, cutoffSummary, yearLoanTotals, cutoffDay, peso, num } from '../finance';
import { MonthStepper, MonthSheet, MoneyInput, Sheet, IconButton, useToast } from '../components/ui';
import { IconCheck, IconPlus, IconTrash, IconDown } from '../icons';

export default function Loans({ period, setPeriod, ask }) {
  const d = useFinance();
  const toast = useToast();
  const [cat, setCat] = useState(LOAN_CATEGORIES[0]);
  const [pick, setPick] = useState(false);
  const [items, setItems] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [yearOpen, setYearOpen] = useState(false);

  const month = MONTHS[period.mi];
  const catData = d.loanCat(cat);
  const c15 = cutoffSummary(d.loans, month, period.y, '15th');
  const c30 = cutoffSummary(d.loans, month, period.y, '30th');
  const yr = yearLoanTotals(d.loans, period.y);
  const last = cutoffDay(month, period.y);
  const cutoffs = [{ id: '15th', label: `${month.slice(0, 3)} 15` }, { id: '30th', label: `${month.slice(0, 3)} ${last}` }];

  const addItem = () => {
    const n = newItem.trim();
    if (!n) return;
    if (catData.columns.includes(n)) { toast('That item already exists', 'warn'); return; }
    d.addLoanColumn(cat, n); setNewItem('');
    toast('Item Added');
  };

  const Summary = ({ label, s }) => (
    <div className="tile">
      <div className="tile-label">{label}</div>
      <div className="tile-val">{peso(s.total)}</div>
      <div className={`tile-sub ${s.paid ? 'green' : 'pink'}`}>{s.has ? (s.paid ? 'Paid' : 'Pending') : 'Nothing due'}</div>
    </div>
  );

  let gTotal = 0, gPaid = 0, gUnpaid = 0;
  const yearRows = MONTHS.map((m) => {
    const a = rowAmounts(catData, rowKey(period.y, m, '15th'));
    const b = rowAmounts(catData, rowKey(period.y, m, '30th'));
    [a, b].forEach((r) => { gTotal += r.total; gPaid += r.paid; gUnpaid += r.unpaid; });
    return { m, a, b };
  });
  const cell = (r) => (r.total > 0 ? (r.allPaid ? <span className="green">✓ {peso(r.total)}</span> : peso(r.unpaid)) : '–');

  return (
    <div className="screen">
      <section className="panel">
        <MonthStepper value={period} onStep={(n) => setPeriod(stepMonth(period, n))} onOpen={() => setPick(true)} />
        <div className="grid2">
          <Summary label={`${month.slice(0, 3)} 15th cutoff`} s={c15} />
          <Summary label={`${month.slice(0, 3)} ${last}th cutoff`} s={c30} />
        </div>
        <div className="tile butter">
          <div className="tile-label">Total {month} loans · still to pay</div>
          <div className="tile-val">{peso(c15.total + c30.total)}</div>
        </div>
        <div className="grid3 goal-stats">
          <div className="tile"><div className="tile-label">{period.y} total</div><div className="tile-val">{peso(yr.cost)}</div></div>
          <div className="tile mint"><div className="tile-label green">Paid</div><div className="tile-val green">{peso(yr.paid)}</div></div>
          <div className="tile"><div className="tile-label pink">Unpaid</div><div className="tile-val pink">{peso(yr.unpaid)}</div></div>
        </div>
      </section>

      <div className="chips" role="tablist" aria-label="Loan categories">
        {LOAN_CATEGORIES.map((c) => (
          <button key={c} type="button" role="tab" aria-selected={cat === c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{loanLabel(c)}</button>
        ))}
      </div>

      <section className="panel">
        <div className="panel-title kutitap-title">
          <span>{loanLabel(cat)}</span>
          <button type="button" className="btn btn-soft btn-sm" onClick={() => setItems(true)}><IconPlus size={14} /> Items</button>
        </div>
        <div className="note">Type an amount, then tap the box next to it to mark it paid.</div>

        {catData.columns.length === 0 && <div className="empty">No items yet. Tap “Items” to add one.</div>}
        {catData.columns.length > 0 && cutoffs.map((co) => {
          const rk = rowKey(period.y, month, co.id);
          const r = rowAmounts(catData, rk);
          return (
            <div key={co.id} className="row">
              <div className="cutoff-head">
                <span className="kutitap-title">{co.label}</span>
                <span className="row-amt">{r.total > 0 ? peso(r.unpaid) : '–'}{r.paid > 0 && <small className="muted"> of {peso(r.total)}</small>}</span>
              </div>
              {catData.columns.map((col) => {
                const val = catData.cells?.[rk]?.[col] ?? '';
                const has = num(val) !== 0;
                const paid = has && !!catData.paidCells?.[rk]?.[col];
                return (
                  <div className="row-line" key={col}>
                    <span style={{ width: 92, fontSize: 13 }} className="row-name">{col}</span>
                    <MoneyInput className={paid ? 'is-paid' : has ? 'has' : ''} value={val} onChange={(v) => d.setLoanCell(cat, rk, col, v)} label={`${col} ${co.label}`} />
                    <button type="button" className={`check-btn ${paid ? 'on' : ''}`} disabled={!has} onClick={() => d.toggleLoanPaid(cat, rk, col)} aria-pressed={paid} aria-label={`${col} ${paid ? 'paid' : 'unpaid'}`} data-fx={paid ? 'unpaid' : 'paid'}>
                      <IconCheck size={20} />
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </section>

      <section className="panel">
        <button type="button" className={`toggle-line ${yearOpen ? 'open' : ''}`} onClick={() => setYearOpen((v) => !v)} aria-expanded={yearOpen}>
          <span className="kutitap-title" style={{ fontSize: 16 }}>{loanLabel(cat)} · {period.y} overview</span><IconDown size={14} />
        </button>
        {yearOpen && (
          <div className="list">
            <div className="year-row head"><span>Month</span><span>15th</span><span>{'30th'}</span></div>
            {yearRows.map(({ m, a, b }, i) => (
              <button key={m} type="button" className={`year-row ${i === period.mi ? 'now' : ''}`} onClick={() => { setPeriod({ mi: i, y: period.y }); window.scrollTo(0, 0); }}>
                <span>{m.slice(0, 3)}</span><span>{cell(a)}</span><span>{cell(b)}</span>
              </button>
            ))}
            <div className="year-row total"><span>Total</span><span style={{ gridColumn: 'span 2' }}>{peso(gUnpaid)}{gPaid > 0 && <small className="muted"> of {peso(gTotal)}</small>}</span></div>
          </div>
        )}
      </section>

      <MonthSheet open={pick} value={period} onPick={setPeriod} onClose={() => setPick(false)} />
      <Sheet open={items} title={`${loanLabel(cat)} items`} onClose={() => setItems(false)}
        footer={(
          <div className="add-line">
            <input className="text-input" type="text" placeholder="New item, e.g. Gadget" value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItem()} />
            <button type="button" className="btn btn-pink" onClick={addItem}>Add</button>
          </div>
        )}>
        <div className="list">
          {catData.columns.map((col) => (
            <div className="item-row" key={col}>
              <span className="row-name">{col}</span>
              <IconButton label={`Delete ${col}`} tone="danger" onClick={() => ask(`Delete item "${col}" and its amounts?`, () => { d.deleteLoanColumn(cat, col); toast('Item Deleted'); })}><IconTrash size={18} /></IconButton>
            </div>
          ))}
          {catData.columns.length === 0 && <div className="note">No items yet. Add one below.</div>}
        </div>
      </Sheet>
    </div>
  );
}
