import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AuthContext from '@/core/store/AuthContext';
import authService from '@/modules/auth/service/authService';
import Login from './Login';

vi.mock('@/modules/auth/service/authService', () => ({ default: { login: vi.fn() } }));

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
});
