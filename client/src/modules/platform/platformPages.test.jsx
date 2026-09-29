import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import AuthContext from '@/core/store/AuthContext';
import ThemeContext from '@/core/store/ThemeContext';
import platformService from '@/modules/platform/services/platformService';
import PlatformFirmDetailPage from '@/modules/platform/pages/PlatformFirmDetailPage';
import PlatformOverviewPage from '@/modules/platform/pages/PlatformOverviewPage';
import PlatformPlansPage from '@/modules/platform/pages/PlatformPlansPage';
import PlatformRegisterFirmPage from '@/modules/platform/pages/PlatformRegisterFirmPage';

vi.mock('@/modules/platform/services/platformService', () => ({
  default: {
    getOverview: vi.fn(),
    getMeta: vi.fn(),
    getFirm: vi.fn(),
    getPlans: vi.fn(),
    registerFirm: vi.fn(),
    uploadLogo: vi.fn(),
    getOnboardingRequest: vi.fn(),
  },
}));

const plan = (code, name, price, limits, included) => ({
  code,
  name,
  tagline: `${name} tagline`,
  monthly_price: price,
  annual_price: String(Number(price) * 10),
  limits,
  features: [
    { code: 'CLIENT_PORTAL', label: 'Client portal', included: true },
    { code: 'AI_CASE_ANALYSIS', label: 'AI case analysis', included },
  ],
});

const BASIC = plan('BASIC', 'Basic', '2500.00', { advocates: 3, support_staff: 5, active_matters: 150, branches: 1 }, false);
const PRO = plan('PRO', 'Pro', '5000.00', { advocates: null, support_staff: null, active_matters: null, branches: null }, true);

const META = {
  plans: [BASIC, PRO],
  business_structures: [{ value: 'PARTNERSHIP', label: 'Partnership' }, { value: 'LLP', label: 'Limited liability partnership' }],
  counties: ['Mombasa', 'Nairobi'],
  practice_areas: ['Civil litigation', 'Land and environment'],
  billing_cycles: [{ value: 'MONTHLY', label: 'Monthly' }, { value: 'ANNUAL', label: 'Annual' }],
  subscription_statuses: [{ value: 'TRIALING', label: 'Trial' }, { value: 'ACTIVE', label: 'Active' }],
  onboarding_starts: [{ value: 'TRIAL', label: 'Free trial' }, { value: 'PAID', label: 'Paid (M-Pesa payment received)' }],
  default_trial_days: 14,
  vat_rate: '16.00',
};

const FIRM = {
  id: 'firm-1',
  name: 'Achieng & Mwangi Advocates',
  business_structure: 'PARTNERSHIP',
  business_structure_label: 'Partnership',
  registration_number: 'BN-1',
  kra_pin: 'P051234567X',
  email: 'info@am.test',
  phone_number: '+254720000001',
  website: '',
  physical_address: 'Mama Ngina Street',
  postal_address: '',
  county: 'Nairobi',
  town: 'Nairobi',
  description: '',
  logo_url: null,
  is_active: true,
  created_at: '2026-09-01T08:00:00Z',
  owner: {
    id: 'u1', full_name: 'Grace Achieng', email: 'grace@am.test', phone_number: '+254720000002',
    national_id_number: '27000002', admission_number: 'P.105/4521/12', job_title: 'Managing Partner',
    is_active: true, has_signed_in: false, last_login: null,
  },
  head_office: { name: 'Head Office' },
  practice_areas: ['Land and environment'],
  settings: { opening_time: '08:00:00', closing_time: '17:00:00', work_on_saturday: false },
  subscription: {
    plan: BASIC, status: 'TRIALING', effective_status: 'TRIALING', billing_cycle: 'MONTHLY',
    trial_ends_at: '2026-10-12T08:00:00Z', current_period_end: null, grace_period_days: 7, notes: '',
  },
  invoices: [],
  activity: [{ id: 'a1', action_label: 'Firm registered', summary: 'Registered Achieng & Mwangi Advocates.', actor: 'Ops', created_at: '2026-09-01T08:00:00Z' }],
};

