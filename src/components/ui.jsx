import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
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
        value={shown(value)} onChange={(e) => onChange(e.target.value.replace(/^-+/, ''))} onFocus={(e) => e.target.select()} />
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

// ---- toasts: small "saved" messages ----
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [list, setList] = useState([]);
  const toast = useCallback((message, tone = 'ok') => {
    const id = Date.now() + Math.random();
    setList((l) => [...l.slice(-1), { id, message, tone }]);
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 2200);
  }, []);
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {list.map((t) => <div key={t.id} className={`toast ${t.tone}`}><IconCheck size={16} />{t.message}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}

// ---- bottom sheet ----
// - sits on the VISIBLE part of the screen (above the iPhone keyboard) because .backdrop follows the visual viewport
// - the title bar and the footer (Save button) never scroll away; only the middle scrolls
// - the pull bar: drag up = full height, drag down = back to fit (or close), tap = toggle full height
export function Sheet({ open, title, onClose, children, footer }) {
  const [full, setFull] = useState(false);
  const [drag, setDrag] = useState(null); // px height while the finger is on the bar
  const sheetRef = useRef(null);
  const gesture = useRef(null);

  useEffect(() => { if (open) { setFull(false); setDrag(null); } }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // when the keyboard opens, keep the box you tapped in view inside the sheet
  const onFocus = (e) => {
    const el = e.target;
    if (!el || !/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return;
    [250, 600].forEach((ms) => setTimeout(() => { try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (err) {} }, ms));
  };

  const maxH = () => Math.max(220, (window.visualViewport ? window.visualViewport.height : window.innerHeight) - 36);
  const down = (e) => {
    const h = sheetRef.current ? sheetRef.current.offsetHeight : 0;
    gesture.current = { y: e.clientY, h, moved: false, id: e.pointerId };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
  };
  const move = (e) => {
    const g = gesture.current;
    if (!g) return;
    const dy = e.clientY - g.y;
    if (Math.abs(dy) > 4) g.moved = true;
    if (g.moved) setDrag(Math.max(120, Math.min(maxH(), g.h - dy)));
  };
  const up = (e) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    const dy = e.clientY - g.y;
    setDrag(null);
    if (!g.moved) { setFull((f) => !f); return; } // a tap
    if (dy < -40) setFull(true);                    // pulled up
    else if (dy > 110 && !full) onClose();          // pulled down from normal size: dismiss
    else if (dy > 40) setFull(false);               // pulled down a little: back to fit
  };

  if (!open) return null;
  return (
    <div className="backdrop" onClick={onClose}>
      <div ref={sheetRef} className={`sheet ${full ? 'full' : ''} ${drag !== null ? 'dragging' : ''}`} style={drag !== null ? { height: drag, maxHeight: 'none' } : undefined}
        role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} onFocus={onFocus}>
        <div className="sheet-grab" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { gesture.current = null; setDrag(null); }} role="button" aria-label={full ? 'Shrink' : 'Pull up'}>
          <span />
        </div>
        <div className="sheet-head">
          <div className="kutitap-title sheet-title">{title}</div>
          <IconButton label="Close" onClick={onClose}><IconX size={18} /></IconButton>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
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
          <button type="button" className="btn btn-pink" onClick={() => { const f = ask.onYes; onClose(); f(); }}>{ask.yes || 'Delete'}</button>
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
