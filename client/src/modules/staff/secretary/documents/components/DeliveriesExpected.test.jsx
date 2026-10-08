import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import secretaryDocumentsService from '../services/secretaryDocumentsService';
import DeliveriesExpected from './DeliveriesExpected';

vi.mock('../services/secretaryDocumentsService', () => ({ default: { verifyClientUpload: vi.fn() } }));

const delivery = {
  id: 'r1', title: 'Original title deed', client_name: 'Wanjiru Kamau', case_number: 'MAT-2026-0001',
  drawer_reference: 'KYC-2026-039', delivery_note: 'Client will deliver it by courier on 12 October 2026.',
};

function renderQueue(onDone = vi.fn()) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <DeliveriesExpected deliveries={[delivery]} originalsPlaces={[{ id: 'safe', path: 'Strongroom › Safe 1' }]} onDone={onDone} />
    </QueryClientProvider>,
  );
  return onDone;
}

describe('DeliveriesExpected', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists papers clients are bringing, with how they are coming', () => {
    renderQueue();
    expect(screen.getByText('Original title deed')).toBeInTheDocument();
    expect(screen.getByText(/by courier on 12 October 2026/)).toBeInTheDocument();
  });

  it('files an original in the safe once every check is ticked', async () => {
    secretaryDocumentsService.verifyClientUpload.mockResolvedValue({ reference: 'KYC-2026-039/D4' });
    const onDone = renderQueue();
    await userEvent.click(screen.getByRole('button', { name: 'It has arrived' }));
    const file = screen.getByRole('button', { name: 'Receive and file' });
    expect(file).toBeDisabled();
    for (const label of [/right client/, /complete and legible/, /belongs to this matter/]) {
      await userEvent.click(screen.getByLabelText(label));
    }
    await userEvent.selectOptions(screen.getByLabelText('Original or copy'), 'ORIGINAL');
    await userEvent.selectOptions(screen.getByLabelText('Keep it in'), 'safe');
    await userEvent.click(file);
    await waitFor(() => expect(secretaryDocumentsService.verifyClientUpload).toHaveBeenCalledWith('r1', {
      correct_client: true, readable_complete: true, matter_link_confirmed: true,
      source_copy_type: 'ORIGINAL', location_id: 'safe', return_required: false, expected_return_date: null,
    }));
    expect(await screen.findByText('KYC-2026-039/D4')).toBeInTheDocument();
    expect(onDone).toHaveBeenCalled();
  });
});