function renderPage(element, { path = '/', route = '/' } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeContext.Provider value={{ theme: 'light', toggleTheme: () => {} }}>
        <AuthContext.Provider value={{ user: { id: 'ops', role: 'PLATFORM_ADMIN' } }}>
          <MemoryRouter initialEntries={[route]}>
            <Routes>
              <Route path={path} element={element} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </ThemeContext.Provider>
    </QueryClientProvider>,
  );
}

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  platformService.getMeta.mockResolvedValue(META);
});

describe('platform console', () => {
  it('shows the platform overview with alerts, metrics and activity', async () => {
    platformService.getOverview.mockResolvedValue({
      firms: { total: 3, active: 2, suspended: 1, new_this_month: 1 },
      subscriptions: {
        by_status: [{ status: 'TRIALING', count: 1 }, { status: 'ACTIVE', count: 2 }],
        by_plan: [{ plan: 'Pro', count: 2 }, { plan: 'Basic', count: 1 }],
        monthly_recurring_revenue: '12500.00',
      },
      owners: { total: 3, active: 3, signed_in_last_30_days: 2 },
      new_firms_by_month: [{ month: '2026-09', label: 'Sep 2026', count: 1 }],
      pending_payments: 2,
      new_onboarding_requests: 1,
      trials_ending_soon: [],
      recent_firms: [],
      recent_activity: [{ id: 'a', summary: 'Registered Kilonzo Advocates on the Pro plan.', actor: 'Ops', created_at: '2026-09-02T08:00:00Z' }],
    });
    renderPage(<PlatformOverviewPage />);

    expect(await screen.findByRole('heading', { name: 'Platform overview' })).toBeInTheDocument();
    expect(screen.getByText(/M-Pesa payments waiting/)).toBeInTheDocument();
    expect(screen.getByText(/12,500/)).toBeInTheDocument();
    expect(screen.getByText('Registered Kilonzo Advocates on the Pro plan.')).toBeInTheDocument();
  });

  it('walks through registering a firm, validating each step, and shows the owner link', async () => {
    const user = userEvent.setup();
    platformService.registerFirm.mockResolvedValue({
      firm: FIRM,
      owner_invitation_url: 'http://localhost:5173/reset-password?uid=abc&token=def',
    });
    renderPage(<PlatformRegisterFirmPage />);

    await screen.findByRole('option', { name: 'Partnership' });
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getAllByText('Required.').length).toBeGreaterThan(0);

    await user.type(screen.getByLabelText(/Registered firm name/), 'Achieng & Mwangi Advocates');
    await user.type(screen.getByLabelText(/BRS registration number/), 'BN-1');
    await user.type(screen.getByLabelText(/KRA PIN/), 'bad');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText(/Enter a valid KRA PIN/)).toBeInTheDocument();
    await user.clear(screen.getByLabelText(/KRA PIN/));
    await user.type(screen.getByLabelText(/KRA PIN/), 'p051234567x');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await user.type(screen.getByLabelText(/Firm email/), 'info@am.test');
    await user.type(screen.getByLabelText(/Firm phone/), '+254720000001');
    await user.type(screen.getByLabelText(/Physical address/), 'Mama Ngina Street');
    await user.selectOptions(screen.getByLabelText(/County/), 'Nairobi');
    await user.type(screen.getByLabelText(/^Town/), 'Nairobi');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Add at least one practice area.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Land and environment' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await user.type(screen.getByLabelText(/First name/), 'Grace');
    await user.type(screen.getByLabelText(/Last name/), 'Achieng');
    await user.type(screen.getByLabelText(/Email \(used to sign in\)/), 'grace@am.test');
    await user.type(screen.getByLabelText(/Phone number/), '+254720000002');
    await user.type(screen.getByLabelText(/National ID number/), '27000002');
    await user.type(screen.getByLabelText(/Advocate admission number/), 'P.105/4521/12');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await user.click(screen.getByText('Basic'));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { name: 'Review' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create firm and invite owner' }));

    await waitFor(() => expect(platformService.registerFirm).toHaveBeenCalled());
    const payload = platformService.registerFirm.mock.calls[0][0];
    expect(payload.firm.kra_pin).toBe('P051234567X');
    expect(payload.practice_areas).toEqual(['Land and environment']);
    expect(payload.subscription).toMatchObject({ plan_code: 'BASIC', start: 'TRIAL', trial_days: 14 });
    expect(await screen.findByRole('heading', { name: /is registered/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Owner password link')).toHaveValue('http://localhost:5173/reset-password?uid=abc&token=def');
  }, 20000);

  it('sends the user back to the step with the field the server rejected', async () => {
    const user = userEvent.setup();
    platformService.registerFirm.mockRejectedValue({
      response: { data: { message: 'Owner.Email: An account with this email already exists.', errors: { 'owner.email': 'An account with this email already exists.' } } },
    });
    renderPage(<PlatformRegisterFirmPage />);
    await screen.findByRole('option', { name: 'Partnership' });
    const fill = async (label, value) => user.type(screen.getByLabelText(label), value);
    await fill(/Registered firm name/, 'A');
    await fill(/BRS registration number/, 'B');
    await fill(/KRA PIN/, 'P051234567X');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await fill(/Firm email/, 'a@b.co');
    await fill(/Firm phone/, '1');
    await fill(/Physical address/, 'x');
    await user.selectOptions(screen.getByLabelText(/County/), 'Nairobi');
    await fill(/^Town/, 'x');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Civil litigation' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    for (const [label, value] of [[/First name/, 'G'], [/Last name/, 'A'], [/Email \(used/, 'g@a.co'], [/Phone number/, '1'], [/National ID/, '1'], [/admission number/, '1']]) {
      await fill(label, value);
    }
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Create firm and invite owner' }));

    expect(await screen.findByRole('heading', { name: 'Firm owner' })).toBeInTheDocument();
    const emailField = screen.getByLabelText(/Email \(used to sign in\)/).closest('label');
    expect(within(emailField).getByRole('alert')).toHaveTextContent('An account with this email already exists.');
  }, 20000);

  it('shows a firm with its owner, subscription usage and actions', async () => {
    platformService.getFirm.mockResolvedValue(FIRM);
    renderPage(<PlatformFirmDetailPage />, { path: '/platform/firms/:id', route: '/platform/firms/firm-1' });

    expect(await screen.findByRole('heading', { name: 'Achieng & Mwangi Advocates' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Suspend firm/ })).toBeInTheDocument();
    expect(screen.getByText('Has not signed in yet')).toBeInTheDocument();
    expect(screen.queryByText('1 / 3')).not.toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Firm staff' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update subscription' })).toBeDisabled();
  });

  it('lists plans with their prices, limits and features', async () => {
    platformService.getPlans.mockResolvedValue({
      plans: [
        { id: 'p1', subscriber_count: 1, is_active: true, is_public: true, sort_order: 10, code: 'BASIC', name: 'Basic', tagline: '', monthly_price: '2500.00', annual_price: '25000.00', max_advocates: 3, max_support_staff: 5, max_active_matters: 150, max_branches: 1, features: ['CLIENT_PORTAL'] },
      ],
      features: [{ code: 'CLIENT_PORTAL', label: 'Client portal' }, { code: 'AI_CASE_ANALYSIS', label: 'AI case analysis' }],
    });
    const user = userEvent.setup();
    renderPage(<PlatformPlansPage />);

    expect(await screen.findByText(/^Ksh.2,500$/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit Basic' }));
    expect(screen.getByRole('heading', { name: 'Edit Basic' })).toBeInTheDocument();
    expect(screen.getByLabelText('Monthly price (KES, excl. VAT) *')).toHaveValue(2500);
  });
});
