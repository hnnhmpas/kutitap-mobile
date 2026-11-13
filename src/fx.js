// Tiny pixel sparkles + 8-bit blips on taps. Purely cosmetic. Sound is OFF by default (toggle in the menu).
const LS = 'kmob_sfx';
export const soundOn = () => { try { return window.localStorage.getItem(LS) === 'on'; } catch (e) { return false; } };
export const setSound = (on) => { try { window.localStorage.setItem(LS, on ? 'on' : 'off'); } catch (e) {} };

let ctx = null;
const tone = (notes, vol = 0.035) => {
  if (!soundOn()) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    ctx = ctx || new Ctx();
    if (ctx.state === 'suspended') ctx.resume();
    let t = ctx.currentTime;
    notes.forEach(([f, dur]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square'; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur);
      t += dur * 0.9;
    });
  } catch (e) {}
};

const burst = (x, y, n, colors) => {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('div');
    const size = 4 + Math.floor(Math.random() * 3) * 2;
    p.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${colors[i % colors.length]};box-shadow:0 0 0 2px #4a1d36;pointer-events:none;z-index:99999`;
    document.body.appendChild(p);
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.5, d = 24 + Math.random() * 30;
    const dx = Math.cos(a) * d, dy = Math.sin(a) * d;
    p.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${dx}px,${dy - 14}px)`, opacity: 1, offset: 0.7 }, { transform: `translate(${dx}px,${dy + 10}px)`, opacity: 0 }], { duration: 520, easing: 'steps(6)' }).onfinish = () => p.remove();
  }
};

// one delegated listener: buttons tagged data-fx="paid" | "unpaid" get the big/small effect, other buttons a small one
export function initFx() {
  const onClick = (e) => {
    const el = e.target.closest && e.target.closest('button, .fx');
    if (!el || el.disabled) return;
    const kind = el.getAttribute('data-fx');
    const x = e.clientX || window.innerWidth / 2, y = e.clientY || window.innerHeight / 2;
    if (kind === 'paid') { tone([[660, 0.06], [880, 0.06], [1320, 0.14]]); burst(x, y, 12, ['#ffd86b', '#9be58a', '#f0589a']); }
    else if (kind === 'unpaid') { tone([[330, 0.08], [220, 0.12]]); burst(x, y, 4, ['#8a5a74', '#ffe9a8']); }
    else { tone([[520, 0.05], [780, 0.07]]); burst(x, y, 5, ['#f0589a', '#ffd86b', '#9be58a']); }
  };
  document.addEventListener('click', onClick, true);
  return () => document.removeEventListener('click', onClick, true);
}
