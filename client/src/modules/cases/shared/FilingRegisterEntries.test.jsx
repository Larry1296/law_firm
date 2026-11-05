import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/core/api/axios', () => ({ default: { patch: vi.fn().mockResolvedValue({ data: {} }) } }));
import axiosInstance from '@/core/api/axios';
import FilingRegisterEntries from '@/modules/cases/shared/FilingRegisterEntries';

const parties = [
  { id: 'p1', name: 'Grace Mwende', role_label: 'Claimant', is_our_client: true },
  { id: 'p2', name: 'Baraka Supplies Limited', role_label: 'Respondent', is_adverse: true },
];

describe('FilingRegisterEntries', () => {
  it('corrects who filed a paper, with a reason, without re-entering it', async () => {
    const onCorrected = vi.fn();
    const user = userEvent.setup();
    render(
      <FilingRegisterEntries
        caseId='c1'
        filings={[{ id: 'f1', filing_type: 'SUBMISSIONS', title: 'Written submissions filed', filed_by_party: 'p1', filed_by_party_name: 'Grace Mwende', filed_at: '2027-03-02T06:01:00Z', efiling_reference: 'EF-2027-108233' }]}
        parties={parties}
        eitherSidePapers={new Set(['SUBMISSIONS'])}
        canCorrect
        inputClass=''
        onCorrected={onCorrected}
      />,
    );
    await user.click(screen.getByText('Papers in the register (1)'));
    expect(screen.getByText(/Filed by Grace Mwende · 2 Mar 2027 · EF-2027-108233/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Correct' }));
    await user.selectOptions(screen.getByLabelText('Filed by'), 'p2');
    await user.type(screen.getByLabelText('Reason for the correction'), 'Recorded under the wrong party.');
    await user.click(screen.getByRole('button', { name: 'Save correction' }));
    expect(axiosInstance.patch).toHaveBeenCalledWith('/cases/c1/filings/f1/', { filed_by_party: 'p2', reason: 'Recorded under the wrong party.' });
    expect(onCorrected).toHaveBeenCalled();
  });
});
