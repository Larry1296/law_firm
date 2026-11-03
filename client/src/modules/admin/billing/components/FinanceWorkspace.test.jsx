import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import adminBillingService from '../services/adminBillingService';
import FinanceWorkspace from './FinanceWorkspace';
import { lockSession, unlockSession } from '@/core/auth/sessionLock';

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

  it('names only refused permissions, not a locked session', async () => {
    const forbidden = Object.assign(new Error('forbidden'), { response: { status: 403 } });
    const locked = Object.assign(new Error('Your session is locked. Unlock it to continue.'), { isSessionLocked: true });
    adminBillingService.getCreditNotes.mockRejectedValueOnce(forbidden);
    adminBillingService.getDisbursements.mockRejectedValueOnce(locked);
    render(<FinanceWorkspace />);
    const notice = await screen.findByRole('status');
    expect(notice.textContent).toContain('Credit notes');
    expect(notice.textContent).not.toContain('Disbursements');
  });

  it('reloads once a locked session is unlocked', async () => {
    render(<FinanceWorkspace />);
    await waitFor(() => expect(adminBillingService.getDisbursements).toHaveBeenCalled());
    const before = adminBillingService.getDisbursements.mock.calls.length;
    lockSession(); unlockSession();
    await waitFor(() => expect(adminBillingService.getDisbursements.mock.calls.length).toBeGreaterThan(before));
  });

  it('links the ticked disbursements to a draft fee note', async () => {
    adminBillingService.getInvoices.mockResolvedValue({ invoices: [{ id: 'i-1', invoice_number: 'INV-0001', client_name: 'Grace Mwende', case_number: 'MAT-2026-00001', matter: 'm-1', currency: 'KES', total_amount: '50000.00', amount_paid: '0', credited_amount: '0', balance: '50000.00', status: 'DRAFT' }] });
    adminBillingService.getDisbursements.mockResolvedValue({ disbursements: [
      { id: 'd-1', matter: 'm-1', approval_status: 'APPROVED', invoice: null, date_incurred: '2026-10-30', description: 'Court fee: Statement of claim', currency: 'KES', amount: '1650.00', case_number: 'MAT-2026-00001' },
      { id: 'd-2', matter: 'm-1', approval_status: 'APPROVED', invoice: null, date_incurred: '2026-10-30', description: 'Court fee: Reply', currency: 'KES', amount: '500.00', case_number: 'MAT-2026-00001' },
    ] });
    render(<FinanceWorkspace />);
    fireEvent.click(await screen.findByRole('button', { name: 'Link billables' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Statement of claim/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Reply/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(adminBillingService.addInvoiceBillables).toHaveBeenCalledWith('i-1', expect.objectContaining({ disbursement_ids: ['d-1', 'd-2'] })));
    adminBillingService.getInvoices.mockResolvedValue({});
    adminBillingService.getDisbursements.mockResolvedValue({});
  });

  it('fills a transfer to office from the fee note and the sole accounts', async () => {
    adminBillingService.getRegisters.mockResolvedValueOnce({ matters: [{ id: 'm-1', case_number: 'MAT-2026-00001', client_name: 'Grace Mwende', title: 'Unfair termination', client_money_held: '25000.00' }] });
    adminBillingService.getAccounts.mockResolvedValueOnce({ accounts: [
      { id: 'a-c', account_type: 'CLIENT', name: 'Client Account', account_reference: '0170291234567' },
      { id: 'a-o', account_type: 'OFFICE', name: 'Office Account', account_reference: '0170297654321' },
    ] });
    adminBillingService.getInvoices.mockResolvedValueOnce({ invoices: [{ id: 'i-1', invoice_number: 'INV-0001', client_name: 'Grace Mwende', case_number: 'MAT-2026-00001', matter: 'm-1', currency: 'KES', total_amount: '52150.00', amount_paid: '0', credited_amount: '0', balance: '52150.00', status: 'ISSUED', invoice_date: '2026-11-03', issued_at: '2026-11-03T04:34:00Z' }] });
    render(<FinanceWorkspace />);
    const invoice = await screen.findByLabelText('Issued invoice');
    fireEvent.change(invoice, { target: { value: 'i-1' } });
    expect(screen.getByLabelText('From client account')).toHaveProperty('value', 'a-c');
    expect(screen.getByLabelText('To office account')).toHaveProperty('value', 'a-o');
    expect(screen.getAllByLabelText('Amount').find((input) => input.value === '25000.00')).toBeTruthy();
    expect(screen.getByLabelText('Basis').value).toContain('INV-0001');
  });

  it('explains an empty list of accepted instructions', async () => {
    render(<FinanceWorkspace />);
    expect(await screen.findByText(/No accepted instructions are waiting/)).toBeTruthy();
  });

  it('takes amounts as typed text that the wheel and arrow keys cannot change', () => {
    render(<FinanceWorkspace />);
    const amount = screen.getByLabelText('Fee amount (KES, excl. VAT)');
    expect(amount.type).toBe('text');
    expect(amount.getAttribute('inputmode')).toBe('decimal');
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
