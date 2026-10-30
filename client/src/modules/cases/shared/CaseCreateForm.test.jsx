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

    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Employment and Labour Court at Nairobi')).toBeInTheDocument();
    expect(screen.queryByText('Courtroom')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    const fieldValue = (label) => screen.getByText(label, { selector: 'label' }).parentElement.querySelector('button').textContent;
    expect(fieldValue('Employer')).toBe('Baraka Supplies Limited');
    expect(fieldValue('Employee')).toBe('Grace Mwende');
    expect(screen.queryByText('Unfair dismissal')).not.toBeInTheDocument();
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

  it('starts the monetary relief from the jurisdiction claim value and takes a pleaded interest rate', async () => {
    render(
      <CaseCreateForm
        clients={[{ id: 'client-1', full_name: 'Grace Mwende', client_type: 'INDIVIDUAL' }]}
        lawyers={[]}
        secretaries={[]}
        createCase={vi.fn()}
        initialClientId='client-1'
        initialConflictCheckId='check-1'
        initialConflictCheck={{ ...conflictCheck, jurisdiction_facts: { practice_area: 'EMPLOYMENT_LABOUR', claim_value: '600000.00' } }}
        canCreate
      />,
    );

    await userEvent.click(screen.getByText('New instruction - not yet filed'));
    for (let step = 0; step < 6; step += 1) {
      await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    }
    expect(screen.getByText('Yes - quantified')).toBeInTheDocument();
    expect(screen.getByLabelText('Principal / Claim Amount')).toHaveValue(600000);

    await userEvent.type(screen.getByLabelText('Amount Already Paid'), '100000');
    expect(screen.getByText('KES 500,000')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Select'));
    await userEvent.click(screen.getByText('Yes'));
    expect(screen.getByText('Court rates')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Court rates'));
    await userEvent.click(screen.getByText('Rate pleaded in the claim'));
    await userEvent.type(screen.getByLabelText(/Interest Rate/), '14%');
    expect(screen.getByLabelText(/Interest Rate/)).toHaveValue('14');
  });

  it('assigns the responsible advocate, counts the limitation from the dismissal and carries the jurisdiction findings', async () => {
    render(
      <CaseCreateForm
        clients={[{ id: 'client-1', full_name: 'Grace Mwende', client_type: 'INDIVIDUAL' }]}
        lawyers={[{ id: 'adv-1', full_name: 'Daniel Mutiso', system_role: 'ADMIN' }]}
        secretaries={[]}
        createCase={vi.fn()}
        initialClientId='client-1'
        initialConflictCheckId='check-1'
        initialConflictCheck={{
          ...conflictCheck,
          responsible_lawyer: 'adv-1',
          jurisdiction: { ...conflictCheck.jurisdiction, advocate_findings: 'Forum confirmed: ELRC at Nairobi.' },
        }}
        canCreate
      />,
    );

    await userEvent.click(screen.getByText('New instruction - not yet filed'));
    for (let step = 0; step < 5; step += 1) {
      await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    }
    const ended = screen.getByLabelText('Date Employment Ended');
    await userEvent.type(ended, '2026-09-15');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Daniel Mutiso')).toBeInTheDocument();
    expect(screen.queryByText('Assigned Secretary')).not.toBeInTheDocument();
    expect(screen.queryByText('Next Court Date')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Limitation Date')).toHaveValue('2029-09-14');
    expect(screen.getByLabelText('Jurisdiction Notes')).toHaveValue('Forum confirmed: ELRC at Nairobi.');
  });
});
