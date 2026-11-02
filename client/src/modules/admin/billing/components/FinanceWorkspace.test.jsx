import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import adminBillingService from '../services/adminBillingService';
import FinanceWorkspace from './FinanceWorkspace';

vi.mock('@/core/hooks/useAuth', () => ({ default: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/core/utils/themedSwal', () => ({ default: { fire: vi.fn() } }));
vi.mock('./FinanceClosingReviews', () => ({ default: () => null }));
vi.mock('../services/adminBillingService', () => ({
  default: new Proxy({}, {
    get: (target, name) => {
      if (!target[name]) target[name] = vi.fn().mockResolvedValue({});
      return target[name];
    },
  }),
}));

describe('finance workspace forms', () => {
  it('empties a form once its record is saved', async () => {
    render(<FinanceWorkspace />);
    const name = screen.getByLabelText('Account name');
    fireEvent.change(name, { target: { value: 'Mutiso Advocates Office Account' } });
    fireEvent.change(screen.getByLabelText('Account number'), { target: { value: '0170297654321' } });
    fireEvent.submit(name.closest('form'));
    await waitFor(() => expect(adminBillingService.createAccount).toHaveBeenCalledWith(expect.objectContaining({ account_reference: '0170297654321' })));
    await waitFor(() => expect(name).toHaveProperty('value', ''));
    expect(screen.getByLabelText('Account number')).toHaveProperty('value', '');
  });

  it('keeps what was typed when the save is refused', async () => {
    adminBillingService.createAccount.mockRejectedValueOnce(new Error('refused'));
    render(<FinanceWorkspace />);
    const name = screen.getByLabelText('Account name');
    fireEvent.change(name, { target: { value: 'Duplicate account' } });
    fireEvent.submit(name.closest('form'));
    await waitFor(() => expect(adminBillingService.createAccount).toHaveBeenCalled());
    expect(name).toHaveProperty('value', 'Duplicate account');
  });
});
