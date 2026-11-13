// One live Firestore document holds all the data: financeTracker/user_data.
// - a single listener keeps every key (incomes, bills, loans...) in sync across devices
// - every change is saved to Firestore AND to this phone (localStorage), so the app still opens offline
// - our own pending writes echoing back are ignored, so typing is never overwritten by an older copy
import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const LS = 'kmob_';
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

export function useCloudStore(defaults) {
  const defaultsRef = useRef(defaults);
  const [data, setData] = useState(() => readLocal(defaults));
  const [status, setStatus] = useState('loading'); // loading | synced | offline
  const dataRef = useRef(data);
  const loadedRef = useRef(false);

  useEffect(() => {
    const keys = Object.keys(defaultsRef.current);
    const ref = doc(db, 'financeTracker', 'user_data');
    const finish = (st) => { loadedRef.current = true; setStatus(st); };

    const unsub = onSnapshot(ref, (snap) => {
      if (loadedRef.current && snap.metadata && snap.metadata.hasPendingWrites) return; // our own write echoing back
      const remote = snap.exists() ? snap.data() : {};
      const next = { ...dataRef.current };
      keys.forEach((k) => { if (remote[k] !== undefined) next[k] = remote[k]; });
      dataRef.current = next;
      setData(next);
      finish('synced');
    }, (err) => {
      console.warn('Firestore unavailable, using this phone\'s copy', err);
      finish('offline');
    });

    // if Firestore never answers, open with this phone's copy so the app stays usable
    const t = setTimeout(() => { if (!loadedRef.current) finish('offline'); }, 4000);
    return () => { clearTimeout(t); unsub(); };
  }, []);

  const update = useCallback((key, updater) => {
    const prev = dataRef.current[key];
    const next = typeof updater === 'function' ? updater(prev) : updater;
    if (next === prev) return;
    dataRef.current = { ...dataRef.current, [key]: next };
    setData(dataRef.current);
    try { window.localStorage.setItem(LS + key, JSON.stringify(next)); } catch (e) {}
    setDoc(doc(db, 'financeTracker', 'user_data'), { [key]: next }, { merge: true })
      .catch((e) => console.warn('Could not save to Firestore (kept on this phone)', e));
  }, []);

  return { data, update, status, ready: status !== 'loading' };
}
