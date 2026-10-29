import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {MemoryRouter} from 'react-router-dom';
import ProspectiveClientActions from './ProspectiveClientActions';
import useSubscription from '@/modules/subscription/hooks/useSubscription';
vi.mock('./prospectiveClientService', () => ({prospectiveClientService: {invite: vi.fn()}, creationError: String}));
vi.mock('@/modules/subscription/hooks/useSubscription', () => ({default: vi.fn(() => ({hasFeature: () => true}))}));
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
  it('offers no portal invitation on a plan without the client portal', () => {
    useSubscription.mockReturnValueOnce({hasFeature: () => false});
    render(<MemoryRouter><ProspectiveClientActions workspace='admin' client={{id:'1', lifecycle_status:'PROSPECTIVE', portal_status:'PORTAL_ENABLED_PENDING', proposed_matters:[{status:'CLEARED', acceptance_decision:'ACCEPTED'}]}} /></MemoryRouter>);
    expect(screen.getByText('Complete onboarding / KYC')).toBeInTheDocument();
    expect(screen.queryByText('Send portal invitation')).not.toBeInTheDocument();
  });
});
