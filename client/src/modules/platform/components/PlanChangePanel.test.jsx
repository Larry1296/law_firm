import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import PlanChangePanel from './PlanChangePanel';
import platformService from '@/modules/platform/services/platformService';

vi.mock('@/modules/platform/services/platformService', () => ({ default: { getPlanChange: vi.fn(), issuePlanChange: vi.fn() } }));
afterEach(cleanup);

const plan = (code, name) => ({ code, name, limits: {}, features: [] });
const quote = (overrides) => ({
  list_price: '95000.00', unused_value: '7500.00', credit_balance_used: '0.00', credit_applied: '7500.00',
  credit_carried_forward: '0.00', amount_excl_vat: '87500.00', vat_rate: '16.00', vat_amount: '14000.00',
  total: '101500.00', period_start: '2026-10-29T00:00:00Z', period_end: '2027-10-29T00:00:00Z', ...overrides,
});
const data = {
  current: {
    plan: plan('SOLO', 'Wakili Solo'), billing_cycle: 'ANNUAL', effective_status: 'ACTIVE', period_start: '2026-04-30T00:00:00Z',
    period_end: '2027-04-30T00:00:00Z', days_left: 183, unused_value: '7500.00', credit_balance: '0.00',
  },
  open_invoice: null,
  blockers: [],
  options: [
    { plan: plan('PRO', 'Pro'), billing_cycle: 'ANNUAL', kind: 'UPGRADE', is_current: false, eligible: true, blockers: [], quote: quote() },
    { plan: plan('BASIC', 'Basic'), billing_cycle: 'ANNUAL', kind: 'DOWNGRADE', is_current: false, eligible: false,
      blockers: ['Advocates: the firm has more than Basic allows (3). Its owner must reduce this first.'], quote: quote({ total: '20300.00' }) },
    { plan: plan('PRO', 'Pro'), billing_cycle: 'MONTHLY', kind: 'UPGRADE', is_current: false, eligible: true, blockers: [], quote: quote({ total: '11020.00' }) },
  ],
};

const renderPanel = () => render(
  <QueryClientProvider client={new QueryClient()}><PlanChangePanel firmId='f1' /></QueryClientProvider>,
);

describe('PlanChangePanel', () => {
  it('prices each option for the firm’s billing cycle and explains what blocks one', async () => {
    platformService.getPlanChange.mockResolvedValue(data);
    renderPanel();
    expect(await screen.findByText(/183 days left/)).toBeInTheDocument();
    expect(screen.getByText('Upgrade')).toBeInTheDocument();
    expect(screen.getAllByText('Less unused paid time')).toHaveLength(2);
    expect(screen.getByText(/more than Basic allows/)).toBeInTheDocument();
    const [pro, basic] = screen.getAllByRole('button', { name: 'Issue invoice' });
    expect(pro).toBeEnabled();
    expect(basic).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Monthly' }));
    expect(screen.getAllByRole('button', { name: 'Issue invoice' })).toHaveLength(1);
  });

  it('issues the chosen plan change and reports the invoice', async () => {
    platformService.getPlanChange.mockResolvedValue(data);
    platformService.issuePlanChange.mockResolvedValue({ ...data, invoice: { number: 'SUB-2026-00001', total: '101500.00', plan_name: 'Pro', status: 'ISSUED' } });
    renderPanel();
    fireEvent.click((await screen.findAllByRole('button', { name: 'Issue invoice' }))[0]);
    expect(await screen.findByText(/SUB-2026-00001 issued/)).toBeInTheDocument();
    expect(platformService.issuePlanChange).toHaveBeenCalledWith('f1', { plan_code: 'PRO', billing_cycle: 'ANNUAL' });
  });
});
