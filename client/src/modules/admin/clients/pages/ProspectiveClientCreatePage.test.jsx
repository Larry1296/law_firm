import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CreatePage from './AdminCreateClientPage';
import ProposedMatterEntryPage from './ProposedMatterEntryPage';
import { prospectiveClientService as service } from '@/modules/clients/shared/prospectiveClientService';
import metadata from '../clientCreation/prospectiveMetadata.fixture.json';

vi.mock('@/modules/clients/shared/prospectiveClientService', () => ({
  prospectiveClientService: { metadata: vi.fn(), create: vi.fn(), options: vi.fn(), proposedMatter: vi.fn(), invite: vi.fn() },
  creationError: (e) => e.message,
}));
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); service.metadata.mockResolvedValue(metadata); });
const change = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const renderPage = (path='/admin/clients/create') => render(<MemoryRouter initialEntries={[path]}><Routes><Route path='/:workspace/clients/create' element={<CreatePage />} /><Route path='/:workspace/clients/:id/conflict-checks/new' element={<p>Proposed matter route</p>} /></Routes></MemoryRouter>);
const selectCategory = async (kind) => { await screen.findByLabelText(/Legal client category/); change(/Legal client category/, kind); };
const fillPrivacy = () => { change(/Data source/, 'DIRECT'); change(/Delivery method/, 'PAPER'); fireEvent.click(screen.getByLabelText(/Privacy notice delivered/)); };

describe('single prospective-client creation page', () => {
  it('defaults to Firm-managed and displays one access group and one backend category dropdown', async () => {
    renderPage(); await screen.findByLabelText(/Legal client category/);
    expect(screen.getByLabelText(/Firm-managed/)).toBeChecked();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getAllByLabelText(/Legal client category/)).toHaveLength(1);
    expect(screen.queryByText('Continue')).not.toBeInTheDocument();
    expect(service.metadata).toHaveBeenCalledWith('admin');
    for (const category of metadata.legal_client_types) expect(screen.getByRole('option', { name: category.label })).toBeInTheDocument();
  });
  it.each(metadata.legal_client_types)('renders the backend fields for $value', async ({ value }) => {
    renderPage(); await selectCategory(value);
    for (const field of metadata.prospective_profiles[value].fields) expect(screen.getByLabelText(new RegExp(field.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create prospective client' })).toBeInTheDocument();
  });
  it('preserves Portal-enabled and shared fields when Company changes to Individual', async () => {
    renderPage(); await selectCategory('COMPANY');
    fireEvent.click(screen.getByLabelText(/Portal-enabled/));
    change(/Legal \/ registered name/, 'Shared name'); change(/Safe email/, 'safe@example.test');
    change(/Company registration number/, 'PVT-OLD');
    change(/Legal client category/, 'INDIVIDUAL');
    expect(screen.getByLabelText(/Portal-enabled/)).toBeChecked();
    expect(screen.getByLabelText(/Full legal name/)).toHaveValue('Shared name');
    expect(screen.getByLabelText(/Safe email/)).toHaveValue('safe@example.test');
    expect(screen.queryByLabelText(/Company registration number/)).not.toBeInTheDocument();
    change(/Legal client category/, 'COMPANY');
    expect(screen.getByLabelText(/Company registration number/)).toHaveValue('');
  });
  it('requires category minima and appropriate portal contact', async () => {
    renderPage(); await selectCategory('COMPANY'); fireEvent.click(screen.getByLabelText(/Portal-enabled/));
    expect(screen.getByLabelText(/Country of incorporation/)).toBeRequired();
    expect(screen.getByLabelText(/Representative name/)).toBeRequired();
    expect(screen.getByLabelText(/Representative email/)).toBeRequired();
    expect(screen.getByLabelText(/Use this authorised portal contact/)).toBeRequired();
    change(/Legal client category/, 'INDIVIDUAL');
    expect(screen.getByLabelText(/Safe email/)).toBeRequired();
  });
  it('saves only minimal assisted identity and offers the canonical proposed-matter route', async () => {
    service.create.mockResolvedValue({ client: { id: 'client-1', full_name: 'Jane Doe', access_type: 'ASSISTED', lifecycle_status: 'PROSPECTIVE' } });
    renderPage(); await selectCategory('INDIVIDUAL'); change(/Full legal name/, 'Jane Doe'); fillPrivacy();
    fireEvent.click(screen.getByRole('button', { name: 'Create prospective client' }));
    await screen.findByText('Prospective client created');
    expect(service.create).toHaveBeenCalledWith('admin', expect.objectContaining({ full_name: 'Jane Doe', client_type: 'INDIVIDUAL', access_type: 'ASSISTED' }));
    expect(service.create.mock.calls[0][1]).not.toHaveProperty('due_diligence');
    expect(service.invite).not.toHaveBeenCalled();
    expect(screen.getByText(/No matter has been opened/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Record proposed matter / Start conflict check' }));
    expect(screen.getByText('Proposed matter route')).toBeInTheDocument();
  });
  it('uses the same page and service for secretary', async () => {
    renderPage('/secretary/clients/create'); await selectCategory('INDIVIDUAL');
    expect(service.metadata).toHaveBeenCalledWith('secretary');
  });
});

describe('direct proposed-matter entry', () => {
  it('selects existing clients and advocates and submits structured parties without UUID inputs', async () => {
    service.options.mockResolvedValue({ clients: [{ value: 'client-id', label: 'Jane Doe' }], advocates: [{ value: 'lawyer-id', label: 'Advocate Jane' }] });
    service.proposedMatter.mockResolvedValue({ client_id: 'client-id', conflict_check: { reference_number: 'CF-1' } });
    render(<MemoryRouter><ProposedMatterEntryPage /></MemoryRouter>);
    await screen.findByLabelText(/Select existing client/);
    expect(screen.queryByText(/UUID|user ID|comma separated/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Legal client category/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create prospective client' })).toHaveAttribute('href', '/admin/clients/create');
    change(/Select existing client/, 'client-id'); change(/Responsible advocate/, 'lawyer-id');
    change(/working title/, 'Advice'); change(/Broad proposed instructions/, 'Broad advice'); change(/Party 1 name/, 'Other Company');
    fireEvent.click(screen.getByRole('button', { name: 'Add party' }));
    change(/Party 2 name/, 'Related Person'); change(/Party 2 role/, 'OTHER');
    fireEvent.click(screen.getByRole('button', { name: 'Record proposed matter / Start conflict check' }));
    await waitFor(() => expect(service.proposedMatter).toHaveBeenCalled());
    expect(service.proposedMatter.mock.calls[0][1]).toMatchObject({ client_id: 'client-id', proposed_matter: { responsible_lawyer_id: 'lawyer-id', parties: [{ name: 'Other Company' }, { name: 'Related Person', role: 'OTHER' }] } });
  });
});
