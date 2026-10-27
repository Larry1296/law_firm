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
  generateJurisdictionSuggestion: vi.fn(),
  recordJurisdictionDecision: vi.fn(),
  confirmJurisdiction: vi.fn(),
  createConflictCheck: vi.fn(),
  swalFire: vi.fn(),
  navigate: vi.fn(),
  params: { id: 'client-1', checkId: 'check-1' },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
  useParams: () => mocks.params,
}));

vi.mock('@/core/utils/themedSwal', () => ({ default: { fire: mocks.swalFire }, confirmAction: vi.fn(async () => true) }));

vi.mock('@/modules/admin/cases/hooks/useFirmLawyers', () => ({
  default: () => ({ lawyers: [] }),
}));

vi.mock('@/modules/admin/clients/services/adminClientsService', () => ({
  default: {
    getClientDetails: mocks.getClientDetails,
    getConflictCheck: mocks.getConflictCheck,
    runConflictAction: mocks.runConflictAction,
    recordFirmAcceptance: mocks.recordFirmAcceptance,
    generateJurisdictionSuggestion: mocks.generateJurisdictionSuggestion,
    recordJurisdictionDecision: mocks.recordJurisdictionDecision,
    confirmJurisdiction: mocks.confirmJurisdiction,
    createConflictCheck: mocks.createConflictCheck,
  },
}));

vi.mock('@/modules/staff/lawyer/cases/services/lawyerCasesService', () => ({
  default: {
    getConflictCheck: mocks.getConflictCheck,
    runConflictAction: mocks.runConflictAction,
    recordFirmAcceptance: mocks.recordFirmAcceptance,
    generateJurisdictionSuggestion: mocks.generateJurisdictionSuggestion,
    recordJurisdictionDecision: mocks.recordJurisdictionDecision,
    confirmJurisdiction: mocks.confirmJurisdiction,
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
  return screen.getByLabelText(/Names checked, comma separated/i);
}

describe('ClientConflictCheckPage source checks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.params = { id: 'client-1', checkId: 'check-1' };
    window.history.pushState({}, '', '/admin/clients/client-1/conflict-checks/check-1');
  });

  it('does not render proposed-matter document references', async () => {
    renderPage();
    await screen.findByText('CC-2026-00001');
    expect(screen.queryByText('Supporting client documents')).not.toBeInTheDocument();
    expect(screen.queryByText('Add Existing Document Reference')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/search by reference/i)).not.toBeInTheDocument();
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

  it('lists every saved party with its role, not only the adverse party', async () => {
    renderPage({
      parties: [
        { id: 'p0', name: 'Wanjiru Mwangi Architects', party_type: 'ORGANISATION', role: 'PROSPECTIVE_CLIENT' },
        { id: 'p1', name: 'Baraka Hardware Ltd', party_type: 'ORGANISATION', role: 'PROPOSED_ADVERSE_PARTY' },
        { id: 'p2', name: 'James Otieno', party_type: 'PERSON', role: 'DIRECTOR' },
      ],
    });

    expect(await screen.findByText(/Wanjiru Mwangi Architects \(Prospective client\), Baraka Hardware Ltd \(Proposed adverse party\), James Otieno \(Director\)/)).toBeInTheDocument();
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

  it('separates the system suggestion from the advocate decision controls', async () => {
    renderPage({
      status: 'CLEARED',
      status_label: 'Cleared',
      jurisdiction: {
        status: 'ADVOCATE_REVIEW_REQUIRED',
        is_final: false,
        rule_version: 'KE-JURISDICTION-2026.1',
        completeness: 75,
        suggestion: {
          label: 'Small Claims Court',
          court_level: 'SMALL_CLAIMS_COURT',
          station: 'Nairobi',
          reasons: ['Eligible contractual claim within the configured monetary limit.'],
        },
        missing_information: ['territorial_connection'],
        warnings: ['Advocate review remains required.'],
      },
    });

    expect(await screen.findByText(/system-generated jurisdiction suggestion/i)).toBeInTheDocument();
    expect(screen.getByText(/System suggestion:/)).toBeInTheDocument();
    expect(screen.getAllByText(/Small Claims Court/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /record advocate decision/i })).toBeInTheDocument();
    expect(screen.queryByText(/Final jurisdiction confirmed/i)).not.toBeInTheDocument();
  });
});

describe('ClientConflictCheckPage proposed matter parties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.params = { id: 'client-1' };
    window.history.pushState({}, '', '/admin/clients/client-1/conflict-checks/new');
  });

  async function fillMatter(user) {
    await user.type(screen.getByLabelText(/Proposed matter title/), 'Recovery of unpaid fees');
    await user.type(screen.getByLabelText(/Proposed instructions/), 'Recover KES 1,450,000.');
  }

  it('records several parties, each as a person or organisation with its role', async () => {
    mocks.createConflictCheck.mockResolvedValue({ id: 'new-check' });
    const user = renderPage();
    await fillMatter(user);
    await user.click(screen.getByRole('button', { name: 'Add party' }));
    await user.type(screen.getByLabelText(/Party 1 name/), 'Baraka Homes Limited');
    await user.click(document.getElementById('party-0-type'));
    await user.click(screen.getByRole('option', { name: 'Organisation' }));
    await user.click(screen.getByRole('button', { name: 'Add party' }));
    await user.type(screen.getByLabelText(/Party 2 name/), 'John Otieno Baraka');
    await user.click(document.getElementById('party-1-type'));
    await user.click(screen.getByRole('option', { name: 'Person' }));
    await user.click(document.getElementById('party-1-role'));
    await user.click(screen.getByRole('option', { name: 'Director' }));
    await user.type(screen.getByLabelText(/Relationship to another party/, { selector: '#party-1-relationship' }), 'Director of Baraka Homes Limited');
    await user.click(screen.getByRole('button', { name: 'Save Proposed Matter' }));
    await waitFor(() => expect(mocks.createConflictCheck).toHaveBeenCalled());
    expect(mocks.createConflictCheck.mock.calls[0][1].parties).toEqual([
      { name: 'Baraka Homes Limited', party_type: 'ORGANISATION', role: 'PROPOSED_ADVERSE_PARTY', relationship_to_party: '' },
      { name: 'John Otieno Baraka', party_type: 'PERSON', role: 'DIRECTOR', relationship_to_party: 'Director of Baraka Homes Limited' },
    ]);
  });

  it('does not save a party until person or organisation is chosen', async () => {
    const user = renderPage();
    await fillMatter(user);
    await user.click(screen.getByRole('button', { name: 'Add party' }));
    await user.type(screen.getByLabelText(/Party 1 name/), 'Baraka Homes Limited');
    await user.click(screen.getByRole('button', { name: 'Save Proposed Matter' }));
    expect(mocks.swalFire).toHaveBeenCalledWith(expect.objectContaining({ text: 'Select person or organisation for each party.' }));
    expect(mocks.createConflictCheck).not.toHaveBeenCalled();
  });
});
