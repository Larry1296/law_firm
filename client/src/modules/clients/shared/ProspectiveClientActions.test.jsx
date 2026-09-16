import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {MemoryRouter} from 'react-router-dom';
import ProspectiveClientActions from './ProspectiveClientActions';
vi.mock('./prospectiveClientService', () => ({prospectiveClientService: {invite: vi.fn()}, creationError: String}));
afterEach(cleanup);
describe('prospective lifecycle actions', () => {
  it.each([
    ['NOT_STARTED', 'PENDING', false, false],
    ['CLEARED', 'PENDING', true, false],
    ['IN_PROGRESS', 'ACCEPTED', false, false],
    ['CLEARED', 'DECLINED', true, false],
    ['CLEARED', 'ACCEPTED', true, true],
  ])('%s / %s gates KYC and invitation independently', (status, acceptance_decision, kyc, invite) => {
    render(<MemoryRouter><ProspectiveClientActions workspace='admin' client={{id:'1', lifecycle_status:'PROSPECTIVE', portal_status:'PORTAL_ENABLED_PENDING', proposed_matters:[{status, acceptance_decision}]}} /></MemoryRouter>);
    expect(Boolean(screen.queryByText('Complete onboarding / KYC'))).toBe(kyc);
    expect(Boolean(screen.queryByText('Send portal invitation'))).toBe(invite);
  });
  it('does not combine clearance and acceptance from different proposals', () => {
    render(<MemoryRouter><ProspectiveClientActions workspace='admin' client={{id:'1', lifecycle_status:'PROSPECTIVE', portal_status:'PORTAL_ENABLED_PENDING', proposed_matters:[{status:'CLEARED', acceptance_decision:'PENDING'}, {status:'IN_PROGRESS', acceptance_decision:'ACCEPTED'}]}} /></MemoryRouter>);
    expect(screen.queryByText('Send portal invitation')).not.toBeInTheDocument();
  });
});
