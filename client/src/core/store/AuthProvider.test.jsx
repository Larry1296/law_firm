import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetSessionLock } from '@/core/auth/sessionLock';
import AuthProvider from '@/core/store/AuthProvider';
import authService from '@/modules/auth/service/authService';
import { useContext } from 'react';
import AuthContext from '@/core/store/AuthContext';
import { confirmAction } from '@/core/utils/themedSwal';

vi.mock('@/core/utils/themedSwal', () => ({ confirmAction: vi.fn() }));

vi.mock('@/modules/auth/service/authService', () => ({
  default: {
    login: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
    refreshToken: vi.fn(),
    unlockWithPin: vi.fn(),
  },
}));

const START = new Date('2026-09-29T09:00:00Z').getTime();
const user = { id: 'u1', email: 'grace@am.test', full_name: 'Grace Achieng', role: 'ADMIN' };

const jwt = (expiresAt) => {
  const encode = (value) => btoa(JSON.stringify(value)).replace(/=+$/, '');
  return `${encode({ alg: 'HS256' })}.${encode({ exp: Math.floor(expiresAt / 1000) })}.signature`;
};

function signIn({ accessExpiresAt, refreshExpiresAt = START + 7 * 24 * 60 * 60 * 1000, account = user }) {
  localStorage.setItem('authStorageMode', 'local');
  localStorage.setItem('accessToken', jwt(accessExpiresAt));
  localStorage.setItem('refreshToken', jwt(refreshExpiresAt));
  localStorage.setItem('user', JSON.stringify(account));
}

function SignOutProbe() {
  const { logout, lockWorkspace } = useContext(AuthContext);
  return (
    <>
      <button onClick={() => logout({ redirect: false })}>Sign out securely</button>
      <button onClick={lockWorkspace}>Lock now</button>
    </>
  );
}

