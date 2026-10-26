import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Swal from '@/core/utils/themedSwal';
import platformService from '../services/platformService';
import DeleteTrialFirmButton from './DeleteTrialFirmButton';

vi.mock('@/core/utils/themedSwal', () => ({ default: { fire: vi.fn() } }));
vi.mock('../services/platformService', () => ({ default: { deleteTrialFirm: vi.fn() } }));

const firm = { id: 'trial-1', name: 'Trial Advocates', can_delete_trial: true };
const show = (value = firm, onDeleted = vi.fn()) => {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><DeleteTrialFirmButton firm={value} onDeleted={onDeleted} /></QueryClientProvider>);
  return onDeleted;
};

describe('trial firm deletion', () => {
  beforeEach(() => vi.clearAllMocks());
  it('does not expose deletion for an ineligible firm', () => {
    show({ ...firm, can_delete_trial: false });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it('does nothing when the irreversible deletion is cancelled', async () => {
    Swal.fire.mockResolvedValue({ isConfirmed: false });
    show(); fireEvent.click(screen.getByRole('button', { name: 'Delete trial firm' }));
    await waitFor(() => expect(Swal.fire).toHaveBeenCalled());
    expect(platformService.deleteTrialFirm).not.toHaveBeenCalled();
    const prompt = Swal.fire.mock.calls[0][0];
    expect(prompt.inputValidator('another firm')).toBeTruthy();
    expect(prompt.inputValidator(firm.name)).toBeUndefined();
  });
  it('sends the typed name and refreshes the view after confirmed deletion', async () => {
    const confirmation = () => {};
    Swal.fire.mockResolvedValueOnce({ isConfirmed: true, value: firm.name, confirmation }).mockResolvedValue({});
    platformService.deleteTrialFirm.mockResolvedValue({ deleted: true, file_cleanup_pending: false });
    const onDeleted = show(); fireEvent.click(screen.getByRole('button', { name: 'Delete trial firm' }));
    await waitFor(() => expect(platformService.deleteTrialFirm).toHaveBeenCalledWith(firm.id, firm.name, { confirmation }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
  });
  it('keeps the firm visible when the server rejects stale trial eligibility', async () => {
    Swal.fire.mockResolvedValue({ isConfirmed: true, value: firm.name });
    platformService.deleteTrialFirm.mockRejectedValue({ response: { data: { detail: 'A subscription payment is now recorded.' } } });
    const onDeleted = show(); fireEvent.click(screen.getByRole('button', { name: 'Delete trial firm' }));
    expect(await screen.findByText('A subscription payment is now recorded.')).toBeInTheDocument();
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
