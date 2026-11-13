import React, { useEffect, useRef, useState } from 'react';
import { IconLeft, IconRight, IconDown, IconX, IconCheck, IconTrash } from '../icons';
import { MONTHS, shown } from '../finance';
import { YEARS } from '../config';

export const Sprite = ({ src, className = '' }) => <img src={src} alt="" draggable={false} className={`px-sprite ${className}`} />;

// 12-segment pixel meter
export function Meter({ pct, tone = 'pink', segments = 12 }) {
  const safe = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  const on = Math.round((safe / 100) * segments);
  return (
    <div className={`px-meter px-meter-${tone}`} role="progressbar" aria-valuenow={safe} aria-valuemin={0} aria-valuemax={100}>
      {Array.from({ length: segments }).map((_, i) => <span key={i} className={i < on ? 'on' : ''} style={{ '--i': i }} />)}
    </div>
  );
}

export function Bar({ pct }) {
  return <div className="px-bar"><div className="px-bar-fill" style={{ width: `${pct}%` }} /></div>;
}

// ₱ amount input: numeric keypad on iPhone, blank instead of 0
export function MoneyInput({ value, onChange, label, big = false, className = '', placeholder = '0' }) {
  return (
    <label className={`money ${big ? 'money-big' : ''} ${className}`}>
      <span className="money-sign">₱</span>
      <input type="number" inputMode="decimal" step="any" min="0" placeholder={placeholder} aria-label={label}
        value={shown(value)} onChange={(e) => onChange(e.target.value)} onFocus={(e) => e.target.select()} />
    </label>
  );
}

// Paid / Not Paid toggle button
export function PaidToggle({ paid, onToggle, disabled }) {
  return (
    <button type="button" className={`paid-btn ${paid ? 'is-paid' : ''}`} onClick={onToggle} disabled={disabled} aria-pressed={paid} data-fx={paid ? 'unpaid' : 'paid'}>
      {paid ? '★ Paid' : 'Not Paid'}
    </button>
  );
}

export const IconButton = ({ label, onClick, children, tone = '' }) => (
  <button type="button" className={`icon-btn ${tone}`} onClick={onClick} aria-label={label} title={label}>{children}</button>
);

// ‹ November 2026 ▾ ›  (tap the middle to jump)
export function MonthStepper({ value, onStep, onOpen }) {
  return (
    <div className="stepper">
      <button type="button" className="step-btn" onClick={() => onStep(-1)} aria-label="Previous month"><IconLeft /></button>
      <button type="button" className="step-mid" onClick={onOpen} aria-label="Pick month and year">
        <span className="kutitap-title">{MONTHS[value.mi]} {value.y}</span><IconDown size={12} />
      </button>
      <button type="button" className="step-btn" onClick={() => onStep(1)} aria-label="Next month"><IconRight /></button>
    </div>
  );
}

export function YearStepper({ value, onChange }) {
  return (
    <div className="stepper stepper-sm">
      <button type="button" className="step-btn" onClick={() => onChange(Math.max(YEARS[0], value - 1))} aria-label="Previous year"><IconLeft /></button>
      <div className="step-mid static"><span className="kutitap-title">{value}</span></div>
      <button type="button" className="step-btn" onClick={() => onChange(Math.min(YEARS[YEARS.length - 1], value + 1))} aria-label="Next year"><IconRight /></button>
    </div>
  );
}

// ---- bottom sheet ----
export function Sheet({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grab" aria-hidden="true" />
        <div className="sheet-head">
          <div className="kutitap-title sheet-title">{title}</div>
          <IconButton label="Close" onClick={onClose}><IconX size={14} /></IconButton>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

// month + year picker sheet
export function MonthSheet({ open, value, onPick, onClose }) {
  const [year, setYear] = useState(value.y);
  useEffect(() => { if (open) setYear(value.y); }, [open, value.y]);
  return (
    <Sheet open={open} title="Pick a month" onClose={onClose}>
      <YearStepper value={year} onChange={setYear} />
      <div className="month-grid">
        {MONTHS.map((m, i) => (
          <button key={m} type="button" className={`btn ${value.mi === i && value.y === year ? 'btn-pink' : 'btn-soft'}`} onClick={() => { onPick({ mi: i, y: year }); onClose(); }}>{m.slice(0, 3)}</button>
        ))}
      </div>
    </Sheet>
  );
}

// "Are you sure?" box
export function Confirm({ ask, onClose }) {
  if (!ask) return null;
  return (
    <div className="backdrop center" onClick={onClose}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-label={ask.message} onClick={(e) => e.stopPropagation()}>
        <p>{ask.message}</p>
        <div className="dialog-btns">
          <button type="button" className="btn btn-soft" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-pink" onClick={() => { const f = ask.onYes; onClose(); f(); }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

export const Field = ({ label, children }) => <label className="form-field"><span>{label}</span>{children}</label>;

export function MonthYearSelect({ month, year, onMonth, onYear, label }) {
  return (
    <div className="form-field">
      <span>{label}</span>
      <div className="my-select">
        <select value={month} onChange={(e) => onMonth(parseInt(e.target.value))} aria-label={`${label} month`}>
          {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
        <select value={year} onChange={(e) => onYear(parseInt(e.target.value))} aria-label={`${label} year`}>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>
  );
}

export { IconCheck, IconTrash };
