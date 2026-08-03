import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LawyerAIPage from './LawyerAIPage';
import LawyerCaseAIAnalysisPage from './LawyerCaseAIAnalysisPage';
import { useGenerateLawyerCaseAnalysis, useLawyerAIPriorities, useLawyerCaseAnalysis } from '../hooks/useLawyerAI';

vi.mock('../hooks/useLawyerAI', () => ({ useLawyerAIPriorities: vi.fn(), useLawyerCaseAnalysis: vi.fn(), useGenerateLawyerCaseAnalysis: vi.fn() }));

const matter = { id: 'matter-1', title: 'Urgent assigned matter', case_number: 'MAT-001', client: 'Client A', court_stage: 'Awaiting judgment', practice_area: 'Criminal Litigation', next_event: { type: 'Judgment' }, days_remaining: 2, priority: 'HIGH', scores: { time_urgency: 80, consequence_severity: 95, procedural_risk: 10, evidence_readiness: 40, legal_preparedness: 50, overall_preparedness: 60 }, priority_reasons: ['Judgment is in 2 days; urgency does not predict outcome.'], requires_reassessment: true, confidence: 'LOW' };

describe('lawyer AI case pages', () => {
  beforeEach(() => {
    useLawyerAIPriorities.mockReturnValue({ data: { matters: [matter], methodology: { default_order: 'Critical and time-sensitive matters first' } }, isLoading: false });
    useGenerateLawyerCaseAnalysis.mockReturnValue({ mutate: vi.fn(), isPending: false });
    useLawyerCaseAnalysis.mockReturnValue({ isLoading: false, data: { matter, assessment: null, history: [], available_documents: [], disclaimer: 'Not a prediction or guarantee.' } });
  });

  it('shows matter-specific scores, priority explanation and filtering controls', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><LawyerAIPage /></MemoryRouter>);
    expect(screen.getByText('Urgent assigned matter')).toBeInTheDocument();
    expect(screen.getByText('Urgency').nextElementSibling).toHaveTextContent('80/100');
    expect(screen.getByText(/urgency does not predict outcome/i)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Overall priority'), 'HIGH');
    expect(useLawyerAIPriorities).toHaveBeenLastCalledWith(expect.objectContaining({ priority: 'HIGH' }));
  });

  it('opens the selected matter analysis route', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/lawyer/ai']}><Routes><Route path='/lawyer/ai' element={<LawyerAIPage />} /><Route path='/lawyer/cases/:id/ai-analysis' element={<p>Correct analysis page</p>} /></Routes></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: /open matter workspace/i }));
    expect(screen.getByText('Correct analysis page')).toBeInTheDocument();
  });

  it('renders selected-matter empty and generation states accessibly', async () => {
    const mutate = vi.fn();
    useGenerateLawyerCaseAnalysis.mockReturnValue({ mutate, isPending: false });
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/lawyer/cases/matter-1/ai-analysis']}><Routes><Route path='/lawyer/cases/:id/ai-analysis' element={<LawyerCaseAIAnalysisPage />} /></Routes></MemoryRouter>);
    expect(screen.getByText(/No assessment has been generated/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Generate analysis' }));
    expect(mutate).toHaveBeenCalledWith([]);
  });

  it('shows authorized error state without rendering case data', () => {
    useLawyerCaseAnalysis.mockReturnValue({ isLoading: false, error: new Error('forbidden') });
    render(<MemoryRouter initialEntries={['/lawyer/cases/matter-1/ai-analysis']}><Routes><Route path='/lawyer/cases/:id/ai-analysis' element={<LawyerCaseAIAnalysisPage />} /></Routes></MemoryRouter>);
    expect(screen.getByRole('alert')).toHaveTextContent(/not authorized/i);
    expect(screen.queryByText('Urgent assigned matter')).not.toBeInTheDocument();
  });
});
