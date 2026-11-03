import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from '@/core/api/axios';
import CourtProgressPanel from './CourtProgressPanel';

vi.mock('@/core/api/axios', () => ({ default: { post: vi.fn() } }));

describe('summons service diary', () => {
  beforeEach(() => vi.clearAllMocks());
  it('records the actual summons appearance date instead of adding fifteen days', async () => {
    axios.post.mockResolvedValue({ data: { next_action: 'Advocate to verify response deadline' } });
    render(<QueryClientProvider client={new QueryClient()}><CourtProgressPanel caseData={{ id: 'case-1' }} showStage={false} /></QueryClientProvider>);
    fireEvent.change(screen.getByLabelText('Paper'), { target: { value: 'SUMMONS' } });
    fireEvent.change(screen.getByLabelText('Date served'), { target: { value: '2026-10-20T10:00' } });
    fireEvent.change(screen.getByLabelText(/Appearance due date in summons/), { target: { value: '2026-11-12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record in register' }));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/cases/case-1/filings/', expect.objectContaining({ filing_type: 'SUMMONS', response_due_date: '2026-11-12' })));
    expect(await screen.findByRole('status')).toHaveProperty('textContent', expect.stringContaining('Advocate to verify'));
  });

  it('offers the next paper and the ELRC names for an employment claim that has been filed', () => {
    render(<QueryClientProvider client={new QueryClient()}><CourtProgressPanel caseData={{ id: 'case-1', court_stage: 'FILED', procedure_track: 'EMPLOYMENT_CLAIM', filings: [] }} showStage={false} /></QueryClientProvider>);
    expect(screen.getByLabelText('Paper')).toHaveProperty('value', 'SUMMONS');
    expect(screen.getByLabelText(/Response due date \(28 days after service\)/)).toBeTruthy();
    const papers = Array.from(screen.getByLabelText('Paper').options).map((option) => option.textContent);
    expect(papers).toContain('Response received');
    expect(papers).not.toContain('Memorandum of appearance received');
    fireEvent.change(screen.getByLabelText('Paper'), { target: { value: 'AFFIDAVIT_OF_SERVICE' } });
    expect(screen.getByLabelText('E-filing reference')).toBeTruthy();
  });

  it('starts what it records at now and counts the ELRC response from the day of service', () => {
    render(<QueryClientProvider client={new QueryClient()}><CourtProgressPanel caseData={{ id: 'case-1', court_stage: 'FILED', procedure_track: 'EMPLOYMENT_CLAIM', filings: [], efiling_reference: 'EF-2026-118734', parties: [{ name: 'Baraka Supplies Limited', is_adverse: true }] }} showStage={false} /></QueryClientProvider>);
    expect(screen.getByLabelText('Title')).toHaveProperty('value', 'Summons and statement of claim served on Baraka Supplies Limited');
    // The claim's e-filing reference belongs to the claim; each paper takes its own.
    expect(screen.getByLabelText('E-filing reference')).toHaveProperty('value', '');
    expect(screen.getByLabelText('Payment reference')).toHaveProperty('value', '');
    expect(screen.getByLabelText('Date served').value.slice(0, 10)).toBe(new Date().toLocaleDateString('en-CA'));
    fireEvent.change(screen.getByLabelText('Date served'), { target: { value: '2026-10-30T14:00' } });
    expect(screen.getByLabelText(/Response due date/)).toHaveProperty('value', '2026-11-27');
  });

  it('offers the reply after the response and asks for the paper once pleadings are past it', () => {
    const filings = [{ filing_type: 'DEFENCE' }];
    const { rerender } = render(<QueryClientProvider client={new QueryClient()}><CourtProgressPanel caseData={{ id: 'case-1', court_stage: 'PLEADINGS_OPEN', procedure_track: 'EMPLOYMENT_CLAIM', filings }} showStage={false} /></QueryClientProvider>);
    expect(screen.getByLabelText('Paper')).toHaveProperty('value', 'REPLY_TO_DEFENCE');
    rerender(<QueryClientProvider client={new QueryClient()}><CourtProgressPanel caseData={{ id: 'case-2', court_stage: 'PLEADINGS_OPEN', procedure_track: 'EMPLOYMENT_CLAIM', filings: [...filings, { filing_type: 'REPLY_TO_DEFENCE' }] }} showStage={false} /></QueryClientProvider>);
    expect(screen.getByLabelText('Paper')).toHaveProperty('value', '');
  });

  it('asks no court fees for a demand letter or the other side\'s response', () => {
    render(<QueryClientProvider client={new QueryClient()}><CourtProgressPanel caseData={{ id: 'case-1', court_stage: 'NOT_FILED', procedure_track: 'EMPLOYMENT_CLAIM', filings: [] }} showStage={false} /></QueryClientProvider>);
    expect(screen.getByLabelText('Paper')).toHaveProperty('value', 'DEMAND_LETTER');
    expect(screen.queryByLabelText('E-filing reference')).toBeNull();
    expect(screen.queryByLabelText('Court fees (KES)')).toBeNull();
    expect(screen.getByLabelText('E-filing reference')).toHaveProperty('value', 'EF-2026-118734');
    fireEvent.change(screen.getByLabelText('Paper'), { target: { value: 'DEFENCE' } });
    expect(screen.getByLabelText('E-filing reference')).toBeTruthy();
    expect(screen.queryByLabelText('Receipt number')).toBeNull();
  });

  it('swears the affidavit to the service already recorded', async () => {
    axios.post.mockResolvedValue({ data: { next_action: 'Awaiting response' } });
    const served = new Date(2026, 9, 30, 17, 39);
    render(<QueryClientProvider client={new QueryClient()}><CourtProgressPanel caseData={{ id: 'case-1', court_stage: 'FILED', procedure_track: 'EMPLOYMENT_CLAIM', filings: [{ filing_type: 'SUMMONS', served_at: served.toISOString(), response_due_date: '2026-11-20' }] }} showStage={false} /></QueryClientProvider>);
    expect(screen.getByLabelText('Paper')).toHaveProperty('value', 'AFFIDAVIT_OF_SERVICE');
    expect(screen.getByLabelText('Date served')).toHaveProperty('value', '2026-10-30T17:39');
    expect(screen.getByLabelText(/Response due date/)).toHaveProperty('value', '2026-11-20');
    fireEvent.click(screen.getByRole('button', { name: 'Record in register' }));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/cases/case-1/filings/', expect.objectContaining({ filing_type: 'AFFIDAVIT_OF_SERVICE', served_at: served.toISOString(), response_due_date: '2026-11-20' })));
  });

  it('lists the papers filed with an ELRC claim and records a missing one on the claim date without fees', async () => {
    axios.post.mockResolvedValue({ data: { next_action: 'Pleadings close on 13 Nov 2026' } });
    const caseData = {
      id: 'case-1', court_stage: 'PLEADINGS_OPEN', procedure_track: 'EMPLOYMENT_CLAIM',
      parties: [{ name: 'Grace Mwende', is_our_client: true, party_role: 'CLAIMANT' }, { name: 'Baraka Supplies Limited', is_adverse: true, party_role: 'RESPONDENT' }],
      filings: [
        { filing_type: 'ORIGINATING_CLAIM', filed_at: '2026-10-30T06:00:00Z', efiling_reference: 'EF-2026-118734' },
        { filing_type: 'WITNESS_STATEMENT', filed_at: '2026-10-30T06:00:00Z', efiling_reference: '' },
      ],
    };
    render(<QueryClientProvider client={new QueryClient()}><CourtProgressPanel caseData={caseData} showStage={false} /></QueryClientProvider>);
    const checklist = screen.getByRole('region', { name: 'Papers filed with the claim' });
    expect(checklist.textContent).toContain('rule 7(3)');
    expect(checklist.textContent).toContain('Recorded');
    expect(screen.getAllByRole('button', { name: 'Record' })).toHaveLength(3);
    fireEvent.click(screen.getAllByRole('button', { name: 'Record' })[0]);
    expect(screen.getByLabelText('Paper')).toHaveProperty('value', 'VERIFYING_AFFIDAVIT');
    expect(screen.getByLabelText('Title')).toHaveProperty('value', 'Verifying affidavit of Grace Mwende');
    expect(screen.queryByLabelText('Court fees (KES)')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Record in register' }));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/cases/case-1/filings/', expect.objectContaining({
      filing_type: 'VERIFYING_AFFIDAVIT', filed_at: new Date('2026-10-30T06:00:00Z').toISOString(), efiling_reference: 'EF-2026-118734',
    })));
    expect(axios.post.mock.calls[0][1]).not.toHaveProperty('court_fee_amount');
  });

  it('shows no claim checklist when the client is the respondent', () => {
    render(<QueryClientProvider client={new QueryClient()}><CourtProgressPanel caseData={{ id: 'case-1', court_stage: 'PLEADINGS_OPEN', procedure_track: 'EMPLOYMENT_CLAIM', parties: [{ name: 'Acme Ltd', is_our_client: true, party_role: 'RESPONDENT' }], filings: [{ filing_type: 'ORIGINATING_CLAIM', filed_at: '2026-10-30T06:00:00Z' }] }} showStage={false} /></QueryClientProvider>);
    expect(screen.queryByRole('region', { name: 'Papers filed with the claim' })).toBeNull();
  });
});

