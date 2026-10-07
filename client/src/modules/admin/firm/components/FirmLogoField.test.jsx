import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AuthContext from '@/core/store/AuthContext';
import Swal from '@/core/utils/themedSwal';
import adminFirmService from '@/modules/admin/firm/services/adminFirmService';
import FirmLogoField from './FirmLogoField';

vi.mock('@/modules/admin/firm/services/adminFirmService', () => ({ default: { uploadLogo: vi.fn(), removeLogo: vi.fn() } }));
vi.mock('@/core/utils/themedSwal', () => ({ default: { fire: vi.fn().mockResolvedValue({ isConfirmed: true }) } }));

function renderField(firm = { id: 'f1', name: 'Musau & Co Advocates', logo_url: null }) {
  const updateFirm = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthContext.Provider value={{ user: { firm }, updateFirm }}>
        <FirmLogoField />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return updateFirm;
}

const image = (bytes, type = 'image/png') => new File([new Uint8Array(bytes)], 'logo.png', { type });

describe('FirmLogoField', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uploads a new logo and updates the firm branding everywhere', async () => {
    const saved = { id: 'f1', name: 'Musau & Co Advocates', logo_url: '/firm-logo/f1/?v=2' };
    adminFirmService.uploadLogo.mockResolvedValue(saved);
    const updateFirm = renderField();

    await userEvent.upload(screen.getByLabelText('Upload firm logo'), image(1000));

    await waitFor(() => expect(updateFirm).toHaveBeenCalledWith(saved));
    expect(adminFirmService.uploadLogo.mock.calls[0][0]).toBeInstanceOf(File);
  });

  it('refuses a logo over 2 MB before uploading it', async () => {
    renderField();
    await userEvent.upload(screen.getByLabelText('Upload firm logo'), image(2 * 1024 * 1024 + 1));
    expect(adminFirmService.uploadLogo).not.toHaveBeenCalled();
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ text: 'The logo must be 2 MB or smaller.' }));
  });

  it('offers Remove only when there is a logo, and removes it after confirming', async () => {
    adminFirmService.removeLogo.mockResolvedValue({ id: 'f1', name: 'Musau & Co Advocates', logo_url: null });
    const updateFirm = renderField({ id: 'f1', name: 'Musau & Co Advocates', logo_url: '/firm-logo/f1/?v=1' });

    expect(screen.getByRole('button', { name: /change logo/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /remove/i }));

    await waitFor(() => expect(updateFirm).toHaveBeenCalledWith(expect.objectContaining({ logo_url: null })));
  });
});
