import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import axios from '@/core/api/axios';
import Swal from '@/core/utils/themedSwal';
import ResendTemporaryPasswordButton from './ResendTemporaryPasswordButton';

vi.mock('@/core/api/axios', () => ({ default: { post: vi.fn() } }));
vi.mock('@/core/utils/themedSwal', () => ({ default: { fire: vi.fn() } }));
beforeEach(() => { vi.clearAllMocks(); axios.post.mockResolvedValue({ data: {
  detail: 'Password ready', email: 'staff@example.test', temp_password: 'Demo-temp-2026', email_sent: false,
} }); });
function show(props) {
  render(<QueryClientProvider client={new QueryClient()}><ResendTemporaryPasswordButton {...props} /></QueryClientProvider>);
}
it.each([{ email: 'staff@example.test' }, { clientId: 'client-123' }])('sends the selected account after confirmation: %o', async (props) => {
  Swal.fire.mockResolvedValue({ isConfirmed: true });
  show(props);
  await userEvent.click(screen.getByRole('button', { name: 'Resend temporary password' }));
  await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/admin/staff/temporary-password/',
    props.clientId ? { client_id: props.clientId } : { email: props.email }));
  await waitFor(() => expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ title: 'Temporary password ready' })));
  const { html } = Swal.fire.mock.lastCall[0];
  expect(html.querySelector('input').value).toBe('Demo-temp-2026');
  expect(html.querySelector('input').readOnly).toBe(true);
  expect(html.querySelector('button').textContent).toBe('Copy password');
});
it('keeps the password when confirmation is cancelled', async () => {
  Swal.fire.mockResolvedValue({ isConfirmed: false });
  show({ email: 'staff@example.test' });
  await userEvent.click(screen.getByRole('button', { name: 'Resend temporary password' }));
  expect(axios.post).not.toHaveBeenCalled();
});
