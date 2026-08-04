import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MatterLifecycleControls from './MatterLifecycleControls';
import adminCasesService from '../services/adminCasesService';

vi.mock('@/core/hooks/useAuth', () => ({ default: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/core/utils/themedSwal', () => ({ default: { fire: vi.fn().mockResolvedValue({}) } }));
vi.mock('../services/adminCasesService', () => ({
  default: {
    getDeadlines: vi.fn(), getClosures: vi.fn(), getLegalAssessments: vi.fn(), getWorkstream: vi.fn(),
    getArchive: vi.fn(), createDeadline: vi.fn(), resolveDeadline: vi.fn(), changeDeadline: vi.fn(),
    createLegalAssessment: vi.fn(), setWorkstream: vi.fn(), completeWorkstreamStage: vi.fn(),
    requestClosure: vi.fn(), closureAction: vi.fn(), generateClosingDocument: vi.fn(),
    createArchive: vi.fn(), createRetentionReview: vi.fn(), changeLegalHold: vi.fn(), recordDestruction: vi.fn(),
  },
}));

const matter = {
  id: 'matter-1', matter_status: 'ACTIVE', matter_nature: 'ADVISORY', case_type: 'COMMERCIAL',
  created_by: 'user-1', assigned_lawyer: { id: 'lawyer-1' },
};

describe('MatterLifecycleControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminCasesService.getDeadlines.mockResolvedValue({ deadlines: [] });
    adminCasesService.getClosures.mockResolvedValue({ closures: [] });
    adminCasesService.getLegalAssessments.mockResolvedValue({ assessments: [] });
    adminCasesService.getWorkstream.mockResolvedValue({ workstream: null });
  });

  it('loads authoritative lifecycle state and exposes non-litigation workstream and closing controls', async () => {
    render(<MatterLifecycleControls matter={matter} />);
    expect(await screen.findByText(/Specialised workstream/i)).toBeInTheDocument();
    expect(screen.getByText(/Request formal Closing Review/i)).toBeInTheDocument();
    expect(screen.getByText(/Advocate legal assessment/i)).toBeInTheDocument();
    expect(adminCasesService.getWorkstream).toHaveBeenCalledWith('matter-1');
  });

  it('requires an explicit archive-access purpose and renders retention and destruction state returned by the API', async () => {
    const user = userEvent.setup();
    adminCasesService.getArchive.mockResolvedValue({ archive: {
      id: 'archive-1', archive_reference: 'ARC-001', scheduled_review_date: '2033-08-04',
      electronic_location: 'vault/MAT-001', retention_policy: 'Seven years', legal_hold: false,
      destruction_log: null, access_history: [{ id: 'access-1', purpose: 'Retention administration', accessed_at: '2026-08-04T12:00:00Z' }],
      document_inventory: [{ id: 'document-1', title: 'Closing letter', physical_copy_retained: false }],
    } });
    render(<MatterLifecycleControls matter={{ ...matter, matter_status: 'ARCHIVED' }} />);
    await user.click(await screen.findByRole('button', { name: /Access archived file/i }));
    await waitFor(() => expect(adminCasesService.getArchive).toHaveBeenCalledWith(
      'matter-1', 'Closing, retention and compliance administration.',
    ));
    expect(await screen.findByText(/ARC-001/)).toBeInTheDocument();
    expect(screen.getByText(/Retention assessment/i)).toBeInTheDocument();
    expect(screen.getByText(/Authorised secure destruction/i)).toBeInTheDocument();
  });
});
