import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WalkInEnquiriesPage from './WalkInEnquiriesPage';
import service from './walkInEnquiryService';
import { emptyEnquiry, enquiryPayload, validateEnquiry } from './enquiryForm';

vi.mock('./walkInEnquiryService', () => ({ default: { list: vi.fn(), create: vi.fn(), notice: vi.fn(), deliver: vi.fn(), history: vi.fn(), correct: vi.fn(), configure: vi.fn() } }));
const enquiry = {
  ...emptyEnquiry(), revision: 0, id: '1', reference: 'ENQ-2026-00001', received_at: '2026-09-12T06:30:00Z',
  created_at: '2026-09-12T06:30:00Z', visitor_name: 'Jane Visitor', service_category: 'Employment',
  urgency_label: 'No known urgency', status_label: 'Received — awaiting preliminary review', received_by_name: 'Receiving Staff',
};
const notice = { ready: true, missing_fields: [], notice: { version: 'KE-INTAKE-1:test-v1:123', sections: [
  { title: 'Data controller', text: 'Test Firm, privacy@example.com, Nairobi' },
  { title: 'Acknowledgement is not consent', text: 'Lawful basis: legitimate interests; acknowledgement is not consent.' },
] } };
const delivery = { id: 'receipt-1', method: 'SCREEN', version: notice.notice.version, delivered_at: '2026-09-13T09:00:00Z' };
async function openForm(workspace = 'admin', deliver = true) {
  const user = userEvent.setup();
  render(<WalkInEnquiriesPage workspace={workspace} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'New walk-in enquiry' })).toBeEnabled());
  await user.click(screen.getByRole('button', { name: 'New walk-in enquiry' }));
  await screen.findByRole('region', { name: 'Intake privacy notice' });
  if (deliver) {
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Confirm notice delivery and continue' }));
    await screen.findByLabelText(/Visitor’s full name/);
  }
  return user;
}
async function fillRequired(user) {
  await user.type(screen.getByLabelText(/Visitor’s full name/), 'Jane Visitor');
  await user.type(screen.getByLabelText(/Safe telephone number or contact method/), 'Call after 5pm');
  await user.type(screen.getByLabelText(/Broad legal-service category/), 'Employment');
  await user.type(screen.getByLabelText('Very short non-confidential description'), 'Employment enquiry');
}
beforeEach(() => {
  vi.clearAllMocks();
  service.list.mockResolvedValue([]);
  service.create.mockResolvedValue(enquiry);
  service.notice.mockResolvedValue(notice);
  service.deliver.mockResolvedValue(delivery);
  service.history.mockResolvedValue([]);
});
describe('Walk-in enquiry register', () => {
  it('renders minimal form, warning and optional Nairobi time override', async () => {
    await openForm();
    expect(screen.getByRole('heading', { name: 'Walk-in Enquiries' })).toBeInTheDocument();
    expect(screen.getByText(/Recording an enquiry does not mean/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Received time (Africa/Nairobi)')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Enter a different received time')).not.toBeChecked();
    expect(screen.getByLabelText('Very short non-confidential description')).toHaveAttribute('maxlength', '500');
    expect(document.querySelector('input[type=file]')).toBeNull();
    expect(screen.queryByText(/National ID|KRA PIN|Passport/)).not.toBeInTheDocument();
  });
  it('shows and validates conditional organisation and urgency fields', async () => {
    const user = await openForm();
    expect(screen.queryByLabelText(/Organisation name/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Brief urgency note/)).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Who is the enquiry for?'), 'ORGANISATION');
    await user.selectOptions(screen.getByLabelText('Urgency type'), 'COURT_DATE');
    expect(screen.getByLabelText(/Organisation name/)).toBeRequired();
    expect(screen.getByLabelText(/Brief urgency note/)).toBeRequired();
    await user.click(screen.getByRole('button', { name: 'Record enquiry' }));
    expect(screen.getByText('Organisation name is required.')).toBeInTheDocument();
    expect(screen.getByText('A brief urgency note is required.')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Who is the enquiry for?'), 'SELF');
    await user.selectOptions(screen.getByLabelText('Urgency type'), 'NONE');
    expect(screen.queryByLabelText(/Organisation name/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Brief urgency note/)).not.toBeInTheDocument();
  });
  it('requires notice acknowledgement and server delivery before any personal input', async () => {
    const user = await openForm('admin', false);
    expect(screen.queryByLabelText(/Visitor’s full name/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Record enquiry' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm notice delivery and continue' })).toBeDisabled();
    await user.click(screen.getByRole('checkbox'));
    expect(service.deliver).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirm notice delivery and continue' }));
    await screen.findByLabelText(/Visitor’s full name/);
    expect(service.deliver).toHaveBeenCalledWith('admin', { version: notice.notice.version, method: 'SCREEN', acknowledged: true });
    const privacyRegion = screen.getByRole('region', { name: 'Intake privacy notice' });
    expect(privacyRegion.compareDocumentPosition(screen.getByLabelText(/Visitor’s full name/)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(service.create).not.toHaveBeenCalled();
  });
  it('converts related-party lines and Nairobi time', () => {
    const form = { ...emptyEnquiry(), override_received_time: true, received_at: '2026-09-12T09:30', related_party_names: '  ABC Limited \r\n\n John Doe  \n  ' };
    expect(enquiryPayload(form)).toMatchObject({ related_party_names: ['ABC Limited', 'John Doe'], received_at: '2026-09-12T06:30:00.000Z', critical_date: null });
  });
  it('submits for secretary, shows reference, updates register and resets/closes form', async () => {
    const user = await openForm('secretary'); await fillRequired(user);
    await user.type(screen.getByLabelText(/Known opposing or related-party names/), '  ABC Limited\n\n John Doe ');
    await user.click(screen.getByRole('button', { name: 'Record enquiry' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('ENQ-2026-00001 — Received — awaiting preliminary review'));
    expect(service.create).toHaveBeenCalledWith('secretary', expect.objectContaining({ privacy_acknowledged: true, notice_receipt: delivery.id, related_party_names: ['ABC Limited', 'John Doe'] }));
    expect(screen.queryByRole('button', { name: 'Record enquiry' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Receiving Staff').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Create client|Open matter|Start conflict check/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'New walk-in enquiry' }));
    await screen.findByRole('region', { name: 'Intake privacy notice' });
    expect(screen.queryByLabelText(/Visitor’s full name/)).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
  it('displays API failure and field errors while preserving data', async () => {
    service.create.mockRejectedValue({ response: { data: { message: 'Please correct the highlighted errors.', errors: { safe_contact: 'Choose a safe contact method.' } } } });
    const user = await openForm(); await fillRequired(user);
    await user.click(screen.getByRole('button', { name: 'Record enquiry' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Please correct the highlighted errors.');
    expect(screen.getByText('Choose a safe contact method.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Visitor’s full name/)).toHaveValue('Jane Visitor');
  });
  it('renders register in desktop table and mobile cards', async () => {
    service.list.mockResolvedValue([enquiry]); render(<WalkInEnquiriesPage />);
    await screen.findByRole('table');
    for (const value of ['ENQ-2026-00001', 'Jane Visitor', 'Employment', 'No known urgency', 'Received — awaiting preliminary review', 'Receiving Staff']) expect(screen.getAllByText(value)).toHaveLength(2);
    const dateText = new Intl.DateTimeFormat('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(enquiry.received_at));
    expect(screen.getAllByText(dateText)).toHaveLength(2);
  });
  it('displays denied register access and disables creation', async () => {
    service.list.mockRejectedValue({ response: { data: { message: 'Client-intake authority required.' } } });
    render(<WalkInEnquiriesPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Client-intake authority required.');
    expect(screen.getByRole('button', { name: 'New walk-in enquiry' })).toBeDisabled();
  });
});

describe('Step 1 privacy, representation and corrections', () => {
  it('blocks capture when firm configuration is missing', async () => {
    service.notice.mockResolvedValue({ ready: false, missing_fields: ['privacy_contact'], notice: null });
    render(<WalkInEnquiriesPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('privacy_contact');
    expect(screen.getByRole('button', { name: 'New walk-in enquiry' })).toBeDisabled();
    expect(screen.queryByLabelText(/Visitor’s full name/)).not.toBeInTheDocument();
  });
  it('keeps fields hidden after notice-delivery failure', async () => {
    service.deliver.mockRejectedValue(new Error('offline'));
    const user = await openForm('admin', false);
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Confirm notice delivery and continue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to record notice delivery');
    expect(screen.queryByLabelText(/Visitor’s full name/)).not.toBeInTheDocument();
  });
  it('captures another person with capacity and pending authority', async () => {
    const user = await openForm(); await fillRequired(user);
    await user.selectOptions(screen.getByLabelText('Who is the enquiry for?'), 'OTHER');
    await user.click(screen.getByRole('button', { name: 'Record enquiry' }));
    expect(screen.getByText('Prospective person name is required.')).toBeInTheDocument();
    expect(screen.getByText('Relationship or capacity is required.')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Prospective person name/), 'Test Beneficiary');
    await user.type(screen.getByLabelText(/Visitor relationship or capacity/), 'Sibling');
    await user.click(screen.getByRole('button', { name: 'Record enquiry' }));
    await waitFor(() => expect(service.create).toHaveBeenCalledWith('admin', expect.objectContaining({ enquiry_for: 'OTHER', authority_status: 'PENDING', prospective_person_name: 'Test Beneficiary', visitor_capacity: 'Sibling' })));
  });
  it('submits an organisation without stale person fields', async () => {
    const user = await openForm(); await fillRequired(user);
    await user.selectOptions(screen.getByLabelText('Who is the enquiry for?'), 'ORGANISATION');
    await user.type(screen.getByLabelText(/Organisation name/), 'Test Organisation');
    await user.type(screen.getByLabelText(/Visitor relationship or capacity/), 'Director');
    await user.selectOptions(screen.getByLabelText('Authority status'), 'CLAIMED');
    await user.click(screen.getByRole('button', { name: 'Record enquiry' }));
    await waitFor(() => expect(service.create).toHaveBeenCalledWith('admin', expect.objectContaining({ enquiry_for: 'ORGANISATION', organisation_name: 'Test Organisation', prospective_person_name: '', authority_status: 'CLAIMED' })));
  });
  it('omits received time by default and never turns acknowledgement into consent', () => {
    const payload = enquiryPayload({ ...emptyEnquiry(), privacy_acknowledged: true });
    expect(payload).not.toHaveProperty('received_at');
    expect(payload).not.toHaveProperty('consent');
    expect(payload).not.toHaveProperty('lawful_basis');
    const form = { ...emptyEnquiry(), override_received_time: true, received_at: '2999-01-01T12:00' };
    expect(validateEnquiry(form)).toHaveProperty('received_at');
    expect(validateEnquiry(form)).toHaveProperty('received_at_reason');
  });
  it('shows server rejection without losing representative input', async () => {
    service.create.mockRejectedValue({ response: { data: { message: 'Notice changed. Reload the notice.', errors: { notice_receipt: 'Notice expired.' } } } });
    const user = await openForm(); await fillRequired(user);
    await user.click(screen.getByRole('button', { name: 'Record enquiry' }));
    expect(await screen.findByText('Notice expired.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Visitor’s full name/)).toHaveValue('Jane Visitor');
  });
  it('records corrections with a reason and displays previous and replacement values', async () => {
    const row = { ...enquiry, safe_contact: 'Call after 5pm', description: 'Employment enquiry' };
    service.list.mockResolvedValue([row]);
    const replacement = { ...row, visitor_name: 'Jane Corrected', revision: 1 };
    service.correct.mockResolvedValue(replacement);
    const user = userEvent.setup(); render(<WalkInEnquiriesPage />);
    await screen.findByRole('table');
    await user.click(screen.getAllByRole('button', { name: 'View details' })[0]);
    await user.click(await screen.findByRole('button', { name: 'Correct this enquiry' }));
    await user.clear(screen.getByLabelText(/Visitor’s full name/));
    await user.type(screen.getByLabelText(/Visitor’s full name/), 'Jane Corrected');
    await user.click(screen.getByRole('button', { name: 'Record correction' }));
    expect(screen.getByText('A correction reason is required.')).toBeInTheDocument();
    expect(service.correct).not.toHaveBeenCalled();
    service.history.mockResolvedValue([{ id: 'h1', actor_name: 'Owner', recorded_at: delivery.delivered_at, reason: 'Spelling correction', revision: 1, previous_values: { visitor_name: 'Jane Visitor' }, replacement_values: { visitor_name: 'Jane Corrected' } }]);
    await user.type(screen.getByLabelText('Correction reason'), 'Spelling correction');
    await user.click(screen.getByRole('button', { name: 'Record correction' }));
    await waitFor(() => expect(service.correct).toHaveBeenCalledWith('admin', row.id, expect.objectContaining({ revision: 0, reason: 'Spelling correction', changes: expect.objectContaining({ visitor_name: 'Jane Corrected' }) })));
    expect(await screen.findByText('visitor name — previous:')).toBeInTheDocument();
    expect(screen.getByText('Replacement:')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });
  it('allows secretary history viewing but offers no correction or configuration action', async () => {
    service.list.mockResolvedValue([enquiry]);
    const user = userEvent.setup(); render(<WalkInEnquiriesPage workspace='secretary' />);
    await screen.findByRole('table');
    await user.click(screen.getAllByRole('button', { name: 'View details' })[0]);
    expect(await screen.findByText('No corrections recorded.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Correct this enquiry' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Configure intake privacy notice' })).not.toBeInTheDocument();
    expect(screen.getByText(/legacy enquiry/)).toBeInTheDocument();
  });
  it('uses wrapping results and stacked fields for narrow screens', async () => {
    service.list.mockResolvedValue([{ ...enquiry, visitor_name: 'A'.repeat(255) }]);
    const user = await openForm();
    const table = screen.getByRole('table');
    expect(table).toHaveClass('table-fixed');
    expect(table.querySelector('th')).toHaveClass('whitespace-normal');
    expect(table.querySelector('td')).toHaveClass('[overflow-wrap:anywhere]');
    expect(screen.getAllByText('A'.repeat(255))[0]).toHaveClass('min-w-0');
    await user.selectOptions(screen.getByLabelText('Who is the enquiry for?'), 'OTHER');
    expect(screen.getByLabelText(/Prospective person name/).closest('.grid')).toHaveClass('md:grid-cols-2');
  });
});

describe('Step 1 recovery and configuration', () => {
  it.each(['READ_ALOUD', 'PAPER'])('records %s notice delivery before capture', async (method) => {
    const user = await openForm('admin', false);
    await user.selectOptions(screen.getByLabelText('How was the notice provided?'), method);
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Confirm notice delivery and continue' }));
    await screen.findByLabelText(/Visitor’s full name/);
    expect(service.deliver).toHaveBeenCalledWith('admin', expect.objectContaining({ method }));
  });
  it('requires a reason when the received time override is enabled', async () => {
    const user = await openForm(); await fillRequired(user);
    expect(screen.queryByLabelText('Received time (Africa/Nairobi)')).not.toBeInTheDocument();
    await user.click(screen.getByLabelText('Enter a different received time'));
    await user.type(screen.getByLabelText('Received time (Africa/Nairobi)'), '2026-01-01T09:00');
    await user.click(screen.getByRole('button', { name: 'Record enquiry' }));
    expect(screen.getByText('A reason is required for an entered received time.')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Reason for entered received time/), 'Delayed entry');
    await user.click(screen.getByRole('button', { name: 'Record enquiry' }));
    await waitFor(() => expect(service.create).toHaveBeenCalledWith('admin', expect.objectContaining({ received_at: '2026-01-01T06:00:00.000Z', received_at_reason: 'Delayed entry' })));
  });
  it('explains administrator configuration to secretary and allows admin to save labelled policy fields', async () => {
    service.notice.mockResolvedValue({ ready: false, missing_fields: ['retention'], configuration: null });
    const user = userEvent.setup();
    const { unmount } = render(<WalkInEnquiriesPage workspace='secretary' />);
    expect(await screen.findByRole('alert')).toHaveTextContent('the firm administrator completes');
    unmount(); render(<WalkInEnquiriesPage />);
    await user.click(await screen.findByRole('button', { name: 'Configure intake privacy notice' }));
    expect(screen.getByLabelText('Approved lawful basis')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Policy version/), 'v2');
    for (const label of ['Lawful basis rationale, including representatives and third-party names', 'Any law requiring collection, or state that none applies', 'Recipient identities/categories, processors and sharing safeguards', 'Retention period, trigger and lawful exceptions', 'Privacy contact name or role and contact details', 'Overseas transfers, destinations and safeguards, or explicit no-transfer statement', 'Actual technical and organisational security safeguards']) {
      await user.type(screen.getByLabelText(label), 'Approved test configuration');
    }
    service.configure.mockResolvedValue(notice); service.notice.mockResolvedValue(notice);
    await user.click(screen.getByRole('button', { name: 'Save approved notice configuration' }));
    await waitFor(() => expect(service.configure).toHaveBeenCalledWith('admin', expect.objectContaining({ policy_version: 'v2', retention: 'Approved test configuration' })));
    await waitFor(() => expect(screen.getByRole('button', { name: 'New walk-in enquiry' })).toBeEnabled());
  });
  it('shows stale revision recovery without silently overwriting', async () => {
    const row = { ...enquiry, safe_contact: 'Call after 5pm', description: 'Employment enquiry' };
    service.list.mockResolvedValue([row]);
    service.correct.mockRejectedValue({ response: { data: { message: 'This enquiry changed.', errors: { revision: 'Reload before correcting it.' } } } });
    const user = userEvent.setup(); render(<WalkInEnquiriesPage />);
    await screen.findByRole('table');
    await user.click(screen.getAllByRole('button', { name: 'View details' })[0]);
    await user.click(await screen.findByRole('button', { name: 'Correct this enquiry' }));
    await user.type(screen.getByLabelText(/Visitor’s full name/), ' corrected');
    await user.type(screen.getByLabelText('Correction reason'), 'Spelling');
    await user.click(screen.getByRole('button', { name: 'Record correction' }));
    expect(await screen.findByText(/Your correction has not been saved/)).toBeInTheDocument();
    service.list.mockResolvedValue([{ ...row, revision: 2 }]);
    await user.click(screen.getByRole('button', { name: 'Reload latest enquiry' }));
    expect(await screen.findByText(/Latest enquiry loaded/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Record correction' })).not.toBeInTheDocument();
  });
});
