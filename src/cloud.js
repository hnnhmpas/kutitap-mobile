// One live Firestore document holds all the data: financeTracker/user_data.
// - a single listener keeps every key (incomes, expenses, loans...) in sync across devices
// - every change is saved to Firestore AND to this phone (localStorage), so the app still opens offline
// - a key that has not reached Firestore yet is remembered ("unsent"); it is re-sent when the app opens or the phone is back online,
//   and an older copy from Firestore never overwrites it. Anything saved on this phone but missing in Firestore is uploaded too,
//   so no amount can exist on one phone only ("ghost" amounts).
// - our own pending writes echoing back are ignored, so typing is never overwritten by an older copy
import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const LS = 'kmob_';
const UNSENT = 'kmob_unsent';
const readLocal = (defaults) => {
  const out = {};
  Object.keys(defaults).forEach((k) => {
    try {
      const raw = window.localStorage.getItem(LS + k);
      out[k] = raw ? JSON.parse(raw) : defaults[k];
    } catch (e) { out[k] = defaults[k]; }
  });
  return out;
};
const readUnsent = () => { try { return new Set(JSON.parse(window.localStorage.getItem(UNSENT) || '[]')); } catch (e) { return new Set(); } };
const saveUnsent = (set) => { try { window.localStorage.setItem(UNSENT, JSON.stringify([...set])); } catch (e) {} };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function useCloudStore(defaults) {
  const defaultsRef = useRef(defaults);
  const [data, setData] = useState(() => readLocal(defaults));
  const [status, setStatus] = useState('loading'); // loading | synced | offline
  const dataRef = useRef(data);
  const loadedRef = useRef(false);
  const unsentRef = useRef(readUnsent());
  const versionRef = useRef({});

  // send one key to Firestore; it stays "unsent" until Firestore confirms it
  const push = useCallback((key) => {
    const v = (versionRef.current[key] || 0) + 1;
    versionRef.current[key] = v;
    unsentRef.current.add(key); saveUnsent(unsentRef.current);
    setDoc(doc(db, 'financeTracker', 'user_data'), { [key]: dataRef.current[key] }, { merge: true })
      .then(() => {
        if (versionRef.current[key] !== v) return; // a newer change of this key is on its way
        unsentRef.current.delete(key); saveUnsent(unsentRef.current);
        if (unsentRef.current.size === 0 && navigator.onLine !== false) setStatus('synced');
      })
      .catch((e) => { console.warn('Could not save to Firestore (kept on this phone, will retry)', e); setStatus('offline'); });
  }, []);

  useEffect(() => {
    const keys = Object.keys(defaultsRef.current);
    const ref = doc(db, 'financeTracker', 'user_data');
    const finish = (st) => { loadedRef.current = true; setStatus(st); };
    let seenServer = false;

    const unsub = onSnapshot(ref, (snap) => {
      if (loadedRef.current && snap.metadata && snap.metadata.hasPendingWrites) return; // our own write echoing back
      const remote = snap.exists() ? snap.data() : {};
      const next = { ...dataRef.current };
      keys.forEach((k) => { if (remote[k] !== undefined && !unsentRef.current.has(k)) next[k] = remote[k]; });
      dataRef.current = next;
      setData(next);
      const fromServer = !(snap.metadata && snap.metadata.fromCache);
      if (fromServer && !seenServer) {
        seenServer = true;
        // upload what only this phone has: unsent changes + anything missing in Firestore
        keys.forEach((k) => {
          if (unsentRef.current.has(k) || (remote[k] === undefined && !same(next[k], defaultsRef.current[k]))) push(k);
        });
      }
      finish(fromServer || navigator.onLine !== false ? 'synced' : 'offline');
    }, (err) => {
      console.warn('Firestore unavailable, using this phone\'s copy', err);
      finish('offline');
    });

    // if Firestore never answers, open with this phone's copy so the app stays usable
    const t = setTimeout(() => { if (!loadedRef.current) finish('offline'); }, 4000);
    const goOnline = () => { unsentRef.current.forEach((k) => push(k)); if (unsentRef.current.size === 0) setStatus('synced'); };
    const goOffline = () => setStatus('offline');
    window.addEventListener('online', goOnline); window.addEventListener('offline', goOffline);
    return () => { clearTimeout(t); unsub(); window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, [push]);

  const update = useCallback((key, updater) => {
    const prev = dataRef.current[key];
    const next = typeof updater === 'function' ? updater(prev) : updater;
    if (next === prev) return;
    dataRef.current = { ...dataRef.current, [key]: next };
    setData(dataRef.current);
    try { window.localStorage.setItem(LS + key, JSON.stringify(next)); } catch (e) {}
    push(key);
  }, [push]);

  return { data, update, status, ready: status !== 'loading' };
}
