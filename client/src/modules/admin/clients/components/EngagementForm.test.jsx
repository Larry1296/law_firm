import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import EngagementForm from './EngagementForm';

const client = {
  full_name: 'Grace Mwende',
  client_type: 'INDIVIDUAL',
  phone_number: '0711234567',
  representatives: [],
  documents: [
    { id: 'id-1', subtype: 'NATIONAL_ID', reference: 'KYC-2026-001/D1', title: 'National ID' },
    { id: 'letter-1', subtype: 'ENGAGEMENT_LETTER', reference: 'KYC-2026-001/D2', title: 'Engagement letter', document_date: '2026-03-24' },
  ],
};

describe('EngagementForm', () => {
  it('prefills a signed engagement for the client today from the letter on file', async () => {
    const onSubmit = vi.fn();
    render(
      <EngagementForm
        client={client}
        lawyerOptions={[{ value: 'adv-1', label: 'Daniel Mutiso' }]}
        defaultAdvocate='adv-1'
        defaultScope='Pursue a claim for unfair termination.'
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText('Signed by the client')).toBeInTheDocument();
    expect(screen.getByText('Grace Mwende (the client)')).toBeInTheDocument();
    expect(screen.getByText('KYC-2026-001/D2 · Engagement letter')).toBeInTheDocument();
    expect(screen.getByText('Phone call')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Deposit due by/)).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Agreed professional fee (KES)'), '50000');
    await userEvent.click(screen.getByRole('button', { name: 'Create Engagement Version' }));

    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toMatchObject({
      responsible_advocate: 'adv-1',
      status: 'SIGNED',
      scope_of_work: 'Pursue a claim for unfair termination.',
      engagement_letter_document: 'letter-1',
      signed_by: 'Grace Mwende',
      communication_method: 'PHONE',
      fee_arrangement_description: 'Fixed or agreed fee of KES 50,000. Payable in full on signing.',
    });
    expect(new Date(payload.signed_at).toDateString()).toBe(new Date().toDateString());
    expect(payload).not.toHaveProperty('sent_at');
  });
});
