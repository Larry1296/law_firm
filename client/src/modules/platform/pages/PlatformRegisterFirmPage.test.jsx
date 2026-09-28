import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import platformService from '@/modules/platform/services/platformService';
import PlatformRegisterFirmPage from '@/modules/platform/pages/PlatformRegisterFirmPage';

vi.mock('@/modules/platform/services/platformService', () => ({
  default: { getMeta: vi.fn(), registerFirm: vi.fn(), getOnboardingRequest: vi.fn(), uploadLogo: vi.fn() },
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

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><PlatformRegisterFirmPage /></MemoryRouter>
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
});
