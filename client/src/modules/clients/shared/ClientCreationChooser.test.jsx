import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ClientCreationChooser from './ClientCreationChooser';

describe('ClientCreationChooser', () => {
  it('explains and visibly distinguishes both access modes', () => {
    render(<ClientCreationChooser open onClose={() => {}} onSelect={() => {}} />);

    expect(screen.getByRole('radio', { name: /Portal client/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(/Creates a login for the client or an authorised representative/)).toBeInTheDocument();
    expect(screen.getByText(/Does not create a client login/)).toBeInTheDocument();
    expect(screen.getByText(/Choose client access/)).toBeInTheDocument();
  });

  it('passes the selected access mode with the legal client type', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ClientCreationChooser open onClose={() => {}} onSelect={onSelect} />);

    await user.click(screen.getByRole('radio', { name: /Staff-assisted client/ }));
    expect(screen.getByRole('radio', { name: /Staff-assisted client/ })).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('button', { name: 'Company / Corporate Body' }));

    expect(onSelect).toHaveBeenCalledWith('company', 'assisted');
  });
});
