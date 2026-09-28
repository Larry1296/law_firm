import {afterEach, describe, expect, it} from 'vitest';
import {cleanup, render, screen} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {AdvocateBrief, ClientBrief} from './PreparationBrief';

afterEach(cleanup);

const brief = {
  readiness: 60,
  checks: [
    {key: 'witness_statements', label: 'Witness statements filed', passed: false, detail: ''},
    {key: 'deadlines', label: 'No deadlines outstanding', passed: true, detail: ''},
  ],
  guidance: {
    purpose: 'The trial.', checklist: ['Originals ready.'],
    anticipated_questions: [{from: 'Opposing counsel', question: 'Who signed the delivery notes?', prepare: 'The signatory from the record.'}],
    form_of_address: 'Address the magistrate as "Your Honour".', disclaimer: 'Not legal advice.',
    your_role: 'You may be a witness.', before: ['Arrive early.'], in_court: ['Do not interrupt.'],
    if_you_give_evidence: ['Tell the truth.'], after: ['Your advocate will explain.'],
  },
  tailored: {focus: 'Prove delivery.', anticipated_questions: [], risks: ['Unsigned March note.'], label: 'AI draft'},
};

describe('preparation briefs', () => {
  it('shows the advocate readiness, gaps, likely questions and tailored risks', () => {
    render(<AdvocateBrief brief={brief} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '60');
    expect(screen.getByText(/Who signed the delivery notes/)).toBeInTheDocument();
    expect(screen.getByText('Unsigned March note.')).toBeInTheDocument();
  });

  it('shows the client only plain guidance', () => {
    render(<ClientBrief brief={brief} />);
    expect(screen.getByText('Tell the truth.')).toBeInTheDocument();
    expect(screen.queryByText(/Who signed the delivery notes/)).not.toBeInTheDocument();
    expect(screen.queryByText('Prove delivery.')).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
