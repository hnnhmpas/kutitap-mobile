import React, { useRef, useState } from 'react';
import { useFinance } from '../store';
import { MONTHS, num, peso, savingsTotals, goalSaved, parseMonthKey, droppedPaidMonths, validAmount } from '../finance';
import { Sprite, Bar, MoneyInput, PaidToggle, Sheet, Field, MonthYearSelect, IconButton, useToast } from '../components/ui';
import { IconPlus, IconPencil, IconTrash, IconDown } from '../icons';
import spPudding from '../assets/pixel/pudding.png';
import spBunny from '../assets/pixel/bunny.png';

const today = new Date();
const blank = () => ({ id: null, name: '', amount: '', sm: today.getMonth(), sy: today.getFullYear(), em: Math.min(11, today.getMonth() + 4), ey: today.getFullYear() });

export default function Savings({ ask }) {
  const d = useFinance();
  const toast = useToast();
  const [form, setForm] = useState(null); // null = closed; { id: null } = new goal
  const [err, setErr] = useState('');
  const [open, setOpen] = useState({});
  const busy = useRef(false); // a quick double tap on Create must not add the goal twice
  const sv = savingsTotals(d.savings);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const openEdit = (g) => {
    const a = parseMonthKey(g.monthsList[0]?.monthKey), b = parseMonthKey(g.monthsList[g.monthsList.length - 1]?.monthKey);
    setErr(''); setForm({ id: g.id, name: g.name, amount: String(g.goalAmount ?? ''), sm: a.mi, sy: a.y, em: b.mi, ey: b.y });
  };
  const save = () => {
    if (busy.current) return;
    if (!form.name.trim() || !validAmount(form.amount)) { setErr('Please enter a goal name and an amount above 0.'); return; }
    if (form.ey * 12 + form.em < form.sy * 12 + form.sm) { setErr('The end month must be the same as or after the start month.'); return; }
    if (form.id === null) {
      busy.current = true;
      if (d.addGoal(form)) toast('Savings Goal Added');
      setForm(null);
      setTimeout(() => { busy.current = false; }, 400);
      return;
    }
    const goal = d.savings.find((g) => g.id === form.id);
    const dropped = goal ? droppedPaidMonths(goal, form.sm, form.sy, form.em, form.ey) : 0;
    const apply = () => { if (d.editGoal(form.id, form)) toast('Savings Goal Updated'); setForm(null); };
    if (dropped > 0) ask(`${dropped} month(s) already marked Paid fall outside the new dates and will be removed from this goal. Continue?`, apply, 'Continue');
    else apply();
  };

  return (
    <div className="screen">
      <section className="panel">
        <div className="goal-head">
          <div>
            <h2 className="kutitap-title goal-name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Sprite src={spPudding} className="spr-title" />Honey Pot</h2>
            <p className="note" style={{ marginTop: 4 }}>Set goals and track your monthly savings.</p>
          </div>
        </div>
        <button type="button" className="btn btn-pink btn-block" onClick={() => { setErr(''); setForm(blank()); }}><IconPlus size={16} /> Add savings goal</button>
        <div className="grid2">
          <div className="tile"><div className="tile-label">Total goal</div><div className="tile-val">{peso(sv.target)}</div></div>
          <div className="tile mint"><div className="tile-label green">Total saved</div><div className="tile-val green">{peso(sv.saved)}</div><div className="tile-sub green">{sv.pct}%</div></div>
          <div className="tile"><div className="tile-label pink">Amount left</div><div className="tile-val pink">{peso(sv.left)}</div></div>
          <div className="tile"><div className="tile-label">Active goals</div><div className="tile-val">{sv.count}</div></div>
        </div>
      </section>

      {d.savings.length === 0 && <div className="panel empty"><Sprite src={spBunny} className="spr-empty" />No savings goals yet.<br />Tap “Add savings goal” above!</div>}

      {d.savings.map((g) => {
        const target = num(g.goalAmount), saved = goalSaved(g), left = Math.max(0, target - saved);
        const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
        const auto = g.autoCompute !== false;
        const scheduled = g.monthsList.reduce((s, m) => s + num(m.amount), 0);
        const diff = Math.round(scheduled - target);
        const isOpen = !!open[g.id];
        return (
          <section className="panel" key={g.id}>
            <div className="goal-head">
              <div style={{ minWidth: 0 }}>
                <h3 className="kutitap-title goal-name">{g.name}</h3>
                <div className="note">{g.monthsList[0]?.monthKey || 'N/A'} → {g.monthsList[g.monthsList.length - 1]?.monthKey || 'N/A'}</div>
              </div>
              <div className="goal-actions">
                <IconButton label={`Edit ${g.name}`} onClick={() => openEdit(g)}><IconPencil size={18} /></IconButton>
                <IconButton label={`Delete ${g.name}`} tone="danger" onClick={() => ask('Delete this savings goal?', () => { d.deleteGoal(g.id); toast('Savings Goal Deleted'); })}><IconTrash size={18} /></IconButton>
              </div>
            </div>
            <div className="grid3 goal-stats">
              <div className="tile"><div className="tile-label">Goal</div><div className="tile-val">{peso(target)}</div></div>
              <div className="tile mint"><div className="tile-label green">Saved</div><div className="tile-val green">{peso(saved)}</div></div>
              <div className="tile"><div className="tile-label pink">Left</div><div className="tile-val pink">{peso(left)}</div></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ textAlign: 'center', fontSize: 12 }}>Progress: <span className="green">{pct}%</span> completed</div>
              <Bar pct={pct} />
            </div>
            <button type="button" className={`toggle-line ${isOpen ? 'open' : ''}`} onClick={() => setOpen((o) => ({ ...o, [g.id]: !o[g.id] }))} aria-expanded={isOpen}>
              <span>{isOpen ? 'Hide' : 'Show'} monthly schedule ({g.monthsList.length})</span><IconDown size={14} />
            </button>
            {isOpen && (
              <div className="list">
                <div className="row-top">
                  <span className="note">Auto-compute re-spreads the rest of the goal when you change a month.</span>
                  <button type="button" className={`btn btn-sm ${auto ? 'btn-green' : 'btn-soft'}`} onClick={() => d.toggleAutoCompute(g.id)} aria-pressed={auto}>Auto {auto ? 'ON' : 'OFF'}</button>
                </div>
                {!auto && diff !== 0 && <div className="form-err">Schedule adds up to {peso(scheduled)} — {peso(Math.abs(diff))} {diff > 0 ? 'over' : 'short of'} the goal.</div>}
                {g.monthsList.map((m) => (
                  <div key={m.monthKey} className={`sched-row ${m.paid ? 'paid' : ''}`}>
                    <span className="row-name">{m.monthKey.replace('-', ' ')}</span>
                    <PaidToggle paid={!!m.paid} onToggle={() => d.toggleGoalPaid(g.id, m.monthKey)} />
                    <MoneyInput value={m.amount} onChange={(v) => d.setGoalAmount(g.id, m.monthKey, v)} label={`${g.name} ${m.monthKey}`} />
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      <Sheet open={!!form} title={form && form.id !== null ? 'Edit savings goal' : 'Add savings goal'} onClose={() => setForm(null)}
        footer={form && <button type="button" className="btn btn-pink btn-block" onClick={save}>{form.id !== null ? 'Save changes' : 'Create goal'}</button>}>
        {form && (
          <>
            <Field label="Goal name"><input className="text-input" type="text" enterKeyHint="next" autoCapitalize="sentences" autoComplete="off" placeholder="e.g. New laptop" value={form.name} onChange={(e) => { set({ name: e.target.value }); setErr(''); }} /></Field>
            <Field label="Goal amount"><MoneyInput value={form.amount} onChange={(v) => { set({ amount: v }); setErr(''); }} label="Goal amount" placeholder="e.g. 45000" /></Field>
            <MonthYearSelect label="Start" month={form.sm} year={form.sy} onMonth={(v) => set({ sm: v })} onYear={(v) => set({ sy: v })} />
            <MonthYearSelect label="End" month={form.em} year={form.ey} onMonth={(v) => set({ em: v })} onYear={(v) => set({ ey: v })} />
            {form.id !== null && <div className="note">Changing the amount or dates re-spreads the goal over the months not yet marked Paid. Paid months keep their amounts.</div>}
            {err && <div className="form-err" role="alert">{err}</div>}
          </>
        )}
      </Sheet>
    </div>
  );
}
