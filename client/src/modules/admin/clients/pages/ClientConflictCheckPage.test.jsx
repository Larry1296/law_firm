import '@testing-library/jest-dom/vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ThemeContext from '@/core/store/ThemeContext';
import ClientConflictCheckPage from './ClientConflictCheckPage';

const mocks = vi.hoisted(() => ({
  getClientDetails: vi.fn(),
  getConflictCheck: vi.fn(),
  runConflictAction: vi.fn(),
  recordFirmAcceptance: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
  useParams: () => ({ id: 'client-1', checkId: 'check-1' }),
}));

vi.mock('@/components/ui/BackLink', () => ({
  default: ({ label }) => <span>{label}</span>,
}));

vi.mock('@/modules/admin/cases/hooks/useFirmLawyers', () => ({
  default: () => ({ lawyers: [] }),
}));

vi.mock('@/modules/admin/clients/services/adminClientsService', () => ({
  default: {
    getClientDetails: mocks.getClientDetails,
    getConflictCheck: mocks.getConflictCheck,
    runConflictAction: mocks.runConflictAction,
    recordFirmAcceptance: mocks.recordFirmAcceptance,
  },
}));

vi.mock('@/modules/staff/lawyer/cases/services/lawyerCasesService', () => ({
  default: {
    getConflictCheck: mocks.getConflictCheck,
    runConflictAction: mocks.runConflictAction,
    recordFirmAcceptance: mocks.recordFirmAcceptance,
  },
}));

const baseConflictCheck = {
  id: 'check-1',
  reference_number: 'CC-2026-00001',
  proposed_matter_title: 'Lease dispute',
  proposed_instructions: 'Review and advise on lease dispute.',
  factual_summary: 'Tenant dispute facts.',
  desired_outcome: 'Resolve dispute.',
  status: 'IN_PROGRESS',
  status_label: 'In progress',
  acceptance_decision: 'PENDING',
  permitted_next_statuses: [{ value: 'CLEARED', label: 'Cleared' }],
  source_categories_checked: [],
  names_checked: [],
  decided_by_name: '',
  decided_at: null,
  adverse_parties: [],
  history: [],
};

function renderPage(conflictCheck = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  mocks.getClientDetails.mockResolvedValue({ client: { full_name: 'Jane Client' } });
  mocks.getConflictCheck.mockResolvedValue({ ...baseConflictCheck, ...conflictCheck });
  mocks.runConflictAction.mockResolvedValue({ ...baseConflictCheck, status: 'CLEARED' });

  const user = userEvent.setup();

  render(
    <ThemeContext.Provider value={{ theme: 'light' }}>
      <QueryClientProvider client={queryClient}>
        <ClientConflictCheckPage />
      </QueryClientProvider>
    </ThemeContext.Provider>,
  );

  return user;
}

async function selectClearedOutcome(user) {
  await screen.findByText('CC-2026-00001');
  await user.click(screen.getByRole('button', { name: /select next outcome/i }));
  await user.click(screen.getByRole('option', { name: 'Cleared' }));
}

function getNamesCheckedInput() {
  return screen.getByText(/Names checked, comma separated/i).closest('div').querySelector('input');
}

