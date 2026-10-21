import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { it, expect, vi, beforeEach } from 'vitest';
import axios from '@/core/api/axios';
import Swal from '@/core/utils/themedSwal';
import QueueConfiguration from './QueueConfiguration';

vi.mock('@/core/api/axios', () => ({ default: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('@/core/utils/themedSwal', () => ({ default: { fire: vi.fn() } }));
const config = { reception_mode: 'SHARED', advocates: [{ id: 'a1', name: 'Alex Kamau', office_location: 'Room 201' }, { id: 'a2', name: 'Second Advocate', office_location: 'Room 202' }], secretaries: [{ id: 's1', name: 'Mary', is_receptionist: false, advocates: ['a1'] }] };
beforeEach(() => { vi.clearAllMocks(); axios.get.mockResolvedValue({ data: config }); axios.patch.mockResolvedValue({ data: config }); });
it('allows an existing firm to reshuffle offices and secretary coverage', async () => {
  render(<QueryClientProvider client={new QueryClient()}><QueueConfiguration /></QueryClientProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Configure queue' }));
  fireEvent.change(await screen.findByLabelText('Alex Kamau — office / room'), { target: { value: 'Room 305' } });
  fireEvent.change(screen.getByLabelText('Reception coverage'), { target: { value: 'ASSIGNED' } });
  fireEvent.click(screen.getByLabelText('Second Advocate', { selector: 'input' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save offices & coverage' }));
  await waitFor(() => expect(axios.patch).toHaveBeenCalledWith('/admin/firm/queue-configuration/', {
    reception_mode: 'ASSIGNED', offices: [{ advocate: 'a1', office_location: 'Room 305' }, { advocate: 'a2', office_location: 'Room 202' }],
    secretary_assignments: [{ secretary: 's1', advocates: ['a1', 'a2'] }],
  }));
  await waitFor(() => expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ title: 'Queue setup saved' })));
});
