import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PrivacyNoticeSetupBanner from './PrivacyNoticeSetupBanner';
import { intakePrivacyService as service } from '../services/intakePrivacyService';
import { confirmAction } from '@/core/utils/themedSwal';

vi.mock('@/core/utils/themedSwal', () => ({ confirmAction: vi.fn() }));
vi.mock('../services/intakePrivacyService', () => ({ intakePrivacyService: { list: vi.fn(), create: vi.fn(), activate: vi.fn() } }));

const notice = { policy_version: '2026.1', lawful_basis: 'MULTIPLE_APPLICABLE_BASES', effective_date: '2026-11-12', notice_text: 'Mutiso Advocates collects and uses your personal data.' };
const listing = (results = []) => ({ results, lawful_bases: [{ value: 'MULTIPLE_APPLICABLE_BASES', label: 'Multiple applicable lawful bases' }], standard_notice: notice });
let queryClient;
const show = ({ active } = { active: false }) => render(
  <QueryClientProvider client={queryClient}>
    <MemoryRouter><PrivacyNoticeSetupBanner active={active} /></MemoryRouter>
  </QueryClientProvider>,
);

afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  confirmAction.mockResolvedValue(true);
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe('Privacy notice setup banner', () => {
  it('loads the standard notice only when opened, approves it, and refreshes the dashboard', async () => {
    service.list.mockResolvedValue(listing());
    service.create.mockResolvedValue({ id: 7, ...notice, status: 'DRAFT' });
    service.activate.mockResolvedValue({ id: 7, ...notice, status: 'ACTIVE' });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    show();

    screen.getByText('Before your first client: approve your privacy notice');
    // The notice history is read (and audited) only when the owner opens it.
    expect(service.list).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Read the notice' }));
    expect(await screen.findByText(notice.notice_text)).toBeInTheDocument();
    expect(screen.getByText(/Multiple applicable lawful bases/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Approve this notice' }));

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin-dashboard'] }));
    expect(service.create).toHaveBeenCalledWith(notice);
    expect(service.activate).toHaveBeenCalledWith(7);
  });

  it('approves nothing when the owner cancels the confirmation', async () => {
    service.list.mockResolvedValue(listing());
    confirmAction.mockResolvedValue(false);
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Read the notice' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Approve this notice' }));
    await waitFor(() => expect(confirmAction).toHaveBeenCalled());
    expect(service.create).not.toHaveBeenCalled();
    expect(screen.getByText(/Before your first client/)).toBeInTheDocument();
  });

  it('stays hidden while the dashboard loads and once the firm has an active notice', () => {
    for (const active of [undefined, true]) {
      const { container, unmount } = show({ active });
      expect(container).toBeEmptyDOMElement();
      unmount();
    }
    expect(service.list).not.toHaveBeenCalled();
  });
});