const renderApp = () => render(
  <AuthProvider>
    <p>Client file: Mwangi v Republic</p>
    <SignOutProbe />
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
    confirmAction.mockResolvedValue(() => {});
    authService.me.mockResolvedValue({ user });
  });

  afterEach(() => {
    cleanup();
    document.getElementById('root')?.remove();
    vi.useRealTimers();
  });

  it('locks the moment the token expires', () => {
    signIn({ accessExpiresAt: START + 90 * 1000 });
    renderApp();
    advance(85 * 1000);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    advance(10 * 1000);

    expect(screen.getByRole('dialog', { name: 'Welcome back' })).toBeInTheDocument();
    expect(document.getElementById('root').inert).toBe(true);
    expect(authService.refreshToken).not.toHaveBeenCalled();
  });

  it('preserves the session and sends no logout when sign-out confirmation is cancelled', async () => {
    signIn({ accessExpiresAt: START + 90 * 1000 });
    const token = localStorage.getItem('accessToken');
    confirmAction.mockResolvedValue(false);
    renderApp();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Sign out securely' })); });
    expect(authService.logout).not.toHaveBeenCalled();
    expect(localStorage.getItem('accessToken')).toBe(token);
  });

  it('clears the session only after confirmed sign-out', async () => {
    signIn({ accessExpiresAt: START + 90 * 1000 });
    authService.logout.mockResolvedValue({});
    renderApp();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Sign out securely' })); });
    expect(authService.logout).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('does not lock an idle screen while the token is still valid', () => {
    signIn({ accessExpiresAt: START + 10 * 60 * 1000 });
    renderApp();

    advance(2 * 60 * 1000);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('locks even while someone is working, without renewing the token behind their back', () => {
    signIn({ accessExpiresAt: START + 90 * 1000 });
    renderApp();

    for (let elapsed = 0; elapsed < 95 * 1000; elapsed += 5 * 1000) {
      fireEvent.keyDown(window);
      advance(5 * 1000);
    }

    expect(screen.getByRole('dialog', { name: 'Welcome back' })).toBeInTheDocument();
    expect(authService.refreshToken).not.toHaveBeenCalled();
  });

  it('locks, rather than signing out, when the whole sign-in has expired', () => {
    signIn({ accessExpiresAt: START + 60 * 60 * 1000, refreshExpiresAt: START + 20 * 1000 });
    renderApp();
    advance(25 * 1000);

    expect(screen.getByRole('dialog', { name: 'Welcome back' })).toBeInTheDocument();
    expect(localStorage.getItem('user')).not.toBeNull();
    // It stays locked: the still-valid access token is not a fresh sign-in.
    advance(10 * 1000);
    expect(screen.getByRole('dialog', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('unlocks when another tab unlocked the same account', () => {
    signIn({ accessExpiresAt: START + 10 * 1000 });
    renderApp();
    advance(15 * 1000);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // The other tab signed in again with the password and saved fresh tokens.
    localStorage.setItem('accessToken', jwt(START + 60 * 60 * 1000));
    localStorage.setItem('refreshToken', jwt(START + 7 * 24 * 60 * 60 * 1000));
    advance(5 * 1000);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('locks straight away when the page is reopened after the token expired', () => {
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

  it('locks at once from the lock button and stays locked through a reload', () => {
    signIn({ accessExpiresAt: START + 60 * 60 * 1000 });
    renderApp();
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'Lock now' })); });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Both tokens are still valid, yet the hand-set lock holds.
    advance(5 * 1000);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    cleanup();
    document.getElementById('root')?.remove();
    resetSessionLock();
    renderApp();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('unlocks as soon as the sixth PIN digit is typed', async () => {
    const pinUser = { ...user, has_unlock_pin: true };
    const fresh = { access: jwt(START + 60 * 60 * 1000), refresh: jwt(START + 7 * 24 * 60 * 60 * 1000), user: pinUser };
    authService.unlockWithPin.mockResolvedValue(fresh);
    signIn({ accessExpiresAt: START + 60 * 60 * 1000, account: pinUser });
    renderApp();
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'Lock now' })); });
    const storedRefresh = localStorage.getItem('refreshToken');
    const storedAccess = localStorage.getItem('accessToken');

    fireEvent.change(screen.getByLabelText('Unlock PIN'), { target: { value: '48291' } });
    expect(authService.unlockWithPin).not.toHaveBeenCalled();
    await act(async () => { fireEvent.change(screen.getByLabelText('Unlock PIN'), { target: { value: '482915' } }); });

    expect(authService.unlockWithPin).toHaveBeenCalledWith({ refresh: storedRefresh, access: storedAccess, pin: '482915' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem('workspaceLocked')).toBeNull();
  });

  it('asks for the password, not the PIN, once the session has expired', () => {
    const pinUser = { ...user, has_unlock_pin: true };
    signIn({ accessExpiresAt: START + 90 * 1000, account: pinUser });
    renderApp();

    advance(95 * 1000);

    expect(screen.getByRole('dialog', { name: 'Welcome back' })).toHaveTextContent('Your session has expired, so enter your password');
    expect(screen.queryByLabelText('Unlock PIN')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Use my PIN instead' })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/)).toBeInTheDocument();
  });

  it('drops the PIN if the session expires while locked by hand', () => {
    const pinUser = { ...user, has_unlock_pin: true };
    signIn({ accessExpiresAt: START + 60 * 1000, account: pinUser });
    renderApp();
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'Lock now' })); });
    expect(screen.getByLabelText('Unlock PIN')).toBeInTheDocument();

    advance(65 * 1000);

    expect(screen.queryByLabelText('Unlock PIN')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/)).toBeInTheDocument();
  });

  it('clears a wrong PIN and says how many tries are left', async () => {
    const pinUser = { ...user, has_unlock_pin: true };
    authService.unlockWithPin.mockRejectedValue({ response: { status: 400, data: { detail: 'Wrong PIN. 2 tries left.' } } });
    signIn({ accessExpiresAt: START + 60 * 60 * 1000, account: pinUser });
    renderApp();
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'Lock now' })); });

    await act(async () => { fireEvent.change(screen.getByLabelText('Unlock PIN'), { target: { value: '000001' } }); });

    expect(screen.getByRole('alert')).toHaveTextContent('Wrong PIN. 2 tries left.');
    expect(screen.getByLabelText('Unlock PIN')).toHaveValue('');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
