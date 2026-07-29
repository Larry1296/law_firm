import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminCreateCasePage from './AdminCreateCasePage';

const mocks = vi.hoisted(() => ({
  queryResult: { data: undefined, isLoading: false },
  params: { id: 'client-1', checkId: 'check-1' },
  navigate: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
  useParams: () => mocks.params,
  useSearchParams: () => [new URLSearchParams()],
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => mocks.queryResult,
}));

vi.mock('@/components/ui/SectionHeading', () => ({
  default: ({ title, subtitle }) => <header>{title} — {subtitle}</header>,
}));
vi.mock('@/components/ui/Card', () => ({ default: ({ children }) => <section>{children}</section> }));
vi.mock('@/components/ui/Button3D', () => ({ default: ({ children, ...props }) => <button {...props}>{children}</button> }));
vi.mock('@/modules/cases/shared/CaseCreateForm', () => ({
  default: (props) => (
    <div
      data-testid='case-create-form'
      data-client-id={props.initialClientId}
      data-conflict-check-id={props.initialConflictCheckId}
    />
  ),
}));
vi.mock('@/modules/admin/cases/hooks/useAdminCreateCase', () => ({ default: () => ({ createCase: vi.fn() }) }));
vi.mock('@/modules/admin/clients/hooks/useAdminClients', () => ({ default: () => ({ clients: [], isLoading: false }) }));
vi.mock('@/modules/admin/cases/hooks/useFirmLawyers', () => ({ default: () => ({ lawyers: [] }) }));
vi.mock('@/modules/admin/cases/hooks/useFirmSecretaries', () => ({ default: () => ({ secretaries: [] }) }));
vi.mock('@/modules/admin/clients/services/adminClientsService', () => ({
  default: { getConflictCheck: vi.fn() },
}));

describe('AdminCreateCasePage conflict-clearance gate', () => {
  beforeEach(() => {
    mocks.params = { id: 'client-1', checkId: 'check-1' };
    mocks.queryResult = { data: undefined, isLoading: false };
    mocks.navigate.mockReset();
  });

  it('does not render matter creation when the proposed matter cannot be opened', () => {
    mocks.queryResult = {
      data: { id: 'check-1', can_open_matter: false },
      isLoading: false,
    };

    render(<AdminCreateCasePage />);

    expect(screen.queryByTestId('case-create-form')).not.toBeInTheDocument();
    expect(screen.getByText(/clear conflict, and record firm acceptance/i)).toBeInTheDocument();
  });

  it('passes the accepted proposed-matter context to the creation form', () => {
    mocks.queryResult = {
      data: { id: 'check-1', can_open_matter: true },
      isLoading: false,
    };

    render(<AdminCreateCasePage />);

    const form = screen.getByTestId('case-create-form');
    expect(form).toHaveAttribute('data-client-id', 'client-1');
    expect(form).toHaveAttribute('data-conflict-check-id', 'check-1');
  });
});
