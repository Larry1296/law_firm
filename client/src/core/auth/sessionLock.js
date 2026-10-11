import { jwtDecode } from 'jwt-decode';

/*
  A signed-in page locks the moment its access token expires, whether or not
  someone is using it. The token is not renewed behind the user's back: the
  password unlocks the screen and starts a fresh session, and the page under
  the lock keeps its state.
*/

let locked = false;
const listeners = new Set();

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

export const unlockSession = () => setLocked(false);

/** Lock now if the access token has expired. */
export const lockIfExpired = (accessToken) => {
  if (!locked && isTokenExpired(accessToken)) lockSession();
  return locked;
};

export const subscribeToSessionLock = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// Test hook: an unlocked session, as a freshly loaded page would start.
export const resetSessionLock = () => {
  locked = false;
};
