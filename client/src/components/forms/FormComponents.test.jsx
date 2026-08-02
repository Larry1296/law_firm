import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FormActions, FormAlert, FormGrid, ReadOnlyField, SelectInput, TextArea, TextInput } from './index';

describe('shared operational form components', () => {
  it('connects required labels, help and errors accessibly', () => {
    render(<TextInput label='Client name' name='client_name' required help='Use the registered name.' error='Client name is required.' />);
    const input = screen.getByRole('textbox', { name: /client name/i });
    expect(input.required).toBe(true);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toContain('client_name-help');
    expect(input.getAttribute('aria-describedby')).toContain('client_name-error');
  });

  it('preserves controlled select and textarea behavior', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onText = vi.fn();
    render(<FormGrid><SelectInput label='Priority' name='priority' value='' onChange={onSelect} options={[{ value: 'HIGH', label: 'High' }]} /><TextArea label='Instructions' name='instructions' value='' onChange={onText} /></FormGrid>);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Priority' }), 'HIGH');
    await user.type(screen.getByRole('textbox', { name: 'Instructions' }), 'Review the agreement.');
    expect(onSelect).toHaveBeenCalled();
    expect(onText).toHaveBeenCalled();
  });

  it('renders read-only data, alerts and restrained actions', () => {
    render(<><ReadOnlyField label='Matter number' value='MAT-2026-00001' /><FormAlert>Server unavailable.</FormAlert><FormActions primaryLabel='Save client' onSecondary={vi.fn()} /></>);
    expect(screen.getByText('MAT-2026-00001')).toBeTruthy();
    expect(screen.getByText('Read only')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('Server unavailable.');
    expect(screen.getByRole('button', { name: 'Save client' }).className).toContain('bg-brand-primary');
  });
});
