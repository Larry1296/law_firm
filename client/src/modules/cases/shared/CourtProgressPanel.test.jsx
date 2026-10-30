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
    expect(screen.getByLabelText(/Response due date \(21 days after service\)/)).toBeTruthy();
    const papers = Array.from(screen.getByLabelText('Paper').options).map((option) => option.textContent);
    expect(papers).toContain('Response received');
    expect(papers).not.toContain('Memorandum of appearance received');
  });

  it('starts what it records at now and counts the ELRC response from the day of service', () => {
    render(<QueryClientProvider client={new QueryClient()}><CourtProgressPanel caseData={{ id: 'case-1', court_stage: 'FILED', procedure_track: 'EMPLOYMENT_CLAIM', filings: [] }} showStage={false} /></QueryClientProvider>);
    expect(screen.getByLabelText('Date served').value.slice(0, 10)).toBe(new Date().toLocaleDateString('en-CA'));
    fireEvent.change(screen.getByLabelText('Date served'), { target: { value: '2026-10-30T14:00' } });
    expect(screen.getByLabelText(/Response due date/)).toHaveProperty('value', '2026-11-20');
  });
});

