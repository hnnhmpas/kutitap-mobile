import React, { useEffect, useRef, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import { FinanceProvider, useFinance } from './store';
import { initFx, soundOn, setSound } from './fx';
import { USER_NAME } from './config';
import { Sheet, Sprite, Confirm, ToastProvider } from './components/ui';
import { IconLogout, IconSound, IconMute, IconCloud, IconCloudOff } from './icons';
import Dashboard from './screens/Dashboard';
import Money from './screens/Money';
import Loans from './screens/Loans';
import Savings from './screens/Savings';
import spFlower from './assets/pixel/flower.png';
import spBunny from './assets/pixel/bunny.png';
import spTama from './assets/pixel/tama.png';
import spToast from './assets/pixel/toast.png';
import spStamp from './assets/pixel/stamp.png';
import spPudding from './assets/pixel/pudding.png';

const TABS = [
  { id: 'dashboard', label: 'Home', sprite: spTama },
  { id: 'money', label: 'Money', sprite: spToast },
  { id: 'loans', label: 'Loans', sprite: spStamp },
  { id: 'savings', label: 'Savings', sprite: spPudding },
];
const now = new Date();

// keeps the app the size of what is visible when the iPhone keyboard is open, and hides the tab bar while typing.
// --vv-h / --vv-t always hold the visible area (height + top offset) so sheets and pop-ups sit above the keyboard.
function useKeyboard() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const root = document.documentElement;
    const on = () => {
      const open = window.innerHeight - vv.height > 120;
      root.classList.toggle('kb-open', open);
      root.style.setProperty('--vv-h', `${Math.round(vv.height)}px`);
      root.style.setProperty('--vv-t', `${Math.round(vv.offsetTop)}px`);
      if (open) { root.style.setProperty('--vvh', `${vv.height}px`); window.scrollTo(0, 0); } else root.style.removeProperty('--vvh');
    };
    on();
    vv.addEventListener('resize', on); vv.addEventListener('scroll', on);
    return () => { vv.removeEventListener('resize', on); vv.removeEventListener('scroll', on); };
  }, []);
}

function Shell() {
  const { ready, status } = useFinance();
  const [tab, setTab] = useState(() => { try { return window.localStorage.getItem('kmob_tab') || 'dashboard'; } catch (e) { return 'dashboard'; } });
  const [menu, setMenu] = useState(false);
  const [sound, setSoundState] = useState(soundOn);
  const [confirm, setConfirm] = useState(null);
  // the month shown on Money and Loans stays the same when you hop between them
  const [period, setPeriod] = useState({ mi: now.getMonth(), y: now.getFullYear() });
  const scrollRef = useRef(null);

  useKeyboard();
  useEffect(initFx, []);
  useEffect(() => { try { window.localStorage.setItem('kmob_tab', tab); } catch (e) {} if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [tab]);

  if (!ready) return <div className="splash"><Sprite src={spFlower} /><p>Loading your<br />tracker...</p></div>;

  const ask = (message, onYes, yes) => setConfirm({ message, onYes, yes });
  const go = (id) => setTab(id);
  const common = { period, setPeriod, ask, go };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand"><Sprite src={spFlower} /><span>Kutitap</span></div>
        <div className="top-actions">
          <span className={`sync-dot ${status}`} title={status === 'synced' ? 'Saved to the cloud' : 'Offline: saved on this phone, will upload when back online'} aria-label={status === 'synced' ? 'Synced' : 'Offline'}>{status === 'synced' ? <IconCloud size={22} /> : <IconCloudOff size={22} />}</span>
          <button type="button" className="me-btn" onClick={() => setMenu(true)} aria-label="Menu"><Sprite src={spBunny} className="spr-row" /></button>
        </div>
      </header>

      <main className="scroll" ref={scrollRef}>
        {tab === 'dashboard' && <Dashboard {...common} />}
        {tab === 'money' && <Money {...common} />}
        {tab === 'loans' && <Loans {...common} />}
        {tab === 'savings' && <Savings {...common} />}
      </main>

      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
            <Sprite src={t.sprite} className="spr-nav" /><span>{t.label}</span>
          </button>
        ))}
      </nav>

      <Sheet open={menu} title="Menu" onClose={() => setMenu(false)}>
        <div className="menu-id"><Sprite src={spBunny} /><div><div className="kutitap-title" style={{ fontSize: 18 }}>{USER_NAME}</div><div className="note">Sweet Planner</div></div></div>
        <div className="menu-row">
          <span>Tap sounds</span>
          <button type="button" className={`btn btn-sm ${sound ? 'btn-green' : 'btn-soft'}`} onClick={() => { setSound(!sound); setSoundState(!sound); }} aria-pressed={sound}>
            {sound ? <IconSound size={18} /> : <IconMute size={18} />} {sound ? 'On' : 'Off'}
          </button>
        </div>
        <button type="button" className="btn btn-soft btn-block" onClick={() => { setMenu(false); signOut(auth); }}><IconLogout size={18} /> Sign out</button>
      </Sheet>
      <Confirm ask={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

export default function App() {
  return <FinanceProvider><ToastProvider><Shell /></ToastProvider></FinanceProvider>;
}
