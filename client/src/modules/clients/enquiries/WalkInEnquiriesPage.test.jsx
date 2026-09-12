import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WalkInEnquiriesPage from './WalkInEnquiriesPage';
import service from './walkInEnquiryService';
import { emptyEnquiry, enquiryPayload } from './enquiryForm';

vi.mock('./walkInEnquiryService', () => ({ default: { list: vi.fn(), create: vi.fn() } }));
const enquiry = {
  id: '1', reference: 'ENQ-2026-00001', received_at: '2026-09-12T06:30:00Z',
  created_at: '2026-09-12T06:30:00Z', visitor_name: 'Jane Visitor', service_category: 'Employment',
  urgency_label: 'No known urgency', status_label: 'Received — awaiting preliminary review', received_by_name: 'Receiving Staff',
};
async function openForm(workspace = 'admin') {
  const user = userEvent.setup();
  render(<WalkInEnquiriesPage workspace={workspace} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'New walk-in enquiry' })).toBeEnabled());
  await user.click(screen.getByRole('button', { name: 'New walk-in enquiry' }));
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
});
describe('Walk-in enquiry register', () => {
  it('renders minimal form, warning and Nairobi date input', async () => {
    await openForm();
    expect(screen.getByRole('heading', { name: 'Walk-in Enquiries' })).toBeInTheDocument();
    expect(screen.getByText(/Recording an enquiry does not mean/)).toBeInTheDocument();
    expect(screen.getByLabelText('Date/time received (Africa/Nairobi)')).toHaveValue(emptyEnquiry().received_at);
    expect(screen.getByLabelText('Very short non-confidential description')).toHaveAttribute('maxlength', '500');
    expect(document.querySelector('input[type=file]')).toBeNull();
    expect(screen.queryByText(/National ID|KRA PIN|Passport/)).not.toBeInTheDocument();
  });
  it('shows and validates conditional organisation and urgency fields', async () => {
    const user = await openForm();
    expect(screen.queryByLabelText(/Organisation name/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Brief urgency note/)).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Visitor type'), 'ORGANISATION_REPRESENTATIVE');
    await user.selectOptions(screen.getByLabelText('Urgency type'), 'COURT_DATE');
    expect(screen.getByLabelText(/Organisation name/)).toBeRequired();
    expect(screen.getByLabelText(/Brief urgency note/)).toBeRequired();
    await user.click(screen.getByRole('button', { name: 'Record enquiry' }));
    expect(screen.getByText('Organisation name is required.')).toBeInTheDocument();
    expect(screen.getByText('A brief urgency note is required.')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Visitor type'), 'INDIVIDUAL');
    await user.selectOptions(screen.getByLabelText('Urgency type'), 'NONE');
    expect(screen.queryByLabelText(/Organisation name/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Brief urgency note/)).not.toBeInTheDocument();
  });
  it('requires privacy acknowledgement', async () => {
    const user = await openForm(); await fillRequired(user);
    await user.click(screen.getByRole('button', { name: 'Record enquiry' }));
    expect(service.create).not.toHaveBeenCalled();
    expect(screen.getByText('The visitor must acknowledge the privacy notice.')).toBeInTheDocument();
  });
  it('converts related-party lines and Nairobi time', () => {
    const form = { ...emptyEnquiry(), received_at: '2026-09-12T09:30', related_party_names: '  ABC Limited \r\n\n John Doe  \n  ' };
    expect(enquiryPayload(form)).toMatchObject({ related_party_names: ['ABC Limited', 'John Doe'], received_at: '2026-09-12T06:30:00.000Z', critical_date: null });
  });
  it('submits for secretary, shows reference, updates register and resets/closes form', async () => {
    const user = await openForm('secretary'); await fillRequired(user);
    await user.type(screen.getByLabelText(/Known opposing or related-party names/), '  ABC Limited\n\n John Doe ');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Record enquiry' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('ENQ-2026-00001 — Received — awaiting preliminary review'));
    expect(service.create).toHaveBeenCalledWith('secretary', expect.objectContaining({ privacy_acknowledged: true, related_party_names: ['ABC Limited', 'John Doe'] }));
    expect(screen.queryByRole('button', { name: 'Record enquiry' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Receiving Staff').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Create client|Open matter|Start conflict check/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'New walk-in enquiry' }));
    expect(screen.getByLabelText(/Visitor’s full name/)).toHaveValue('');
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
  it('displays API failure and field errors while preserving data', async () => {
    service.create.mockRejectedValue({ response: { data: { message: 'Please correct the highlighted errors.', errors: { safe_contact: 'Choose a safe contact method.' } } } });
    const user = await openForm(); await fillRequired(user);
    await user.click(screen.getByRole('checkbox'));
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
