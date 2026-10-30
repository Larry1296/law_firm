import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import CaseCreateForm from './CaseCreateForm';

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));

const conflictCheck = {
  id: 'check-1',
  reference_number: 'PMA/CONF/2026/0001',
  proposed_matter_title: 'Grace Mwende v Baraka Supplies Ltd – unfair termination',
  jurisdiction_facts: { practice_area: 'EMPLOYMENT_LABOUR' },
  jurisdiction: { is_final: true, final_court_type: 'EMPLOYMENT_LABOUR', final_station: 'Nairobi' },
  parties: [
    { name: 'Grace Mwende', role: 'PROSPECTIVE_CLIENT', party_type: 'PERSON' },
    { name: 'Baraka Supplies Limited', role: 'PROPOSED_ADVERSE_PARTY', party_type: 'ORGANISATION' },
  ],
};

describe('CaseCreateForm opened from a cleared conflict check', () => {
  it('starts an employment claim with the client as claimant and the employer as respondent', async () => {
    render(
      <CaseCreateForm
        clients={[{ id: 'client-1', full_name: 'Grace Mwende', client_type: 'INDIVIDUAL', phone_number: '0711234567' }]}
        lawyers={[]}
        secretaries={[]}
        createCase={vi.fn()}
        initialClientId='client-1'
        initialConflictCheckId='check-1'
        initialConflictCheck={conflictCheck}
        canCreate
      />,
    );

    await userEvent.click(screen.getByText('New instruction - not yet filed'));
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('0711234567')).toBeInTheDocument();
    expect(screen.getByText('Individual')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Employment')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Claimant')).toBeInTheDocument();
    expect(screen.getByText('Baraka Supplies Limited - Respondent')).toBeInTheDocument();
  });

  it('returns to the confirmed court when another entry route was tried first', async () => {
    render(
      <CaseCreateForm
        clients={[{ id: 'client-1', full_name: 'Grace Mwende', client_type: 'INDIVIDUAL' }]}
        lawyers={[]}
        secretaries={[]}
        createCase={vi.fn()}
        initialClientId='client-1'
        initialConflictCheckId='check-1'
        initialConflictCheck={conflictCheck}
        canCreate
      />,
    );

    await userEvent.click(screen.getByText('Existing tribunal matter'));
    await userEvent.click(screen.getByText('New instruction - not yet filed'));
    for (let step = 0; step < 4; step += 1) {
      await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    }
    expect(screen.getByText('Statement of Claim')).toBeInTheDocument();
    expect(screen.getByText('Employment and Labour Court')).toBeInTheDocument();
    expect(screen.queryByText('Tribunal Name')).not.toBeInTheDocument();
  });
});
