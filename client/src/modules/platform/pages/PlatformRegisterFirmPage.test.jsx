import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import platformService from '@/modules/platform/services/platformService';
import PlatformRegisterFirmPage from '@/modules/platform/pages/PlatformRegisterFirmPage';

vi.mock('@/modules/platform/services/platformService', () => ({
  default: {
    getMeta: vi.fn(), registerFirm: vi.fn(), getOnboardingRequest: vi.fn(), getOnboardingRequestLogo: vi.fn(), uploadLogo: vi.fn(),
  },
}));

const META = {
  business_structures: [{ value: 'PARTNERSHIP', label: 'Partnership' }],
  counties: ['Nairobi'],
  practice_areas: ['Conveyancing'],
  billing_cycles: [{ value: 'MONTHLY', label: 'Monthly' }],
  onboarding_starts: [{ value: 'TRIAL', label: 'Free trial' }],
  plans: [{ code: 'PRO', name: 'Pro', monthly_price: '5000', annual_price: '50000', features: [], limits: {} }],
  vat_rate: 16,
};

const SUMMARY = 'Owner.Email: An account with this email already exists.';

function renderPage(entry = '/platform/firms/register') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}><PlatformRegisterFirmPage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

async function fillToReview(user) {
  const type = (label, value) => user.type(screen.getByLabelText(label, { exact: false }), value);
  const next = () => user.click(screen.getByRole('button', { name: 'Continue' }));

  await type('Registered firm name', 'Achieng & Mwangi Advocates');
  await type('BRS registration number', 'BN-2026-0042');
  await type('KRA PIN', 'P051234567X');
  await next();

  await type('Firm email', 'info@am.co.ke');
  await type('Firm phone', '+254700000000');
  await type('Physical address', 'Upper Hill');
  await user.selectOptions(await screen.findByLabelText('County', { exact: false }), 'Nairobi');
  await type('Town', 'Nairobi');
  await next();

  await user.click(screen.getByRole('button', { name: /Conveyancing/ }));
  await next();

  await type('First name', 'Grace');
  await type('Last name', 'Achieng');
  await type('Email (used to sign in)', 'taken@am.co.ke');
  await type('Phone number', '+254711111111');
  await type('National ID number', '12345678');
  await type('Advocate admission number', 'P.105/1234/15');
  await next();
  await next();
}

describe('PlatformRegisterFirmPage', () => {
  beforeEach(() => {
    vi.mocked(platformService.getMeta).mockResolvedValue(META);
    vi.mocked(platformService.registerFirm).mockRejectedValue({
      response: { data: { message: SUMMARY, errors: { 'owner.email': 'An account with this email already exists.' } } },
    });
  });

  it('hides the rejection summary once the flagged field is corrected', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByLabelText('Business structure', { exact: false });

    await fillToReview(user);
    await user.click(screen.getByRole('button', { name: 'Create firm and invite owner' }));

    // Sent back to the owner step, with the field and the summary both flagged.
    const email = await screen.findByLabelText('Email (used to sign in)', { exact: false });
    expect(screen.getByText('An account with this email already exists.')).toBeInTheDocument();
    expect(screen.getByText(SUMMARY)).toBeInTheDocument();

    await user.clear(email);
    await user.type(email, 'grace@am.co.ke');

    expect(screen.queryByText('An account with this email already exists.')).not.toBeInTheDocument();
    expect(screen.queryByText(SUMMARY)).not.toBeInTheDocument();

    // And it stays gone on the following steps.
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.queryByText(SUMMARY)).not.toBeInTheDocument();
  }, 20000); // Types through all six steps; slow when the whole suite runs in parallel.

  it('opens a full request on the review, ready to confirm and register as sent', async () => {
    vi.mocked(platformService.getOnboardingRequest).mockResolvedValue({
      id: 'req-1', firm_name: 'Achieng & Mwangi Advocates', contact_name: 'Grace Achieng', email: 'grace@am.co.ke',
      phone_number: '+254711111111', county: 'Nairobi', preferred_plan: 'PRO', has_logo: false,
      details: {
        firm: {
          name: 'Achieng & Mwangi Advocates', business_structure: 'PARTNERSHIP', registration_number: 'BN-2026-0042',
          kra_pin: 'P051234567X', email: 'info@am.co.ke', phone_number: '+254700000000', physical_address: 'Upper Hill',
          county: 'Nairobi', town: 'Nairobi', description: '', website: '', postal_address: '',
        },
        owner: {
          first_name: 'Grace', last_name: 'Achieng', email: 'grace@am.co.ke', phone_number: '+254711111111',
          national_id_number: '12345678', admission_number: 'P.105/1234/15', job_title: '',
        },
        settings: { opening_time: '08:00:00', closing_time: '17:00:00', work_on_saturday: false },
        practice_areas: ['Conveyancing'],
      },
    });
    vi.mocked(platformService.registerFirm).mockResolvedValue({
      firm: { id: 'f1', name: 'Achieng & Mwangi Advocates', owner: { full_name: 'Grace Achieng', email: 'grace@am.co.ke' } },
      owner_invitation_url: '',
    });
    const user = userEvent.setup();
    renderPage('/platform/firms/register?request=req-1');

    expect(await screen.findByText('BN-2026-0042')).toBeInTheDocument();
    expect(screen.getByText('P.105/1234/15')).toBeInTheDocument();
    expect(screen.getByText('08:00–17:00')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create firm and invite owner' }));

    const [payload] = vi.mocked(platformService.registerFirm).mock.lastCall;
    expect(payload.onboarding_request_id).toBe('req-1');
    expect(payload.firm.kra_pin).toBe('P051234567X');
    expect(payload.owner.job_title).toBe('Managing Partner');
    expect(payload.settings.opening_time).toBe('08:00');
    expect(payload.practice_areas).toEqual(['Conveyancing']);
  });
});
