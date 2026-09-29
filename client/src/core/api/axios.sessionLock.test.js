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

  it('locks instead of renewing an expired token after 30 idle seconds', async () => {
    localStorage.setItem('accessToken', jwt(START + 10 * 1000));
    vi.setSystemTime(START + 31 * 1000);

    await expect(axiosInstance.get('/notifications/')).rejects.toMatchObject({ isSessionLocked: true });
    expect(isSessionLocked()).toBe(true);
    expect(adapter).not.toHaveBeenCalled();
  });

  it('lets an active user’s requests through', async () => {
    localStorage.setItem('accessToken', jwt(START + 60 * 60 * 1000));

    await axiosInstance.get('/cases/');
    expect(adapter).toHaveBeenCalledTimes(1);
  });
});
