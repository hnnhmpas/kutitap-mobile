import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconLeft, IconRight, IconDown, IconX, IconCheck, IconTrash } from '../icons';
import { MONTHS, shown, cleanAmount } from '../finance';
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

// ₱ amount input: decimal keypad on iPhone (a real text box, so the keyboard always opens), blank instead of 0.
// Only digits and one dot are accepted; anything else typed or pasted is dropped.
export function MoneyInput({ value, onChange, label, big = false, className = '', placeholder = '0', inputRef, onEnter }) {
  return (
    <label className={`money ${big ? 'money-big' : ''} ${className}`}>
      <span className="money-sign">₱</span>
      <input ref={inputRef} type="text" inputMode="decimal" pattern="[0-9]*[.]?[0-9]*" enterKeyHint="done" autoComplete="off" autoCorrect="off" spellCheck={false}
        placeholder={placeholder} aria-label={label} value={shown(value)}
        onChange={(e) => onChange(cleanAmount(e.target.value))}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (onEnter) onEnter(); else e.currentTarget.blur(); } }}
        onFocus={(e) => { const el = e.target; setTimeout(() => { try { el.select(); } catch (err) {} }, 0); }} />
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

// ---- keyboard ----
// Keeps --vv-t (top of the visible area) and --kb (height of the keyboard) in step with the iPhone keyboard.
// They are ONLY set while a box is focused AND the keyboard is really up; the moment typing stops they are removed again,
// so a stale value after "Done" can never leave a sheet or the app stuck in a shrunken or shifted state.
export function useKeyboard() {
  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;
    const timers = [];
    const typing = () => { const a = document.activeElement; return !!a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName); };
    const apply = () => {
      const kb = vv ? Math.round(window.innerHeight - vv.height - vv.offsetTop) : 0;
      const open = !!vv && typing() && window.innerHeight - vv.height > 120;
      root.classList.toggle('kb-open', open);
      if (open) { root.style.setProperty('--vv-t', `${Math.round(vv.offsetTop)}px`); root.style.setProperty('--kb', `${Math.max(0, kb)}px`); }
      else { root.style.removeProperty('--vv-t'); root.style.removeProperty('--kb'); }
    };
    // iOS reports the new keyboard size a little late (and after "Done" sometimes not at all), so look again a few times
    const settle = (delays) => { timers.forEach(clearTimeout); timers.length = 0; delays.forEach((ms) => timers.push(setTimeout(apply, ms))); };
    const onIn = () => { apply(); settle([60, 200, 450, 800]); };
    const onOut = () => settle([120, 300, 600, 1000]);
    const onChange = () => apply();
    apply();
    if (vv) { vv.addEventListener('resize', onChange); vv.addEventListener('scroll', onChange); }
    window.addEventListener('resize', onChange); window.addEventListener('orientationchange', onChange);
    document.addEventListener('focusin', onIn); document.addEventListener('focusout', onOut);
    return () => {
      timers.forEach(clearTimeout);
      if (vv) { vv.removeEventListener('resize', onChange); vv.removeEventListener('scroll', onChange); }
      window.removeEventListener('resize', onChange); window.removeEventListener('orientationchange', onChange);
      document.removeEventListener('focusin', onIn); document.removeEventListener('focusout', onOut);
    };
  }, []);
}

let safeProbe = null;
const safeTop = () => {
  try {
    if (!safeProbe) { safeProbe = document.createElement('div'); safeProbe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px)'; document.body.appendChild(safeProbe); }
    return parseFloat(getComputedStyle(safeProbe).paddingTop) || 0;
  } catch (e) { return 0; }
};