describe('ClientConflictCheckPage source checks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/admin/clients/client-1/conflict-checks/check-1');
  });

  it('allows several sources to be checked and keeps them visibly checked', async () => {
    const user = renderPage();

    await selectClearedOutcome(user);
    await user.click(screen.getByRole('checkbox', { name: 'Current clients' }));
    await user.click(screen.getByRole('checkbox', { name: 'Former clients' }));
    await user.click(screen.getByRole('checkbox', { name: 'Open matters' }));

    expect(screen.getByRole('checkbox', { name: 'Current clients' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Former clients' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Open matters' })).toBeChecked();
  });

  it('unchecking one source preserves the other selected sources', async () => {
    const user = renderPage();

    await selectClearedOutcome(user);
    await user.click(screen.getByRole('checkbox', { name: 'Current clients' }));
    await user.click(screen.getByRole('checkbox', { name: 'Former clients' }));
    await user.click(screen.getByRole('checkbox', { name: 'Current clients' }));

    expect(screen.getByRole('checkbox', { name: 'Current clients' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Former clients' })).toBeChecked();
  });

  it('submits the complete source_categories_checked array', async () => {
    const user = renderPage();

    await selectClearedOutcome(user);
    await user.type(getNamesCheckedInput(), 'Jane Client, Former Tenant');
    await user.click(screen.getByRole('checkbox', { name: 'Current clients' }));
    await user.click(screen.getByRole('checkbox', { name: 'Former clients' }));
    await user.click(screen.getByRole('checkbox', { name: 'Open matters' }));
    await user.click(screen.getByRole('button', { name: /record outcome/i }));

    await waitFor(() => expect(mocks.runConflictAction).toHaveBeenCalled());
    expect(mocks.runConflictAction.mock.calls[0][3]).toMatchObject({
      source_categories_checked: ['CURRENT_CLIENTS', 'FORMER_CLIENTS', 'OPEN_MATTERS'],
    });
  });

  it('shows validation and blocks a cleared decision when no source is checked', async () => {
    const user = renderPage();

    await selectClearedOutcome(user);

    expect(screen.getByText('Select at least one source checked before recording a cleared decision.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /record outcome/i })).toBeDisabled();
    expect(mocks.runConflictAction).not.toHaveBeenCalled();
  });

  it('requires an other source description when OTHER is selected', async () => {
    const user = renderPage();

    await selectClearedOutcome(user);
    await user.type(getNamesCheckedInput(), 'Jane Client');
    await user.click(screen.getByRole('checkbox', { name: 'Other' }));

    const description = screen.getByLabelText(/other source description/i);
    expect(description).toBeRequired();
    expect(screen.getByRole('button', { name: /record outcome/i })).toBeDisabled();

    await user.type(description, 'Manual archived paper index');

    expect(screen.getByRole('button', { name: /record outcome/i })).not.toBeDisabled();
  });

  it('displays saved sources with friendly labels on the detail page', async () => {
    renderPage({
      source_categories_checked: ['CURRENT_CLIENTS', 'FORMER_CLIENTS', 'FIRM_ADVOCATES_AND_STAFF'],
    });

    expect(await screen.findByText(/Current clients, Former clients, Firm advocates and staff/)).toBeInTheDocument();
  });

  it('does not display misleading findings for direct clearance', async () => {
    renderPage({
      status: 'CLEARED',
      status_label: 'Cleared',
      first_reviewer_findings: '',
      result_summary: 'No relevant conflict identified.',
      names_checked: ['Jane Client'],
      source_categories_checked: ['CURRENT_CLIENTS'],
      decided_by_name: 'Daniel Advocate',
      decided_at: '2026-07-23T12:30:00Z',
    });

    expect(await screen.findByText(/First-reviewer findings:/)).toBeInTheDocument();
    expect(screen.getByText(/Not applicable/)).toBeInTheDocument();
    expect(screen.queryByText(/Findings:\s*Not recorded/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Clearance result:/)).toBeInTheDocument();
    expect(screen.getByText(/No relevant conflict identified./)).toBeInTheDocument();
    expect(screen.getByText(/Deciding advocate:/)).toBeInTheDocument();
    expect(screen.getByText(/Daniel Advocate/)).toBeInTheDocument();
  });

  it('displays potential-conflict findings when present', async () => {
    renderPage({
      status: 'POTENTIAL_CONFLICT',
      status_label: 'Potential conflict',
      first_reviewer_findings: 'Former client appeared in related transaction.',
      result_summary: '',
    });

    expect(await screen.findByText(/First-reviewer findings:/)).toBeInTheDocument();
    expect(screen.getByText(/Former client appeared in related transaction./)).toBeInTheDocument();
  });
});
