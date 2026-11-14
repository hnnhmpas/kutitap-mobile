// One live Firestore document holds all the data: financeTracker/user_data.
// - a single listener keeps every key (incomes, expenses, loans...) in sync across devices
// - every change is saved to Firestore AND to this phone (localStorage), so the app still opens offline
// - a key that has not reached Firestore yet is remembered ("unsent"); it is re-sent when the app opens or the phone is back online,
//   and an older copy from Firestore never overwrites it
// - each key is written as a WHOLE field (mergeFields), never deep-merged. A deep merge cannot delete nested entries,
//   so removed amounts used to come back after a refresh ("ghost" amounts)
// - if Firestore REJECTS a write for good (permission denied, bad data...) the key is rolled back to the last copy Firestore
//   confirmed and the app is told, so an amount that could never be saved does not stay in the totals
// - typing is debounced (one write per pause, not per keystroke) and flushed when the app goes to the background
import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const LS = 'kmob_';
const UNSENT = 'kmob_unsent';
const DEBOUNCE_MS = 350;
// errors that retrying will never fix. Network trouble (unavailable, deadline-exceeded...) is NOT in this list: those stay queued.
const PERMANENT = new Set(['permission-denied', 'unauthenticated', 'invalid-argument', 'failed-precondition', 'out-of-range', 'data-loss']);

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
const writeLocal = (key, value) => { try { window.localStorage.setItem(LS + key, JSON.stringify(value)); } catch (e) {} };
const readUnsent = () => { try { return new Set(JSON.parse(window.localStorage.getItem(UNSENT) || '[]')); } catch (e) { return new Set(); } };
const saveUnsent = (set) => { try { window.localStorage.setItem(UNSENT, JSON.stringify([...set])); } catch (e) {} };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function useCloudStore(defaults, onFail) {
  const defaultsRef = useRef(defaults);
  const onFailRef = useRef(onFail);
  onFailRef.current = onFail;
  const [data, setData] = useState(() => readLocal(defaults));
  const [status, setStatus] = useState('loading'); // loading | synced | offline
  const dataRef = useRef(data);
  const loadedRef = useRef(false);
  const unsentRef = useRef(readUnsent());
  const versionRef = useRef({});
  const confirmedRef = useRef({}); // last value Firestore itself confirmed, per key
  const timersRef = useRef({});

  const settle = useCallback(() => {
    setStatus(unsentRef.current.size === 0 && navigator.onLine !== false ? 'synced' : 'offline');
  }, []);

  // write one key to Firestore; it stays "unsent" until Firestore confirms it
  const push = useCallback((key) => {
    clearTimeout(timersRef.current[key]); delete timersRef.current[key];
    const v = (versionRef.current[key] || 0) + 1;
    versionRef.current[key] = v;
    unsentRef.current.add(key); saveUnsent(unsentRef.current);
    const value = dataRef.current[key];
    setDoc(doc(db, 'financeTracker', 'user_data'), { [key]: value }, { mergeFields: [key] })
      .then(() => {
        confirmedRef.current[key] = value;
        if (versionRef.current[key] !== v) return; // a newer change of this key is on its way
        unsentRef.current.delete(key); saveUnsent(unsentRef.current);
        settle();
      })
      .catch((e) => {
        if (versionRef.current[key] !== v) return; // superseded by a newer write
        if (PERMANENT.has(e && e.code)) {
          // Firestore will never accept this: undo it instead of leaving an amount that exists on this phone only
          console.warn('Firestore rejected the change, undoing it', e);
          const back = key in confirmedRef.current ? confirmedRef.current[key] : defaultsRef.current[key];
          dataRef.current = { ...dataRef.current, [key]: back };
          setData(dataRef.current); writeLocal(key, back);
          unsentRef.current.delete(key); saveUnsent(unsentRef.current);
          settle();
          if (onFailRef.current) onFailRef.current(key, e);
        } else {
          console.warn('Could not reach Firestore (kept on this phone, will retry)', e);
          setStatus('offline');
        }
      });
  }, [settle]);

  const flushAll = useCallback(() => { Object.keys(timersRef.current).forEach((k) => push(k)); }, [push]);

  useEffect(() => {
    const keys = Object.keys(defaultsRef.current);
    const ref = doc(db, 'financeTracker', 'user_data');
    const finish = (st) => { loadedRef.current = true; setStatus(st); };
    let seenServer = false;

    const unsub = onSnapshot(ref, (snap) => {
      if (loadedRef.current && snap.metadata && snap.metadata.hasPendingWrites) return; // our own write echoing back
      const remote = snap.exists() ? snap.data() : {};
      const fromServer = !(snap.metadata && snap.metadata.fromCache);
      const next = { ...dataRef.current };
      keys.forEach((k) => {
        if (fromServer && remote[k] !== undefined) confirmedRef.current[k] = remote[k];
        if (remote[k] !== undefined && !unsentRef.current.has(k)) { next[k] = remote[k]; writeLocal(k, remote[k]); }
      });
      dataRef.current = next;
      setData(next);
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
    const goOnline = () => { unsentRef.current.forEach((k) => push(k)); settle(); };
    const goOffline = () => setStatus('offline');
    const onHide = () => { if (document.visibilityState === 'hidden') flushAll(); };
    window.addEventListener('online', goOnline); window.addEventListener('offline', goOffline);
    window.addEventListener('pagehide', flushAll); document.addEventListener('visibilitychange', onHide);
    return () => {
      clearTimeout(t); unsub(); flushAll();
      window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline);
      window.removeEventListener('pagehide', flushAll); document.removeEventListener('visibilitychange', onHide);
    };
  }, [push, settle, flushAll]);

  // update(key, fn, { now }) -> true when something changed.
  // now: write straight away (add / delete / toggle). Otherwise the write waits for a short pause in typing.
  const update = useCallback((key, updater, { now = false } = {}) => {
    const prev = dataRef.current[key];
    const next = typeof updater === 'function' ? updater(prev) : updater;
    if (next === prev) return false;
    dataRef.current = { ...dataRef.current, [key]: next };
    setData(dataRef.current);
    writeLocal(key, next);
    unsentRef.current.add(key); saveUnsent(unsentRef.current); // protected from older remote copies from now on
    if (now) push(key);
    else { clearTimeout(timersRef.current[key]); timersRef.current[key] = setTimeout(() => push(key), DEBOUNCE_MS); }
    return true;
  }, [push]);

  return { data, update, status, ready: status !== 'loading' };
}