// ---- bottom sheet ----
// - rendered in a portal on <body>, so nothing in the app (tab bar, sprites, sticky bars) can ever paint over it
// - .backdrop sits on the VISIBLE part of the screen (above the keyboard), so the sheet and its Save button are never hidden by it
// - the sheet is as tall as its content: the Save / Add button (the `footer`) sits directly under the inputs.
//   If the content is taller than the screen, the middle scrolls and the button sticks to the bottom edge
// - the pull bar: drag up = tall, drag down = back to fit (or close), tap = toggle. Height eases to its target
export function Sheet({ open, title, onClose, children, footer }) {
  const [full, setFull] = useState(false);
  const [height, setHeight] = useState(null);   // px, only while dragging / easing; null = let the CSS decide
  const [phase, setPhase] = useState('rest');   // rest | drag | ease
  const sheetRef = useRef(null), bodyRef = useRef(null), innerRef = useRef(null), grabRef = useRef(null), headRef = useRef(null);
  const gesture = useRef(null);

  useEffect(() => { if (open) { setFull(false); setHeight(null); setPhase('rest'); } }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const root = document.documentElement;
    root.dataset.sheets = String((parseInt(root.dataset.sheets || '0', 10) || 0) + 1);
    root.classList.add('sheet-open');
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      const n = Math.max(0, (parseInt(root.dataset.sheets || '1', 10) || 1) - 1);
      root.dataset.sheets = String(n);
      if (n === 0) root.classList.remove('sheet-open');
    };
  }, [open, onClose]);

  // when the keyboard opens, keep the box you tapped in view inside the sheet
  const onFocus = (e) => {
    const el = e.target;
    if (!el || !/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return;
    [250, 600].forEach((ms) => setTimeout(() => { try { el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (err) {} }, ms));
  };

  const room = () => { const s = sheetRef.current; return s && s.parentElement ? s.parentElement.clientHeight - safeTop() - 12 : 600; };
  const natural = () => {
    const s = sheetRef.current, b = bodyRef.current, inner = innerRef.current;
    if (!s || !b || !inner) return 0;
    const cs = getComputedStyle(b);
    return Math.min(room(), 4 + grabRef.current.offsetHeight + headRef.current.offsetHeight + (parseFloat(cs.paddingTop) || 0) + inner.offsetHeight);
  };
  const easeTimer = useRef(0);
  const finishEase = () => { clearTimeout(easeTimer.current); setPhase('rest'); setHeight(null); };
  // fallback timer: if the height does not actually change there is no transitionend, so never stay stuck in 'ease'
  const ease = (to, nextFull) => { clearTimeout(easeTimer.current); setPhase('ease'); setFull(nextFull); setHeight(to); easeTimer.current = setTimeout(finishEase, 340); };
  useEffect(() => () => clearTimeout(easeTimer.current), []);

  const down = (e) => {
    clearTimeout(easeTimer.current);
    const h = sheetRef.current ? sheetRef.current.offsetHeight : 0;
    gesture.current = { y: e.clientY, h, moved: false, wasFull: full };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
  };
  const move = (e) => {
    const g = gesture.current;
    if (!g) return;
    const dy = e.clientY - g.y;
    if (Math.abs(dy) > 4 && !g.moved) { g.moved = true; setPhase('drag'); }
    if (g.moved) setHeight(Math.max(140, Math.min(room(), g.h - dy)));
  };
  const up = (e) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    const dy = e.clientY - g.y;
    if (!g.moved) { // a tap on the bar
      setHeight(g.h); requestAnimationFrame(() => (g.wasFull ? ease(natural(), false) : ease(room(), true)));
      return;
    }
    if (dy < -40) ease(room(), true);                              // pulled up: tall
    else if (dy > 110 && !g.wasFull) onClose();                    // pulled down from normal size: dismiss
    else if (dy > 40) ease(natural(), false);                      // pulled down a little: back to fit
    else ease(g.wasFull ? room() : natural(), g.wasFull);          // barely moved: stay as it was
  };
  const cancel = () => { gesture.current = null; if (phase === 'drag') ease(full ? room() : natural(), full); };
  const onEnd = (e) => { if (e.target === sheetRef.current && e.propertyName === 'height' && phase === 'ease') finishEase(); };

  if (!open) return null;
  return createPortal(
    <div className="backdrop" onClick={onClose}>
      <div ref={sheetRef} className={`sheet ${full ? 'full' : ''} ${phase === 'drag' ? 'dragging' : ''} ${phase === 'ease' ? 'easing' : ''}`}
        style={height !== null ? { height, maxHeight: 'none' } : undefined} onTransitionEnd={onEnd}
        role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} onFocus={onFocus}>
        <div ref={grabRef} className="sheet-grab" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel} role="button" aria-label={full ? 'Shrink' : 'Pull up'}>
          <span />
        </div>
        <div ref={headRef} className="sheet-head">
          <div className="kutitap-title sheet-title">{title}</div>
          <IconButton label="Close" onClick={onClose}><IconX size={18} /></IconButton>
        </div>
        <div ref={bodyRef} className="sheet-body">
          <div ref={innerRef} className="sheet-inner">
            {children}
            {footer && <div className="sheet-foot">{footer}</div>}
          </div>
        </div>
      </div>
    </div>,
    document.body
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
  return createPortal(
    <div className="backdrop center" onClick={onClose}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-label={ask.message} onClick={(e) => e.stopPropagation()}>
        <p>{ask.message}</p>
        <div className="dialog-btns">
          <button type="button" className="btn btn-soft" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-pink" onClick={() => { const f = ask.onYes; onClose(); f(); }}>{ask.yes || 'Delete'}</button>
        </div>
      </div>
    </div>,
    document.body
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
