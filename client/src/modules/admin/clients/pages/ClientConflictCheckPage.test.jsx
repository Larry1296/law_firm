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

const searchCheck = (search = {}, extra = {}) => ({
  system_search: {
    mode: 'AUTOMATIC', reason: 'ALL_RECORDS_IN_SYSTEM', clean_streak: null, required: 25,
    ran_at: '2026-10-27T04:24:00Z', record_count: 12, sources_searched: ['CURRENT_CLIENTS', 'FORMER_CLIENTS'],
    names_searched: [{ name: 'Jane Client', role: 'Prospective client' }, { name: 'Baraka Hardware Ltd', role: 'Proposed adverse party' }],
    matches: [], unlisted_parties: [], ai: { enabled: false, used: false, provider: '' },
    ...search,
  },
  source_reviews: [],
  search_checklist: [
    { source: 'CURRENT_CLIENTS', label: 'Current clients', guidance: 'Current clients, including any register kept outside this system.', system_match_count: 0 },
    { source: 'FORMER_CLIENTS', label: 'Former clients', guidance: 'Former clients, including archived files.', system_match_count: 0 },
  ],
  ...extra,
});

const riskMatch = {
  searched_name: 'Baraka Hardware Ltd', searched_role: 'Proposed adverse party', matched_name: 'Baraka Hardware Limited',
  source: 'CURRENT_CLIENTS', relationship: 'Current client', reference: 'KYC-001', record_type: 'client', record_id: 'c-9',
  reason: 'Same name', found_by: 'SYSTEM', conflict_risk: true,
};

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

  it('clears a clean automatic search with one confirmation', async () => {
    const user = renderPage(searchCheck());

    expect(await screen.findByText('No conflict found')).toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: /confirm clearance/i });
    expect(confirm).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /I confirm this professional conflict decision/i }));
    await user.click(confirm);

    await waitFor(() => expect(mocks.runConflictAction).toHaveBeenCalled());
    expect(mocks.runConflictAction.mock.calls[0][2]).toBe('decide');
    expect(mocks.runConflictAction.mock.calls[0][3]).toMatchObject({ decision: 'CLEARED', decision_confirmation: true });
  });

  it('does not offer clearance from the outcome list while the search panel holds it', async () => {
    const user = renderPage(searchCheck({}, {
      permitted_next_statuses: [{ value: 'AWAITING_INFORMATION', label: 'Awaiting information' }, { value: 'CLEARED', label: 'Cleared' }],
    }));

    await screen.findByText('CC-2026-00001');
    await user.click(screen.getByRole('button', { name: /select next outcome/i }));
    expect(screen.getByRole('option', { name: 'Awaiting information' })).toBeInTheDocument();

    expect(screen.queryByRole('option', { name: 'Cleared' })).not.toBeInTheDocument();
  });

  it('holds back clearance and prepares a potential conflict when the search finds a risk', async () => {
    const user = renderPage(searchCheck({ matches: [riskMatch] }, {
      permitted_next_statuses: [{ value: 'POTENTIAL_CONFLICT', label: 'Potential conflict' }],
    }));

    expect(await screen.findByText('Possible conflicts')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirm clearance/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /record potential conflict/i }));

    expect(screen.getByLabelText(/first reviewer findings/i)).toHaveValue('Baraka Hardware Ltd matches Baraka Hardware Limited: Current client.');
  });

  it('shows a same-side match for information and still allows clearance', async () => {
    renderPage(searchCheck({ matches: [{ ...riskMatch, relationship: 'Proposed adverse party in PMA/CONF/2026/0001', conflict_risk: false }] }));

    expect(await screen.findByText(/For information: same side as before/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm clearance/i })).toBeInTheDocument();
  });

  it('walks a guided firm through each source and shows its progress toward automatic searches', async () => {
    const user = renderPage(searchCheck({ mode: 'GUIDED', reason: 'OUTSIDE_RECORDS', clean_streak: 3 }));

    expect(await screen.findByText('3 of 25 clean checks')).toBeInTheDocument();
    expect(screen.getByText('Confirm each source · 0 of 2 done')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirm clearance/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /no match in this source/i }));

    await waitFor(() => expect(mocks.runConflictAction).toHaveBeenCalled());
    expect(mocks.runConflictAction.mock.calls[0][2]).toBe('review-source');
    expect(mocks.runConflictAction.mock.calls[0][3]).toEqual({ source: 'CURRENT_CLIENTS', outcome: 'NO_MATCH' });
  });

  it('offers to run the search for a check started before searches were stored', async () => {
    const user = renderPage();

    await user.click(await screen.findByRole('button', { name: /run the conflict search/i }));

    await waitFor(() => expect(mocks.runConflictAction).toHaveBeenCalled());
    expect(mocks.runConflictAction.mock.calls[0][2]).toBe('search');
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

  it('shows history actions as readable labels, not raw codes', async () => {
    renderPage({
      history: [{ id: 'h1', action: 'CHECK_STARTED', to_status: 'IN_PROGRESS', to_status_label: 'In progress', summary: 'Conflict check started.', actor_name: 'Grace Wanjiku', created_at: '2026-10-27T04:24:00Z' }],
    });

    expect(await screen.findByText('Check Started - In progress')).toBeInTheDocument();
    expect(screen.queryByText(/CHECK_STARTED/)).not.toBeInTheDocument();
  });

  it('hides engagement and KYC review until the conflict check is cleared', async () => {
    renderPage({ status: 'IN_PROGRESS' });

    expect(await screen.findByText('CC-2026-00001')).toBeInTheDocument();
    expect(screen.queryByText('Formal Engagement')).not.toBeInTheDocument();
    expect(screen.queryByText('KYC, Authority and Due-Diligence Review')).not.toBeInTheDocument();
  });

  it('offers engagement once the conflict check is cleared', async () => {
    renderPage({ status: 'CLEARED', permitted_next_statuses: [] });

    expect(await screen.findByText('Formal Engagement')).toBeInTheDocument();
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
