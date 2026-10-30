import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import AdminCasesPage from './AdminCasesPage';

const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));
vi.mock('@/modules/admin/cases/hooks/useAdminCases', () => ({
  default: () => ({
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
    cases: [{
      id: 'case-1',
      case_number: 'MAT-2026-00001',
      title: 'Grace Mwende v Baraka Supplies Ltd – unfair termination',
      case_owner: { full_name: 'Grace Mwende', party_role: 'CLAIMANT', party_role_label: 'Claimant' },
      court_name: 'Employment and Labour Court at Nairobi',
      matter_status: 'MATTER_OPEN',
      matter_status_label: 'Matter open',
      court_stage: 'NOT_FILED',
      court_stage_label: 'Not filed',
      priority: 'MEDIUM',
    }],
  }),
}));

describe('AdminCasesPage', () => {
  it('lists an opened matter as open with its client, court and stage, and opens it on click', async () => {
    render(<AdminCasesPage />);

    expect(screen.getByText('1 open matter')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Open/ })).toHaveTextContent('1');
    expect(screen.getByText(/Grace Mwende \(Claimant\)/)).toBeInTheDocument();
    expect(screen.getByText('Employment and Labour Court at Nairobi')).toBeInTheDocument();
    expect(screen.getByText('No court number yet')).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText(/Search by title/), 'nothing like this');
    expect(screen.getByText('No matters match this search.')).toBeInTheDocument();
    await userEvent.clear(screen.getByPlaceholderText(/Search by title/));

    await userEvent.click(screen.getByText(/Grace Mwende v Baraka/));
    expect(navigate).toHaveBeenCalledWith('/admin/cases/case-1');
  });
});
