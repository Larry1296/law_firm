import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import axiosInstance from '@/core/api/axios';
import { isSessionLocked, lockSession, resetSessionLock } from '@/core/auth/sessionLock';

const START = new Date('2026-09-29T09:00:00Z').getTime();
const jwt = (expiresAt) => {
  const encode = (value) => btoa(JSON.stringify(value)).replace(/=+$/, '');
  return `${encode({ alg: 'HS256' })}.${encode({ exp: Math.floor(expiresAt / 1000) })}.signature`;
};

describe('API requests and the session lock', () => {
  const adapter = vi.fn(async (config) => ({ data: {}, status: 200, statusText: 'OK', headers: {}, config }));

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    localStorage.clear();
    localStorage.setItem('refreshToken', jwt(START + 60 * 60 * 1000));
    resetSessionLock();
    adapter.mockClear();
    axiosInstance.defaults.adapter = adapter;
  });

  afterEach(() => vi.useRealTimers());

  it('sends nothing while the screen is locked', async () => {
    localStorage.setItem('accessToken', jwt(START + 60 * 60 * 1000));
    lockSession();

    await expect(axiosInstance.get('/cases/')).rejects.toMatchObject({ isSessionLocked: true });
    expect(adapter).not.toHaveBeenCalled();
  });

  it('locks instead of renewing an expired token', async () => {
    localStorage.setItem('accessToken', jwt(START + 10 * 1000));
    vi.setSystemTime(START + 11 * 1000);

    await expect(axiosInstance.get('/notifications/')).rejects.toMatchObject({ isSessionLocked: true });
    expect(isSessionLocked()).toBe(true);
    expect(adapter).not.toHaveBeenCalled();
  });

  it('lets requests through while the token is valid', async () => {
    localStorage.setItem('accessToken', jwt(START + 60 * 60 * 1000));

    await axiosInstance.get('/cases/');
    expect(adapter).toHaveBeenCalledTimes(1);
  });
});

describe('API requests on a temporary password', () => {
  it('signs the user out when the server requires a password change', async () => {
    localStorage.setItem('accessToken', jwt(Date.now() + 60 * 60 * 1000));
    localStorage.setItem('user', JSON.stringify({ role: 'STAFF', must_change_password: true }));
    axiosInstance.defaults.adapter = vi.fn(async (config) => Promise.reject(Object.assign(new Error('Forbidden'), {
      config,
      response: { status: 403, data: { code: 'password_change_required', detail: 'Change your temporary password before continuing.' } },
    })));

    await expect(axiosInstance.get('/cases/')).rejects.toMatchObject({ response: { status: 403 } });
    expect(localStorage.getItem('accessToken')).toBeNull();
  });
});
