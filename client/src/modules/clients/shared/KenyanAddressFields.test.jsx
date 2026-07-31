import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import KenyanAddressFields from './KenyanAddressFields';

describe('KenyanAddressFields', () => {
  it('shows the county selector and all 47 counties when Kenya is selected', async () => {
    const user = userEvent.setup();
    render(<KenyanAddressFields formData={{ country: 'Kenya', county: '', city: '' }} onChange={vi.fn()} />);

    expect(screen.getByText('County')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /county/i }));
    expect(screen.getAllByRole('option')).toHaveLength(48);
    expect(screen.getByRole('option', { name: 'Nairobi' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Mombasa' })).toBeTruthy();
  });

  it('offers areas belonging to the selected town', async () => {
    const user = userEvent.setup();
    render(<KenyanAddressFields formData={{ country: 'Kenya', county: 'Nairobi', city: 'Nairobi', street: '' }} onChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /nearest area \/ street \/ location/i }));
    expect(screen.getByRole('option', { name: 'Westlands' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Other area / street / location' })).toBeTruthy();
  });
});
