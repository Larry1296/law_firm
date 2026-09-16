import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import AdminSettingsPage from './AdminSettingsPage';
import { intakePrivacyService as service } from '../services/intakePrivacyService';

vi.mock('../services/intakePrivacyService', () => ({ intakePrivacyService: { list: vi.fn(), create: vi.fn(), activate: vi.fn(), retire: vi.fn() } }));
const bases = [{ value: 'LEGITIMATE_INTERESTS', label: 'Legitimate interests' }];
const config = { id: 1, policy_version: 'v1', notice_text: 'Our notice', lawful_basis: 'LEGITIMATE_INTERESTS', lawful_basis_label: 'Legitimate interests', effective_date: '2026-01-01', status: 'DRAFT' };
const result = (results = []) => ({ results, lawful_bases: bases });
afterEach(cleanup);
beforeEach(() => { vi.resetAllMocks(); service.list.mockResolvedValue(result()); });

describe('Intake Privacy Configuration settings', () => {
  it('creates a draft and displays its notice and history', async () => {
    render(<AdminSettingsPage />);
    await screen.findByText(/No active approved configuration/);
    fireEvent.change(screen.getByLabelText(/Policy version/), { target: { value: 'v1' } });
    fireEvent.change(screen.getByLabelText(/Effective date/), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText(/Lawful basis/), { target: { value: 'LEGITIMATE_INTERESTS' } });
    fireEvent.change(screen.getByLabelText(/Privacy notice text/), { target: { value: 'Our notice' } });
    service.create.mockResolvedValue(config);
    service.list.mockResolvedValue(result([config]));
    fireEvent.click(screen.getByRole('button', { name: 'Create draft' }));
    await screen.findByText('v1 — DRAFT');
    expect(service.create).toHaveBeenCalledWith({ policy_version: 'v1', effective_date: '2026-01-01', lawful_basis: 'LEGITIMATE_INTERESTS', notice_text: 'Our notice' });
    expect(screen.getByText('Our notice')).toBeInTheDocument();
    expect(screen.getByLabelText(/Policy version/)).toHaveValue('');
  });

  it('activates a replacement, preserves retired history, and retires the active version', async () => {
    service.list.mockResolvedValue(result([{ ...config, status: 'ACTIVE' }, { ...config, id: 2, policy_version: 'v2' }]));
    render(<AdminSettingsPage />);
    const activate = await screen.findByRole('button', { name: 'Approve and activate v2' });
    service.list.mockResolvedValue(result([{ ...config, status: 'RETIRED' }, { ...config, id: 2, policy_version: 'v2', status: 'ACTIVE' }]));
    fireEvent.click(activate);
    await screen.findByText('v1 — RETIRED');
    expect(service.activate).toHaveBeenCalledWith(2);
    expect(screen.queryByRole('button', { name: /activate v1|Retire v1/ })).not.toBeInTheDocument();
    service.list.mockResolvedValue(result([{ ...config, status: 'RETIRED' }, { ...config, id: 2, policy_version: 'v2', status: 'RETIRED' }]));
    fireEvent.click(screen.getByRole('button', { name: 'Retire v2' }));
    await screen.findByText(/No active approved configuration/);
    expect(service.retire).toHaveBeenCalledWith(2);
  });

  it('shows API validation errors and retains entered notice text', async () => {
    service.list.mockResolvedValue(result([config]));
    service.activate.mockRejectedValue({ response: { data: { detail: 'Effective date is in the future.' } } });
    render(<AdminSettingsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Approve and activate v1' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Effective date is in the future.');
    expect(screen.getByText('v1 — DRAFT')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Approve and activate v1' })).toBeEnabled());
  });

  it('shows permission failures without exposing management controls', async () => {
    service.list.mockRejectedValue({ response: { data: { detail: 'Only admins can manage firm settings.' } } });
    render(<AdminSettingsPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Only admins');
    expect(screen.queryByRole('button', { name: 'Create draft' })).not.toBeInTheDocument();
  });
});
