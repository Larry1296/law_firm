import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ResetPassword from '@/modules/auth/pages/ResetPassword';
import useAuth from '@/modules/auth/hook/useAuth';

vi.mock('@/modules/auth/hook/useAuth', () => ({ default: vi.fn() }));

const auth = { resetPassword: vi.fn(), logout: vi.fn(), loading: false, error: null };

const renderPage = () => render(
  <MemoryRouter initialEntries={['/reset-password?uid=abc&token=xyz']}>
    <Routes>
      <Route path='/reset-password' element={<ResetPassword />} />
      <Route path='/login' element={<p>Sign-in page</p>} />
    </Routes>
  </MemoryRouter>,
);

const choosePassword = async () => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/New password/), 'Own#Pass2026');
  await user.type(screen.getByLabelText(/Confirm password/), 'Own#Pass2026');
  await user.click(screen.getByRole('button', { name: 'Save password' }));
};

describe('ResetPassword', () => {
  beforeEach(() => {
    auth.resetPassword.mockReset().mockResolvedValue({});
    auth.logout.mockReset().mockResolvedValue({});
  });

  it('signs out whoever was signed in on this browser after the new password is set', async () => {
    vi.mocked(useAuth).mockReturnValue({ ...auth, isAuthenticated: true });
    renderPage();
    await choosePassword();

    expect(auth.resetPassword).toHaveBeenCalledWith(expect.objectContaining({ uid: 'abc', token: 'xyz' }));
    expect(auth.logout).toHaveBeenCalled();
  });

  it('goes to sign-in when nobody was signed in', async () => {
    vi.mocked(useAuth).mockReturnValue({ ...auth, isAuthenticated: false });
    renderPage();
    await choosePassword();

    expect(auth.logout).not.toHaveBeenCalled();
    expect(await screen.findByText('Sign-in page')).toBeInTheDocument();
  });
});
