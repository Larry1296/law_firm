import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearAuthSession,
  getAuthStorageMode,
  getStoredAuth,
  saveAuthSession,
} from './authStorage';

const session = {
  user: { id: 'user-1', role: 'STAFF' },
  access: 'access-token',
  refresh: 'refresh-token',
};

describe('remember-me authentication storage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('persists authentication in local storage when remember me is checked', () => {
    saveAuthSession(session, true);

    expect(getAuthStorageMode()).toBe('local');
    expect(localStorage.getItem('accessToken')).toBe('access-token');
    expect(sessionStorage.getItem('accessToken')).toBeNull();
    expect(getStoredAuth()).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: session.user,
    });
  });

  it('keeps authentication only in session storage when remember me is unchecked', () => {
    saveAuthSession(session, false);

    expect(getAuthStorageMode()).toBe('session');
    expect(sessionStorage.getItem('accessToken')).toBe('access-token');
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(getStoredAuth().user).toEqual(session.user);
  });

  it('clears both persistent and session authentication on logout', () => {
    saveAuthSession(session, true);
    clearAuthSession();

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(sessionStorage.getItem('accessToken')).toBeNull();
    expect(getStoredAuth()).toEqual({ accessToken: null, refreshToken: null, user: null });
  });
});
