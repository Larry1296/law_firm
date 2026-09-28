import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Swal from '@/core/utils/themedSwal';
import AdminCreateStaffPage from '@/modules/admin/staff/pages/AdminCreateStaffPage';

const createStaff = vi.fn();

vi.mock('@/core/utils/themedSwal', () => ({ default: { fire: vi.fn() } }));
vi.mock('@/modules/admin/staff/hooks/useAdminStaff', () => ({ useAdminStaff: () => ({ createStaff }) }));
vi.mock('@/modules/admin/cases/hooks/useFirmLawyers', () => ({ default: () => ({ lawyers: [] }) }));
vi.mock('@/modules/admin/firm/services/adminFirmService', () => ({
  default: { getDepartments: vi.fn().mockResolvedValue([]), getBranches: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/modules/admin/staff/components/StaffPermissionPicker', () => ({ default: () => null }));
vi.mock('@/modules/admin/staff/components/AdvocateChecklist', () => ({ default: () => null }));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><AdminCreateStaffPage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AdminCreateStaffPage', () => {
  beforeEach(() => {
    vi.mocked(Swal.fire).mockReset();
    createStaff.mockReset().mockRejectedValue({
      message: 'Request failed with status code 400',
      response: {
        status: 400,
        data: {
          message: 'Email: A user with this email already exists.',
          errors: {
            email: 'A user with this email already exists.',
            national_id_number: 'A user with this national ID number already exists.',
          },
        },
      },
    });
  });

  it('shows the server’s reasons instead of the status code, and marks the fields', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/Full Name/), 'Mercy Wanjiku');
    await user.type(screen.getByLabelText(/National ID/), '12345678');
    await user.type(screen.getByLabelText(/Phone Number/), '0712345678');
    await user.type(screen.getByLabelText(/Email Address/), 'mercy@email.com');
    await user.type(screen.getByLabelText(/Admission Number/), 'P.105/1/26');
    await user.click(screen.getByRole('button', { name: 'Create Staff' }));

    const dialog = vi.mocked(Swal.fire).mock.calls.at(-1)[0];
    expect(dialog.text).toContain('A user with this email already exists.');
    expect(dialog.text).toContain('A user with this national ID number already exists.');
    expect(dialog.text).not.toContain('status code');

    const email = screen.getByLabelText(/Email Address/);
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/National ID/)).toHaveAttribute('aria-invalid', 'true');

    // Correcting a field clears its mark.
    await user.type(email, 'x');
    expect(email).toHaveAttribute('aria-invalid', 'false');
  });
});
