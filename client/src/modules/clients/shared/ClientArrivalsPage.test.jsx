import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from '@/core/api/axios';
import Swal from '@/core/utils/themedSwal';
import ClientArrivalsPage from './ClientArrivalsPage';
vi.mock('@/core/api/axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('@/core/utils/themedSwal', () => ({ default: { fire: vi.fn() } }));
const base = { role: 'SECRETARY', has_receptionist: false, can_receive: true, clients: [], advocates: [{ value: 'a1', label: 'Advocate One' }], visits: [] };
function show(data) {
  axios.get.mockResolvedValue({ data });
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ClientArrivalsPage /></QueryClientProvider>);
}
beforeEach(() => vi.clearAllMocks());
describe('client arrival staffing flows', () => {
  it('links the completed arrival to the chosen client without opening a case', async () => {
    axios.post.mockResolvedValue({ data: {} });
    show({ ...base, clients: [{ value: 'c1', label: 'Kamau Hardware Limited' }], visits: [{ id: 'v1', visitor_name: 'Peter Kamau', advocate: 'a1', status: 'COMPLETED', intake_completed_at: '2026-10-26T08:00:00Z', intake_handler: 'ADVOCATE' }] });
    fireEvent.change(await screen.findByLabelText('Client to link to this arrival'), { target: { value: 'c1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Link client record' }));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/arrivals/v1/', { action: 'LINK_CLIENT', client: 'c1' }));
  });
  it('secretary records only basic arrival and notifies the advocate', async () => {
    axios.post.mockResolvedValue({ data: {} });
    show(base);
    await screen.findByText('Record arrival');
    expect(screen.queryByLabelText('Broad nature of enquiry')).toBeNull();
    fireEvent.change(screen.getByLabelText(/Visitor name/), { target: { value: 'A Visitor' } });
    fireEvent.change(screen.getByLabelText(/^Advocate/), { target: { value: 'a1' } });
    fireEvent.click(screen.getByText('Add to queue & alert advocate'));
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith('/arrivals/', { visitor_name: 'A Visitor', client: null, advocate: 'a1', urgency_flag: false, urgency_note: '' }));
    await waitFor(() => expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ icon: 'success', title: 'Added to queue' })));
    expect(screen.getByLabelText(/Visitor name/).value).toBe('');
  });
  it('shows a save error without clearing the arrival details', async () => {
    axios.post.mockRejectedValue({ response: { data: { detail: 'Advocate is unavailable.' } } });
    show(base);
    await screen.findByText('Record arrival');
    fireEvent.change(screen.getByLabelText(/Visitor name/), { target: { value: 'A Visitor' } });
    fireEvent.change(screen.getByLabelText(/^Advocate/), { target: { value: 'a1' } });
    fireEvent.click(screen.getByText('Add to queue & alert advocate'));
    await waitFor(() => expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ icon: 'error', text: 'Advocate is unavailable.' })));
    expect(screen.getByLabelText(/Visitor name/).value).toBe('A Visitor');
  });
  it('shows receptionist intake and FIFO positions per advocate', async () => {
    show({ ...base, role: 'RECEPTIONIST', has_receptionist: true, visits: [1, 2].map((id) => ({ id: String(id), visitor_name: `Visitor ${id}`, advocate: 'a1', advocate_name: 'Advocate One', received_by_name: 'Reception', arrival_at: '2026-10-21T08:00:00Z', status: 'WAITING', intake_handler: 'RECEPTIONIST', can_record_intake: true, can_consult: false })) });
    await screen.findByText('Visitor 1');
    expect(screen.getByText(/Queue position 2/)).toBeTruthy();
    fireEvent.click(screen.getAllByText('Record preliminary intake')[0]);
    expect(screen.getByLabelText(/Broad nature of enquiry/)).toBeTruthy();
    expect(screen.queryByText('Call client / start consultation')).toBeNull();
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
