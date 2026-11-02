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

  it('offers no second reversal of an entry already reversed', async () => {
    adminBillingService.getRegisters.mockResolvedValueOnce({ matters: [{ id: 'm-1', case_number: 'MAT-2026-00001', client_name: 'Grace Mwende', title: 'Unfair termination' }] });
    adminBillingService.getMatterLedger.mockResolvedValueOnce({ ledger: { currency: 'KES', cleared_balance: '25000.00', transactions: [
      { id: 't-1', posted_at: '2026-11-03T01:13:11Z', transaction_type: 'CLIENT_RECEIPT', direction: 'CREDIT', amount: '24999.75', narrative: 'RCT-0001', original_transaction: null },
      { id: 't-2', posted_at: '2026-11-03T01:18:14Z', transaction_type: 'REVERSAL', direction: 'DEBIT', amount: '24999.75', narrative: 'Reversal', original_transaction: 't-1' },
      { id: 't-3', posted_at: '2026-11-03T01:30:00Z', transaction_type: 'CLIENT_RECEIPT', direction: 'CREDIT', amount: '25000.00', narrative: 'RCT-0002', original_transaction: null },
    ] } });
    render(<FinanceWorkspace />);
    const matter = screen.getAllByLabelText('Matter').at(-1);
    await waitFor(() => expect(matter.querySelectorAll('option').length).toBeGreaterThan(1));
    fireEvent.change(matter, { target: { value: 'm-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Load ledger' }));
    await screen.findByText('RCT-0002');
    expect(screen.getAllByRole('button', { name: 'Reverse' })).toHaveLength(1);
  });
});
