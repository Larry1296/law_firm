import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CaseProcedurePanels from './CaseProcedurePanels';

describe('case procedure panels', () => {
  it('keeps older filings, such as the claim itself, one click away', () => {
    const filings = Array.from({ length: 7 }, (_, index) => ({ id: `f-${index}`, title: `Paper ${index}`, filing_type: 'OTHER', status: 'FILED' }));
    render(<CaseProcedurePanels caseData={{ events: [], filings }} />);
    expect(screen.queryByText('Paper 6')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show all 7' }));
    expect(screen.getByText('Paper 6')).toBeTruthy();
  });
});
