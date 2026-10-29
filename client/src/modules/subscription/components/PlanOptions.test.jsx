import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import PlanOptions from './PlanOptions';

afterEach(cleanup);

const plans = [
  {
    code: 'SOLO', name: 'Wakili Solo', tagline: 'For an advocate practising on their own account.',
    monthly_price: '1500.00', annual_price: '15000.00', pricing_basis: 'FIRM',
    limits: { advocates: 1, branches: 1 },
    features: [{ code: 'CLIENT_PORTAL', label: 'Client portal', included: false }],
  },
  {
    code: 'ENTERPRISE', name: 'Enterprise', tagline: 'No limits.',
    monthly_price: '60000.00', annual_price: '600000.00', pricing_basis: 'FIRM',
    limits: { advocates: null, branches: null },
    features: [{ code: 'CLIENT_PORTAL', label: 'Client portal', included: true }],
  },
];

describe('PlanOptions', () => {
  it('shows each plan with its limits and what it includes or leaves out', () => {
    render(<PlanOptions plans={plans} value='SOLO' onChange={vi.fn()} includedInEveryPlan={['Conflict checks']} />);
    const solo = screen.getByRole('radio', { name: /Wakili Solo/ }).closest('label');
    expect(within(solo).getByText(/Not included:/)).toBeInTheDocument();
    expect(within(solo).getByText('Advocates:').nextSibling).toHaveTextContent('1');
    const enterprise = screen.getByRole('radio', { name: /Enterprise/ }).closest('label');
    expect(within(enterprise).getByText(/Included:/)).toBeInTheDocument();
    expect(within(enterprise).getByText('Advocates:').nextSibling).toHaveTextContent('Unlimited');
    expect(screen.getByText('✓ Conflict checks')).toBeInTheDocument();
  });

  it('reports the chosen plan, and offers "Not sure yet" when asked', () => {
    const onChange = vi.fn();
    render(<PlanOptions plans={plans} value='SOLO' onChange={onChange} noneLabel='Not sure yet' />);
    fireEvent.click(screen.getByRole('radio', { name: /Enterprise/ }));
    expect(onChange).toHaveBeenCalledWith('ENTERPRISE');
    fireEvent.click(screen.getByRole('radio', { name: /Not sure yet/ }));
    expect(onChange).toHaveBeenCalledWith('');
  });
});
