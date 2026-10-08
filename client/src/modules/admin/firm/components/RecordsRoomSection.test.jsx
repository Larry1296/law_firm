import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import adminFirmService from '@/modules/admin/firm/services/adminFirmService';
import RecordsRoomSection from './RecordsRoomSection';

vi.mock('@/modules/admin/firm/services/adminFirmService', () => ({
  default: { getRecordsRoom: vi.fn(), createStorageLocation: vi.fn(), updateStorageLocation: vi.fn() },
}));

const purposes = [{ value: 'KYC', label: 'Client KYC files' }, { value: 'MATTER', label: 'Matter files' }];
const layout = {
  next_kyc_reference: 'KYC-2026-001',
  purposes,
  locations: [
    { id: 'r', depth: 0, kind: 'ROOM', kind_label: 'Room', label: 'Registry', path: 'Registry', purpose: 'KYC', purpose_label: 'Client KYC files', is_active: true, kyc_files: 0, matter_files: 0, documents_held: 0 },
    { id: 'c', depth: 1, kind: 'CABINET', kind_label: 'Cabinet', label: 'Cabinet B', path: 'Registry › Cabinet B', purpose: 'KYC', purpose_label: 'Client KYC files', is_active: true, kyc_files: 0, matter_files: 0, documents_held: 0 },
    { id: 'd', depth: 2, kind: 'DRAWER', kind_label: 'Drawer', label: 'Drawer 3', path: 'Registry › Cabinet B › Drawer 3', purpose: 'KYC', purpose_label: 'Client KYC files', is_active: true, kyc_files: 2, matter_files: 0, documents_held: 0 },
  ],
};

function renderSection() {
  render(<QueryClientProvider client={new QueryClient()}><RecordsRoomSection /></QueryClientProvider>);
}

describe('RecordsRoomSection', () => {
  beforeEach(() => { vi.clearAllMocks(); adminFirmService.getRecordsRoom.mockResolvedValue(layout); });

  it('shows the layout as it is in the office, with what each place holds and the next KYC number', async () => {
    renderSection();
    expect(await screen.findByText('Drawer 3')).toBeInTheDocument();
    expect(screen.getByText(/2 KYC files/)).toBeInTheDocument();
    expect(screen.getByText('KYC-2026-001')).toBeInTheDocument();
    // Drawers hold files, so nothing is added inside them.
    expect(screen.queryByRole('button', { name: 'Add inside Registry › Cabinet B › Drawer 3' })).not.toBeInTheDocument();
  });

  it('adds a drawer inside a cabinet', async () => {
    adminFirmService.createStorageLocation.mockResolvedValue({});
    renderSection();
    await userEvent.click(await screen.findByRole('button', { name: 'Add inside Registry › Cabinet B' }));
    await userEvent.type(screen.getByLabelText(/Label, as written on it/), 'Drawer 4');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(adminFirmService.createStorageLocation).toHaveBeenCalledWith({ kind: 'DRAWER', label: 'Drawer 4', parent_id: 'c' }));
  });

  it('adds a room', async () => {
    adminFirmService.createStorageLocation.mockResolvedValue({});
    renderSection();
    await userEvent.click(await screen.findByRole('button', { name: /add a room/i }));
    await userEvent.type(screen.getByLabelText(/Label, as written on it/), 'Strongroom');
    await userEvent.selectOptions(screen.getByLabelText('Holds'), 'MATTER');
    await userEvent.click(screen.getByRole('button', { name: 'Add room' }));
    await waitFor(() => expect(adminFirmService.createStorageLocation).toHaveBeenCalledWith({ kind: 'ROOM', label: 'Strongroom', purpose: 'MATTER' }));
  });
});
