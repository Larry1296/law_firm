import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetSessionLock } from '@/core/auth/sessionLock';
import AuthProvider from '@/core/store/AuthProvider';
import authService from '@/modules/auth/service/authService';

vi.mock('@/modules/auth/service/authService', () => ({
  default: {
    login: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
    refreshToken: vi.fn(),
  },
}));

const START = new Date('2026-09-29T09:00:00Z').getTime();
const user = { id: 'u1', email: 'grace@am.test', full_name: 'Grace Achieng', role: 'ADMIN' };

const jwt = (expiresAt) => {
  const encode = (value) => btoa(JSON.stringify(value)).replace(/=+$/, '');
  return `${encode({ alg: 'HS256' })}.${encode({ exp: Math.floor(expiresAt / 1000) })}.signature`;
};

function signIn({ accessExpiresAt }) {
  localStorage.setItem('authStorageMode', 'local');
  localStorage.setItem('accessToken', jwt(accessExpiresAt));
  localStorage.setItem('refreshToken', jwt(START + 7 * 24 * 60 * 60 * 1000));
  localStorage.setItem('user', JSON.stringify(user));
}

const renderApp = () => render(
  <AuthProvider>
    <p>Client file: Mwangi v Republic</p>
  </AuthProvider>,
  { container: document.body.appendChild(Object.assign(document.createElement('div'), { id: 'root' })) },
);

const advance = (ms) => act(() => { vi.advanceTimersByTime(ms); });

describe('session lock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    localStorage.clear();
    resetSessionLock();
    vi.clearAllMocks();
    authService.me.mockResolvedValue({ user });
  });

  afterEach(() => {
    cleanup();
    document.getElementById('root')?.remove();
    vi.useRealTimers();
  });

  it('locks when the token expires on a screen left idle for 30 seconds', () => {
    signIn({ accessExpiresAt: START + 90 * 1000 });
    renderApp();
    advance(60 * 1000);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    advance(35 * 1000);

    expect(screen.getByRole('dialog', { name: 'Welcome back' })).toBeInTheDocument();
    expect(document.getElementById('root').inert).toBe(true);
    expect(authService.refreshToken).not.toHaveBeenCalled();
  });

  it('does not lock an idle screen while the token is still valid', () => {
    signIn({ accessExpiresAt: START + 10 * 60 * 1000 });
    renderApp();

    advance(2 * 60 * 1000);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renews the token silently for someone who is working', async () => {
    authService.refreshToken.mockResolvedValue({ access: jwt(START + 60 * 60 * 1000) });
    signIn({ accessExpiresAt: START + 90 * 1000 });
    renderApp();

    for (let elapsed = 0; elapsed < 95 * 1000; elapsed += 5 * 1000) {
      fireEvent.keyDown(window);
      advance(5 * 1000);
    }
    await act(async () => {});

    expect(authService.refreshToken).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('locks straight away when the page is reopened after the token expired', () => {
    localStorage.setItem('lastActivityAt', String(START - 60 * 60 * 1000));
    signIn({ accessExpiresAt: START - 1000 });
    resetSessionLock();
    renderApp();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('unlocks with the signed-in user’s password', async () => {
    const fresh = { access: jwt(START + 60 * 60 * 1000), refresh: jwt(START + 7 * 24 * 60 * 60 * 1000), user };
    authService.login.mockResolvedValue(fresh);
    signIn({ accessExpiresAt: START + 90 * 1000 });
    renderApp();
    advance(95 * 1000);

    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'Kenya-Law-2026!' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Unlock' })); });

    expect(authService.login).toHaveBeenCalledWith({ email: 'grace@am.test', password: 'Kenya-Law-2026!' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.getElementById('root').inert).toBe(false);
    expect(localStorage.getItem('accessToken')).toBe(fresh.access);
  });

  it('refuses to unlock into a different account', async () => {
    authService.login.mockResolvedValue({ access: 'a', refresh: 'r', user: { ...user, id: 'someone-else' } });
    signIn({ accessExpiresAt: START + 90 * 1000 });
    renderApp();
    advance(95 * 1000);

    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'secret' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Unlock' })); });

    expect(screen.getByRole('alert')).toHaveTextContent('Sign in as the account that was locked');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
