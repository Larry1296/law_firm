import { jwtDecode } from 'jwt-decode';

/*
  A signed-in page locks when its access token has expired and nobody has
  used the app for IDLE_LOCK_MS. Someone who is working keeps their session
  refreshed silently; an unattended screen needs the password again.

  Activity is shared between tabs through localStorage, so working in one tab
  keeps the others open.
*/
export const IDLE_LOCK_MS = 30 * 1000;

const LAST_ACTIVITY_KEY = 'lastActivityAt';
const ACTIVITY_WRITE_INTERVAL_MS = 2 * 1000;

let lastActivityAt = Date.now();
let lastWrittenAt = 0;
let locked = false;
const listeners = new Set();

const readSharedActivity = () => {
  try {
    return Number(localStorage.getItem(LAST_ACTIVITY_KEY)) || 0;
  } catch {
    return 0;
  }
};

// A page opened after a long absence starts from the last activity any tab recorded.
lastActivityAt = readSharedActivity() || lastActivityAt;

export const recordActivity = () => {
  if (locked) return;
  const now = Date.now();
  lastActivityAt = now;
  if (now - lastWrittenAt < ACTIVITY_WRITE_INTERVAL_MS) return;
  lastWrittenAt = now;
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
  } catch {
    // Storage may be unavailable; this tab's own activity still counts.
  }
};

export const getIdleMs = () => Date.now() - Math.max(lastActivityAt, readSharedActivity());

export const isIdle = () => getIdleMs() >= IDLE_LOCK_MS;

export const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const { exp } = jwtDecode(token);
    return !exp || exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

export const isSessionLocked = () => locked;

const setLocked = (value) => {
  if (locked === value) return;
  locked = value;
  listeners.forEach((listener) => listener(locked));
};

export const lockSession = () => setLocked(true);

export const unlockSession = () => {
  setLocked(false);
  recordActivity();
};

/** Lock now if the access token has expired while the user was away. */
export const lockIfExpiredAndIdle = (accessToken) => {
  if (!locked && isTokenExpired(accessToken) && isIdle()) lockSession();
  return locked;
};

export const subscribeToSessionLock = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// Test hook: an unlocked session, as a freshly loaded page would start.
export const resetSessionLock = () => {
  locked = false;
  lastActivityAt = readSharedActivity() || Date.now();
  lastWrittenAt = 0;
};
