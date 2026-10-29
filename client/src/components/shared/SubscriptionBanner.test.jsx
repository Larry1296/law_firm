import {afterEach, expect, it, vi} from 'vitest';
import {cleanup, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import SubscriptionBanner from './SubscriptionBanner';
import useSubscription from '@/modules/subscription/hooks/useSubscription';
vi.mock('@/modules/subscription/hooks/useSubscription', () => ({default: vi.fn()}));
afterEach(cleanup);

const renderWith = (subscription) => {
  useSubscription.mockReturnValue({subscription});
  return render(<MemoryRouter><SubscriptionBanner /></MemoryRouter>);
};
const inDays = (days) => new Date(Date.now() + days * 86400000).toISOString();

it('tells a lapsed firm that it is read-only', () => {
  renderWith({effective_status: 'EXPIRED', plan: {name: 'Firm'}});
  expect(screen.getByRole('status')).toHaveTextContent('changes are paused until you renew');
  expect(screen.getByRole('link', {name: 'Manage subscription'})).toHaveAttribute('href', '/admin/subscription');
});

it('warns only near the end of a trial', () => {
  renderWith({effective_status: 'TRIALING', trial_ends_at: inDays(3), plan: {name: 'Chambers'}});
  expect(screen.getByRole('status')).toHaveTextContent('Chambers plan ends in 3 days');
  cleanup();
  renderWith({effective_status: 'TRIALING', trial_ends_at: inDays(12), plan: {name: 'Chambers'}});
  expect(screen.queryByRole('status')).toBeNull();
});

it('shows nothing for an active subscription', () => {
  renderWith({effective_status: 'ACTIVE', plan: {name: 'Solo'}});
  expect(screen.queryByRole('status')).toBeNull();
});

it('reminds the owner in the last two weeks of a paid period', () => {
  renderWith({effective_status: 'ACTIVE', current_period_end: inDays(7), plan: {name: 'Wakili Solo'}});
  expect(screen.getByRole('status')).toHaveTextContent('Wakili Solo subscription is paid until');
  cleanup();
  renderWith({effective_status: 'ACTIVE', current_period_end: inDays(60), plan: {name: 'Wakili Solo'}});
  expect(screen.queryByRole('status')).toBeNull();
});

it('tells staff who renews a lapsed firm, without a link to billing', () => {
  useSubscription.mockReturnValue({subscription: {effective_status: 'EXPIRED', owner_name: 'Daniel Mutiso', plan: {name: 'Wakili Solo'}}});
  render(<MemoryRouter><SubscriptionBanner audience='staff' /></MemoryRouter>);
  expect(screen.getByRole('status')).toHaveTextContent('changes are paused until Daniel Mutiso renews it');
  expect(screen.queryByRole('link')).toBeNull();
  cleanup();
  useSubscription.mockReturnValue({subscription: {effective_status: 'ACTIVE', current_period_end: inDays(3), plan: {name: 'Wakili Solo'}}});
  render(<MemoryRouter><SubscriptionBanner audience='staff' /></MemoryRouter>);
  expect(screen.queryByRole('status')).toBeNull();
});
