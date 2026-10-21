import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import platformService from '@/modules/platform/services/platformService';
import subscriptionService from '@/modules/subscription/services/subscriptionService';
import RegisterFirmPage from '@/modules/public/RegisterFirmPage';

vi.mock('@/modules/platform/services/platformService', () => ({
  default: { getOnboardingRequestChoices: vi.fn(), submitOnboardingRequest: vi.fn() },
}));
vi.mock('@/modules/subscription/services/subscriptionService', () => ({ default: { getPlans: vi.fn() } }));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><RegisterFirmPage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('RegisterFirmPage', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    vi.mocked(subscriptionService.getPlans).mockResolvedValue({ firm_signup_enabled: false, plans: [] });
    vi.mocked(platformService.getOnboardingRequestChoices).mockResolvedValue({
      business_structures: [{ value: 'PARTNERSHIP', label: 'Partnership' }, { value: 'LLP', label: 'Limited liability partnership' }],
      counties: ['Nairobi'],
      practice_areas: ['Conveyancing', 'Family law'],
    });
    vi.mocked(platformService.submitOnboardingRequest).mockResolvedValue({});
  });

  it('sends the full registration so the platform only has to confirm it', async () => {
    const user = userEvent.setup();
    renderPage();
    const type = (label, value) => user.type(screen.getByLabelText(label, { exact: false }), value);

    await type('Registered firm name', 'Achieng & Mwangi Advocates');
    await user.selectOptions(screen.getByLabelText('Business structure', { exact: false }), 'LLP');
    await type('BRS registration number', 'BN-2026-0042');
    await user.click(screen.getByLabelText('KRA PIN', { exact: false }));
    await user.paste(' p051234567x ');
    expect(screen.getByLabelText('KRA PIN', { exact: false })).toHaveValue('P051234567X');
    expect(screen.getByLabelText('KRA PIN', { exact: false })).toBeValid();
    await type('Firm email', 'info@am.co.ke');
    await type('Firm phone', '+254700000000');
    await type('Physical address', 'Upper Hill');
    await user.selectOptions(await screen.findByLabelText('County', { exact: false }), 'Nairobi');
    await type('Town', 'Nairobi');
    await user.click(await screen.findByRole('button', { name: 'Family law' }));
    await type('First name', 'Grace');
    await type('Last name', 'Achieng');
    await type('Email (used to sign in)', 'grace@am.co.ke');
    await type('Mobile number', '+254711111111');
    await type('National ID number', '12345678');
    await type('Admission number', 'P.105/1234/15');
    await user.click(screen.getByRole('button', { name: 'Request registration' }));

    expect(await screen.findByText('Thank you, we have your request')).toBeInTheDocument();
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 });
    const [payload, logo] = vi.mocked(platformService.submitOnboardingRequest).mock.lastCall;
    expect(logo).toBeNull();
    expect(payload.firm).toMatchObject({ business_structure: 'LLP', kra_pin: 'P051234567X', county: 'Nairobi' });
    expect(payload.owner).toMatchObject({ first_name: 'Grace', admission_number: 'P.105/1234/15', job_title: 'Managing Partner' });
    expect(payload.settings).toEqual({ opening_time: '08:00', closing_time: '17:00', work_on_saturday: false, queue_reception_mode: 'SHARED' });
    expect(payload.practice_areas).toEqual(['Family law']);
  }, 20000);

  it('still rejects malformed KRA PINs before submission', async () => {
    const user = userEvent.setup();
    renderPage();
    const pin = screen.getByLabelText('KRA PIN', { exact: false });
    await user.click(pin);
    await user.paste(' P05123456X ');
    expect(pin).toHaveValue('P05123456X');
    expect(pin.validity.patternMismatch).toBe(true);
  });

  it('marks the exact fields the platform rejected', async () => {
    vi.mocked(platformService.submitOnboardingRequest).mockRejectedValue({
      response: { data: { errors: { 'firm.registration_number': ['A firm with this registration number is already registered.'] } } },
    });
    const user = userEvent.setup();
    const { container } = renderPage();
    await screen.findByRole('button', { name: 'Family law' });
    container.querySelector('form').noValidate = true;
    await user.click(screen.getByRole('button', { name: 'Request registration' }));

    expect(await screen.findByText('A firm with this registration number is already registered.')).toBeInTheDocument();
    expect(screen.getByText('Some details need correcting. They are marked above.')).toBeInTheDocument();
  });
});
