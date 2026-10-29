import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from '@/core/api/axios';
import Swal from '@/core/utils/themedSwal';
import { MemoryRouter } from 'react-router-dom';
import ClientArrivalsPage from './ClientArrivalsPage';
vi.mock('@/core/api/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('@/core/utils/themedSwal', () => ({ default: { fire: vi.fn() } }));
const base = { role: 'SECRETARY', has_receptionist: false, can_receive: true, clients: [], advocates: [{ value: 'a1', label: 'Advocate One' }], visits: [] };
function show(data) {
  axios.get.mockResolvedValue({ data });
  return render(<MemoryRouter><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ClientArrivalsPage /></QueryClientProvider></MemoryRouter>);
}
beforeEach(() => vi.clearAllMocks());
describe('client arrival staffing flows', () => {
  it('sends the advocate who took instructions to create the prospective client', async () => {
    show({ ...base, role: 'ADVOCATE', can_receive: false, visits: [{ id: 'v1', visitor_name: 'Peter Kamau', advocate: 'a1', status: 'COMPLETED', intake_completed_at: '2026-10-26T08:00:00Z', intake_handler: 'ADVOCATE', outcome: 'INSTRUCTING', file_due: true, can_consult: true }] });
    expect(await screen.findByText('Create the prospective client record today')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Create prospective client' }).getAttribute('href')).toBe('/lawyer/clients/create?visit=v1');
  });
  it('shows a practising owner only their consultations, not the arrivals register', async () => {
    show({ ...base, role: 'ADMIN', can_receive: false, visits: [{ id: 'v1', visitor_name: 'Waiting Visitor', advocate: 'a1', status: 'WAITING' }] });
    expect(await screen.findByRole('heading', { name: 'My consultations' })).toBeTruthy();
    expect(screen.getByText('Waiting for you (1)')).toBeTruthy();
    expect(screen.queryByText('Record arrival')).toBeNull();
    expect(screen.queryByText(/Office & queue/i)).toBeNull();
  });
  it('secretary records only basic arrival and notifies the advocate', async () => {
    axios.post.mockResolvedValue({ data: {} });
    show(base);
    await screen.findByText('Record arrival');
    expect(screen.queryByLabelText('Broad nature of enquiry')).toBeNull();
    fireEvent.change(screen.getByLabelText(/Visitor name/), { target: { value: 'A Visitor' } });
    fireEvent.change(screen.getByLabelText(/Phone number/), { target: { value: '0712345678' } });
    fireEvent.change(screen.getByLabelText(/^Advocate/), { target: { value: 'a1' } });
    fireEvent.click(screen.getByText('Add to queue & alert advocate'));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/arrivals/', { visitor_name: 'A Visitor', visitor_phone: '0712345678', client: null, appointment: null, advocate: 'a1', urgency_flag: false, urgency_note: '' }));
    await waitFor(() => expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ icon: 'success', title: 'Added to queue' })));
    expect(screen.getByLabelText(/Visitor name/).value).toBe('');
  });
  it('lets a solo advocate record a walk-in and start the consultation, with no queue to call from', async () => {
    axios.post.mockResolvedValue({ data: { status: 'IN_CONSULTATION' } });
    show({ ...base, role: 'ADMIN', self_reception: true, queues: [{ advocate: 'a1', advocate_name: 'Advocate One' }] });
    expect(await screen.findByRole('heading', { name: 'Walk-in consultations' })).toBeTruthy();
    expect(screen.queryByLabelText(/^Advocate/)).toBeNull();
    fireEvent.change(screen.getByLabelText(/Visitor name/), { target: { value: 'Peter Kioko' } });
    fireEvent.change(screen.getByLabelText(/Phone number/), { target: { value: '0722456789' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start consultation' }));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/arrivals/', expect.objectContaining({ visitor_name: 'Peter Kioko', advocate: 'a1' })));
    await waitFor(() => expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ title: 'Consultation started' })));
    expect(screen.queryByText(/Call this client|Client ushered in/)).toBeNull();
  });
  it('offers a returning visitor from the register and fills the arrival', async () => {
    axios.get.mockImplementation(async (url) => ({ data: url === '/arrivals/visitors/'
      ? [{ visitor_name: 'John Mutua Ndeti', visitor_phone: '0722000111', visit_count: 2, last_arrival_at: '2026-10-28T08:00:00Z', last_advocate_name: 'Grace Wanjiku', client: 'c1', client_name: 'John Mutua Ndeti' }]
      : base }));
    render(<MemoryRouter><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ClientArrivalsPage /></QueryClientProvider></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText(/Phone number/), { target: { value: '0722' } });
    fireEvent.click(await screen.findByRole('button', { name: 'This is the visitor' }));
    expect(axios.get).toHaveBeenCalledWith('/arrivals/visitors/', { params: { q: '0722' } });
    expect(screen.getByLabelText(/Visitor name/).value).toBe('John Mutua Ndeti');
    expect(screen.getByLabelText(/Phone number/).value).toBe('0722000111');
    expect(screen.getByText('Client record: John Mutua Ndeti')).toBeTruthy();
    expect(screen.queryByText('Returning visitor?')).toBeNull();
  });
  it('puts clients expected today first and links the arrival to their appointment', async () => {
    axios.post.mockResolvedValue({ data: {} });
    show({ ...base, expected_today: [
      { appointment: 'm1', starts_at: '2026-10-29T07:30:00Z', title: 'Client meeting', matter: 'MAC/2026/001', client: 'c1', client_name: 'Jane Wambui', client_phone: '+254711222333', advocate: 'a1', advocate_name: 'Advocate One', arrived: false },
      { appointment: 'm2', starts_at: '2026-10-29T09:00:00Z', title: 'Client meeting', matter: 'MAC/2026/002', client: 'c2', client_name: 'Paul Otieno', client_phone: '', advocate: 'a1', advocate_name: 'Advocate One', arrived: true },
    ] });
    expect(await screen.findByText('Expected today (2)')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Has arrived' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Has arrived' }));
    expect(screen.getByText('Client record: Jane Wambui')).toBeTruthy();
    expect(screen.getByLabelText(/Visitor name/).value).toBe('Jane Wambui');
    fireEvent.click(screen.getByText('Add to queue & alert advocate'));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/arrivals/', expect.objectContaining({ client: 'c1', appointment: 'm1', advocate: 'a1', visitor_phone: '+254711222333' })));
  });
  it('finds an existing client without an appointment by an identifier', async () => {
    axios.get.mockImplementation(async (url) => ({ data: url === '/arrivals/clients/'
      ? [{ value: 'c3', label: 'Mary Njeri', phone: '0733000444', identifier: '••••5678', file_reference: 'K-0003' }]
      : base }));
    render(<MemoryRouter><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ClientArrivalsPage /></QueryClientProvider></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText(/Find an existing client/), { target: { value: '12345678' } });
    fireEvent.click(await screen.findByRole('button', { name: 'This is the client' }));
    expect(axios.get).toHaveBeenCalledWith('/arrivals/clients/', { params: { q: '12345678' } });
    expect(screen.getByText('Client record: Mary Njeri')).toBeTruthy();
    expect(screen.getByText('Existing client, no appointment today')).toBeTruthy();
    expect(screen.getByLabelText(/Phone number/).value).toBe('0733000444');
  });
  it('stops an existing client being recorded as a stranger when their name is typed', async () => {
    axios.get.mockImplementation(async (url) => ({ data: url === '/arrivals/visitors/'
      ? [{ visitor_name: 'Mary Njeri', visitor_phone: '+254733000444', visit_count: 0, last_arrival_at: null, last_advocate_name: '', client: 'c3', client_name: 'Mary Njeri' }]
      : base }));
    render(<MemoryRouter><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ClientArrivalsPage /></QueryClientProvider></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText(/Visitor name/), { target: { value: 'Mary' } });
    expect(await screen.findByText('Returning visitor or existing client?')).toBeTruthy();
    expect(screen.getByText('Client record · no walk-in visit recorded yet')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'This is the client' }));
    expect(screen.getByText('Client record: Mary Njeri')).toBeTruthy();
    expect(screen.getByLabelText(/Phone number/).value).toBe('+254733000444');
  });
  it('shows a save error without clearing the arrival details', async () => {
    axios.post.mockRejectedValue({ response: { data: { detail: 'Advocate is unavailable.' } } });
    show(base);
    await screen.findByText('Record arrival');
    fireEvent.change(screen.getByLabelText(/Visitor name/), { target: { value: 'A Visitor' } });
    fireEvent.change(screen.getByLabelText(/Phone number/), { target: { value: '0712345678' } });
    fireEvent.change(screen.getByLabelText(/^Advocate/), { target: { value: 'a1' } });
    fireEvent.click(screen.getByText('Add to queue & alert advocate'));
    await waitFor(() => expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ icon: 'error', text: 'Advocate is unavailable.' })));
    expect(screen.getByLabelText(/Visitor name/).value).toBe('A Visitor');
  });
  it('keeps reception on arrival duties even if stale data offers intake', async () => {
    show({ ...base, role: 'RECEPTIONIST', has_receptionist: true, visits: [1, 2].map((id) => ({ id: String(id), visitor_name: `Visitor ${id}`, advocate: 'a1', advocate_name: 'Advocate One', received_by_name: 'Reception', arrival_at: '2026-10-21T08:00:00Z', status: 'WAITING', intake_handler: 'RECEPTIONIST', can_record_intake: true, can_consult: false })) });
    await screen.findByText('Visitor 1');
    expect(screen.getByText(/Queue position 2/)).toBeTruthy();
    expect(screen.queryByText('Record consultation intake')).toBeNull();
    expect(screen.queryByLabelText(/Broad nature of enquiry/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Complete consultation' })).toBeNull();
    expect(screen.queryByText('Call client / start consultation')).toBeNull();
  });
  it('does not offer consultation controls to an admin viewing another advocate’s queue', async () => {
    const current = { id: 'v1', visitor_name: 'Visitor', advocate: 'a1', status: 'IN_CONSULTATION',
      intake_handler: 'ADVOCATE', intake_completed_at: '2026-10-26T08:00:00Z', can_record_intake: false, can_consult: false };
    show({ ...base, role: 'ADMIN', visits: [current], queues: [{ advocate: 'a1', advocate_name: 'Advocate One',
      waiting_count: 0, current, called: null, next: null, can_call: true }] });
    await screen.findByText('With advocate (1)');
    expect(screen.queryByRole('button', { name: 'Complete consultation' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Record consultation intake' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Create prospective client' })).toBeNull();
  });
  it('shows reception each stage and leaves the client file to the advocate', async () => {
    show({ ...base, visits: [{ id: 'v0', visitor_name: 'In office', advocate: 'a1', status: 'IN_CONSULTATION', consultation_started_at: '2026-10-28T09:00:00Z' },
      { id: 'v1', visitor_name: 'Instructing', advocate: 'a1', status: 'COMPLETED', closed_at: '2026-10-27T12:00:00Z',
        intake_completed_at: '2026-10-27T08:00:00Z', outcome: 'INSTRUCTING', file_due: true, file_overdue: true }, { id: 'v2', visitor_name: 'Enquirer', advocate: 'a1',
        status: 'COMPLETED', intake_completed_at: '2026-10-28T08:00:00Z', outcome: 'ENQUIRY_ONLY', file_due: false }] });
    expect(await screen.findByText('With advocate (1)')).toBeTruthy();
    expect(screen.getByText('Seen today (2)')).toBeTruthy();
    expect(screen.getByText(/In office since/)).toBeTruthy();
    expect(screen.getByText(/Client file overdue/)).toBeTruthy();
    expect(screen.getByText('Outcome: Enquiry only — no file')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Create prospective client' })).toBeNull();
  });
  it('words the client link for the owner when they are the assigned advocate', async () => {
    show({ ...base, role: 'ADMIN', visits: [{ id: 'v1', visitor_name: 'Visitor', advocate: 'a1', status: 'COMPLETED',
      intake_handler: 'ADVOCATE', intake_completed_at: '2026-10-26T08:00:00Z', can_record_intake: false, can_consult: true, outcome: 'INSTRUCTING', file_due: true }] });
    expect((await screen.findByRole('link', { name: 'Create prospective client' })).getAttribute('href')).toBe('/admin/clients/create?visit=v1');
  });
  it('asks the advocate for the outcome before completing the consultation', async () => {
    axios.post.mockResolvedValue({ data: {} });
    Swal.fire.mockResolvedValueOnce({ isConfirmed: true, value: 'INSTRUCTING' });
    const current = { id: 'v1', visitor_name: 'Visitor', advocate: 'a1', status: 'IN_CONSULTATION', intake_completed_at: '2026-10-28T08:00:00Z', can_consult: true };
    show({ ...base, role: 'ADVOCATE', can_receive: false, visits: [current], queues: [{ advocate: 'a1', advocate_name: 'Advocate One', office_location: 'Room 201', waiting_count: 0, current, called: null, next: null, can_call: true }] });
    fireEvent.click((await screen.findAllByRole('button', { name: 'Complete consultation' }))[0]);
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/arrivals/v1/', { action: 'COMPLETE', outcome: 'INSTRUCTING' }));
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ title: 'Outcome of the consultation', input: 'radio' }));
  });
  it('lets the assigned advocate record consultation intake', async () => {
    axios.post.mockResolvedValue({ data: {} });
    show({ ...base, role: 'ADVOCATE', can_receive: false, visits: [{ id: 'v1', visitor_name: 'Visitor',
      advocate: 'a1', status: 'IN_CONSULTATION', intake_handler: 'ADVOCATE', can_record_intake: true, can_consult: true }] });
    fireEvent.click(await screen.findByRole('button', { name: 'Record consultation intake' }));
    fireEvent.change(screen.getByLabelText(/Broad nature of enquiry/), { target: { value: 'Debt recovery' } });
    expect(screen.queryByLabelText(/Specify who and in what capacity/)).toBeNull();
    fireEvent.change(screen.getByLabelText(/Acting personally or representing someone/), { target: { value: 'ON_BEHALF' } });
    fireEvent.change(screen.getByLabelText(/Specify who and in what capacity/), { target: { value: ' director of Baraka Homes Limited ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save consultation intake' }));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/arrivals/v1/', expect.objectContaining({ action: 'INTAKE', broad_issue: 'Debt recovery',
      acting_capacity: 'On behalf of: director of Baraka Homes Limited' })));
    expect(axios.post.mock.calls[0][1]).not.toHaveProperty('acting_mode');
    expect(screen.queryByText('Record arrival')).toBeNull();
  });
  it('allows the assigned advocate to signal readiness for the next client', async () => {
    axios.post.mockResolvedValue({ data: {} });
    const next = { id: 'v1', visitor_name: 'Visitor', advocate: 'a1', status: 'WAITING', intake_handler: 'ADVOCATE' };
    show({ ...base, can_receive: false, role: 'ADVOCATE', waiting_count: 1, queues: [{ advocate: 'a1', advocate_name: 'Advocate One', office_location: 'Room 201', waiting_count: 1, next, current: null, called: null, can_call: true }] });
    fireEvent.click(await screen.findByRole('button', { name: 'Ready for next client' }));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/arrivals/v1/', { action: 'CALL' }));
    expect(screen.queryByText('Record arrival')).toBeNull();
  });
  it('shows reception who to usher in and to which office', async () => {
    axios.post.mockResolvedValue({ data: {} });
    show({ ...base, waiting_count: 2, queues: [{ advocate: 'a1', advocate_name: 'Advocate One', office_location: 'Room 201', waiting_count: 2,
      called: { id: 'v1', visitor_name: 'John Otieno', can_usher: true }, next: { visitor_name: 'Next Visitor' }, current: null, can_call: false }] });
    await screen.findByText('Ready to usher in');
    expect(screen.getByText('John Otieno')).toBeTruthy();
    expect(screen.getByText('To Advocate One · Room 201')).toBeTruthy();
    expect(screen.getByText('Next Visitor')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Client ushered in' }));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/arrivals/v1/', { action: 'USHER' }));
  });
  it('refreshes the visible queue count without reloading the page', async () => {
    show({ ...base, waiting_count: 1, queues: [] });
    await screen.findByText('1 waiting across 0 advocates');
    axios.get.mockResolvedValue({ data: { ...base, waiting_count: 2, queues: [] } });
    expect(await screen.findByText('2 waiting across 0 advocates', {}, { timeout: 5000 })).toBeTruthy();
  });
});
