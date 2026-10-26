import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AuthContext from '@/core/store/AuthContext';
import authService from '@/modules/auth/service/authService';
import Login from './Login';

vi.mock('@/modules/auth/service/authService', () => ({ default: {
  login: vi.fn(), changeStaffPassword: vi.fn(), changePassword: vi.fn(),
} }));

const navigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({ ...(await importOriginal()), useNavigate: () => navigate }));

function renderLogin(login = vi.fn()) {
  render(
    <AuthContext.Provider value={{ login }}>
      <MemoryRouter><Login /></MemoryRouter>
    </AuthContext.Provider>,
  );
  return login;
}

async function signIn() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/^Email/), 'admin@email.com');
  await user.type(screen.getByLabelText(/^Password/, { selector: 'input' }), 'secret-password');
  await user.click(screen.getByRole('button', { name: /sign in/i }));
}

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    window.scrollTo = vi.fn();
  });

  it('explains a firm administrator with no firm instead of bouncing back to sign-in', async () => {
    authService.login.mockResolvedValue({
      user: { id: '1', email: 'admin@email.com', role: 'ADMIN', firm: { id: null } },
      access: 'access', refresh: 'refresh', firm: { id: null, name: null },
    });
    const login = renderLogin();

    await signIn();

    expect(await screen.findByText(/not attached to a law firm/i)).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('opens the firm dashboard for a firm administrator with a firm', async () => {
    authService.login.mockResolvedValue({
      user: { id: '1', email: 'owner@firm.test', role: 'ADMIN', must_change_password: false },
      access: 'access', refresh: 'refresh', firm: { id: 'firm-1', name: 'Mwangi Advocates' },
    });
    const login = renderLogin();

    await signIn();

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/admin/dashboard', { replace: true }));
    expect(login).toHaveBeenCalled();
  });

  it.each(['ADMIN', 'STAFF', 'OFFICIAL_CLIENT'])('keeps %s on password setup until the new password is saved', async (role) => {
    authService.login.mockResolvedValue({
      user: { id: 'temp-user', email: 'admin@email.com', role, must_change_password: true },
      firm: { id: 'firm-1' },
      firm_role: role === 'STAFF' ? 'SECRETARY' : null,
      access: 'access', refresh: 'refresh',
    });
    authService.changeStaffPassword.mockResolvedValue({});
    authService.changePassword.mockResolvedValue({});
    const login = renderLogin();
    await signIn();

    const newPassword = await screen.findByPlaceholderText('New password');
    expect(login).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    await userEvent.type(newPassword, 'MyNewPassword2026!');
    await userEvent.type(screen.getByPlaceholderText('Confirm password'), 'MyNewPassword2026!');
    expect(login).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Update password' }));

    await vi.waitFor(() => expect(login).toHaveBeenCalledWith(expect.objectContaining({
      user: expect.objectContaining({ must_change_password: false }),
    }), false), { timeout: 4000 });
    expect(role === 'STAFF' ? authService.changeStaffPassword : authService.changePassword).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalled();
  }, 10000);
});
