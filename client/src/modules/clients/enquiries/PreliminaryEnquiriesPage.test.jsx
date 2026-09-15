import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Page from './PreliminaryEnquiriesPage';
import service from './preliminaryReviewService';
vi.mock('./preliminaryReviewService', () => ({ default: { list: vi.fn(), detail: vi.fn(), act: vi.fn() } }));
const review = { id: 'r1', revision: 1, state: 'REVIEW', prospective_name: 'Jane Visitor', entity_kind: 'PERSON', visitor_capacity: '',
  service_category: 'Employment', working_title: 'Employment proposal', adverse_parties: [], related_parties: [], forum: '', urgency: 'NONE', critical_date: null, preliminary_note: '', missing_fields: [] };
const row = { id: 'e1', reference: 'ENQ-1', visitor_name: 'Jane Visitor', safe_contact: 'Call after 5pm', status_label: 'Awaiting preliminary review', review };
const queue = { enquiries: [row], lawyers: [{ id: 'l1', name: 'Advocate One' }], secretaries: [{ id: 's1', name: 'Secretary One' }] };
beforeEach(() => { vi.clearAllMocks(); service.list.mockResolvedValue(queue); service.detail.mockResolvedValue(row); service.act.mockResolvedValue(row); });
async function open(workspace, overrides = {}) {
  service.detail.mockResolvedValue({ ...row, ...overrides });
  const user = userEvent.setup(); render(<MemoryRouter><Page workspace={workspace} /></MemoryRouter>);
  await user.click(await screen.findByRole('button', { name: 'Review ENQ-1' }));
  return user;
}
describe('Preliminary enquiry role workflows', () => {
  it('lets administrator assign an active lawyer but gives no disposition or conversion controls', async () => {
    const user = await open('admin', { review: null });
    await user.selectOptions(screen.getByLabelText('Assign active advocate'), 'l1');
    await user.click(screen.getByRole('button', { name: 'Assign to lawyer' }));
    expect(service.act).toHaveBeenCalledWith('admin', 'e1', 'assign', { lawyer_id: 'l1', reason: '' });
    expect(screen.queryByLabelText('Preliminary disposition')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create authorised records' })).not.toBeInTheDocument();
  });
  it('requires a reassignment reason', async () => {
    const user = await open('admin');
    expect(screen.getByLabelText('Reassignment reason')).toBeRequired();
    await user.selectOptions(screen.getByLabelText('Assign active advocate'), 'l1');
    await user.type(screen.getByLabelText('Reassignment reason'), 'Unavailable');
    await user.click(screen.getByRole('button', { name: 'Assign to lawyer' }));
    expect(service.act).toHaveBeenCalledWith('admin', 'e1', 'assign', expect.objectContaining({ revision: 1, reason: 'Unavailable' }));
  });
  it.each(['PROCEED_TO_CONFLICT_SCREENING', 'REQUEST_MINIMUM_INFORMATION', 'REFER_ELSEWHERE', 'DECLINE_AT_PRELIMINARY_STAGE', 'URGENT_REVIEW_REQUIRED'])('records %s with lawyer reason', async outcome => {
    const user = await open('lawyer');
    expect(screen.getByText(/Record only information required/)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Preliminary disposition'), outcome);
    const reason = screen.getByLabelText('Disposition reason — restricted to assigned advocate');
    expect(reason).toBeRequired();
    await user.type(reason, 'Minimum preliminary reason');
    if (outcome === 'REQUEST_MINIMUM_INFORMATION') await user.click(screen.getByRole('checkbox', { name: 'Prospective person or organisation name' }));
    await user.click(screen.getByRole('button', { name: 'Record lawyer disposition' }));
    expect(service.act).toHaveBeenCalledWith('lawyer', 'e1', 'decide', expect.objectContaining({ outcome, reason: 'Minimum preliminary reason', revision: 1 }));
  });
  it('records explicit secretary creation assignment', async () => {
    const user = await open('lawyer');
    await user.selectOptions(screen.getByLabelText('Preliminary disposition'), 'PROCEED_TO_CONFLICT_SCREENING');
    await user.type(screen.getByLabelText('Disposition reason — restricted to assigned advocate'), 'Ready');
    await user.selectOptions(screen.getByLabelText('Authorised execution'), 'ASSIGN_CREATION_TO_SECRETARY');
    await user.selectOptions(screen.getByLabelText('Administrative secretary (optional for follow-up)'), 's1');
    await user.click(screen.getByRole('button', { name: 'Record lawyer disposition' }));
    expect(service.act).toHaveBeenCalledWith('lawyer', 'e1', 'decide', expect.objectContaining({ execution: 'ASSIGN_CREATION_TO_SECRETARY', secretary_id: 's1' }));
  });
  it('secretary can return only requested identification fields', async () => {
    const user = await open('secretary', { review: { ...review, state: 'INFORMATION', missing_fields: ['prospective_name'], secretary_id: 's1' } });
    expect(screen.queryByLabelText('Preliminary disposition')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Short non-confidential preliminary note')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Broad proposed legal service')).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText('Prospective person or organisation name'));
    await user.type(screen.getByLabelText('Prospective person or organisation name'), 'Jane Corrected');
    await user.click(screen.getByRole('button', { name: 'Return information to lawyer' }));
    expect(service.act).toHaveBeenCalledWith('secretary', 'e1', 'follow_up', { revision: 1, changes: { prospective_name: 'Jane Corrected' } });
  });
  it.each(['lawyer', 'secretary'])('%s can execute only the recorded choice', async workspace => {
    const user = await open(workspace, { review: { ...review, state: 'AUTHORISED', execution: workspace === 'lawyer' ? 'CREATE_NOW_BY_LAWYER' : 'ASSIGN_CREATION_TO_SECRETARY' } });
    await user.click(screen.getByRole('button', { name: 'Create authorised records' }));
    expect(service.act).toHaveBeenCalledWith(workspace, 'e1', 'convert', {});
  });
  it('secretary has no unassigned conversion button', async () => {
    await open('secretary', { review: { ...review, state: 'AUTHORISED', execution: 'CREATE_NOW_BY_LAWYER' } });
    expect(screen.queryByRole('button', { name: 'Create authorised records' })).not.toBeInTheDocument();
  });
  it('requires positive identity verification for existing-prospect linkage', async () => {
    const user = await open('lawyer', { review: { ...review, state: 'AUTHORISED', execution: 'CREATE_NOW_BY_LAWYER' } });
    await user.type(screen.getByLabelText(/Existing prospective-client ID/), 'existing-id');
    expect(screen.getByRole('checkbox')).toBeRequired();
    await user.click(screen.getByRole('checkbox'));
    await user.type(screen.getByLabelText('Identity verification basis'), 'Compared the prior reference');
    await user.click(screen.getByRole('button', { name: 'Create authorised records' }));
    expect(service.act).toHaveBeenCalledWith('lawyer', 'e1', 'convert', expect.objectContaining({ identity_verified: true, existing_client_id: 'existing-id' }));
  });
  it('keeps inputs after rejection and offers reload', async () => {
    service.act.mockRejectedValue({ response: { data: { message: 'Revision changed' } } });
    const user = await open('lawyer', { review: { ...review, state: 'AUTHORISED', execution: 'CREATE_NOW_BY_LAWYER' } });
    await user.click(screen.getByRole('button', { name: 'Create authorised records' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Revision changed');
    await user.click(screen.getByRole('button', { name: 'Reload enquiry' }));
    await waitFor(() => expect(service.detail).toHaveBeenCalledTimes(2));
  });
  it('uses responsive wrapping and never presents merits or upload fields', async () => {
    await open('lawyer');
    expect(screen.getByLabelText('Prospective person or organisation name').closest('.grid')).toHaveClass('md:grid-cols-2');
    expect(document.querySelector('main')).toHaveClass('min-w-0', '[overflow-wrap:anywhere]');
    expect(document.querySelector('input[type=file]')).toBeNull();
    expect(screen.queryByLabelText(/evidence|strategy|legal advice/i)).not.toBeInTheDocument();
  });
});
