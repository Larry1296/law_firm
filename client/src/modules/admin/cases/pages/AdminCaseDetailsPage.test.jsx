import '@testing-library/jest-dom/vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import AdminCaseDetailsPage from './AdminCaseDetailsPage';

vi.mock('react-router-dom', () => ({ useParams: () => ({ id: 'case-1' }), useNavigate: () => vi.fn() }));
vi.mock('@/core/hooks/useAuth', () => ({ default: () => ({ user: { email: 'mutiso@email.com' } }) }));
const { stub } = vi.hoisted(() => ({
  stub: (name) => async () => {
    const { createElement } = await import('react');
    return { default: () => createElement('div', null, name) };
  },
}));
vi.mock('@/modules/cases/shared/CaseProcedurePanels', stub('Procedure panels'));
vi.mock('@/modules/cases/shared/CaseProceedingsWorkflow', stub('Lifecycle summary'));
vi.mock('@/modules/cases/shared/CourtProgressPanel', stub('Court progress'));
vi.mock('@/modules/admin/cases/components/CreateNextCaseEventPanel', stub('Next event form'));
vi.mock('@/modules/admin/cases/components/AssignedAdvocateMatterDesk', stub('Advocate desk'));
vi.mock('@/modules/admin/cases/components/MatterTasksCard', stub('Tasks card'));
vi.mock('@/modules/admin/cases/components/MatterLifecycleControls', stub('Lifecycle controls'));
vi.mock('@/modules/cases/shared/PhysicalMatterFileCard', stub('Physical file card'));

const { caseData } = vi.hoisted(() => ({ caseData: {
  id: 'case-1',
  case_number: 'MAT-2026-00001',
  title: 'Grace Mwende v Baraka Supplies Ltd – unfair termination',
  case_owner: { full_name: 'Grace Mwende', party_role_label: 'Claimant' },
  assigned_lawyer: { full_name: 'Daniel Mutiso', email: 'mutiso@email.com' },
  court_name: 'Employment and Labour Court at Nairobi',
  forum: 'COURT',
  court_stage: 'NOT_FILED',
  court_stage_label: 'Not filed',
  matter_status: 'MATTER_OPEN',
  priority: 'MEDIUM',
  next_action: 'Filing',
  physical_matter_file: { assignment_pending: true },
  client: { full_name: 'Grace Mwende', phone_number: '0711234567', portal_access_exists: false },
  parties: [],
  documents: [],
  tasks: [],
  events: [{ id: 'event-1', title: 'Mention', event_type: 'MENTION', is_client_visible: true, starts_at: '2099-11-18T06:00:00Z', client_awareness: { status: 'NOT_NOTIFIED' } }],
  timeline: [],
  activities: [],
} }));

vi.mock('@/modules/admin/cases/hooks/useAdminCaseDetails', () => ({
  default: () => ({ caseData, lawyers: [], secretaries: [], isLoading: false }),
}));

describe('AdminCaseDetailsPage', () => {
  it('shows one part of the matter at a time, starting with what needs doing next', async () => {
    render(<QueryClientProvider client={new QueryClient()}><AdminCaseDetailsPage /></QueryClientProvider>);

    expect(screen.getByRole('heading', { name: caseData.title })).toBeInTheDocument();
    expect(screen.getByText(/MAT-2026-00001 · Grace Mwende \(Claimant\) · Employment and Labour Court at Nairobi/)).toBeInTheDocument();
    expect(screen.getByText('Record the prepared physical file and where it is kept.')).toBeInTheDocument();
    expect(screen.queryByText('Physical file card')).not.toBeInTheDocument();

    expect(screen.getByText(/Tell Grace Mwende about the Mention on .*\(0711234567\)\./)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Open file →' }));
    expect(screen.getByText('Physical file card')).toBeInTheDocument();
    expect(screen.getByText('Advocate desk')).toBeInTheDocument();

    for (const tab of ['Court', 'Matter record', 'Team', 'History']) {
      await userEvent.click(screen.getByRole('tab', { name: tab }));
      expect(screen.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true');
    }
    expect(screen.queryByText('Physical file card')).not.toBeInTheDocument();
  });
});
