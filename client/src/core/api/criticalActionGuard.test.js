import axios, { AxiosError } from 'axios';
import Swal from 'sweetalert2';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from './axios';
import themedSwal from '@/core/utils/themedSwal';
import { getApiErrorMessage } from '@/core/utils/errorMessages';
import { resetSessionLock, lockSession } from '@/core/auth/sessionLock';
import { withConfirmation, withCriticalAction } from '@/core/utils/confirmationContext';
import { requireCriticalConfirmation, releaseCriticalAction } from './criticalActionGuard';

vi.mock('sweetalert2', () => ({ default: { fire: vi.fn(), mixin: vi.fn() } }));
// These tests count confirmation dialogs; the after-save toasts are tested on their own.
vi.mock('./actionFeedback', () => ({ reportSaved: vi.fn(), reportRefused: vi.fn() }));
const jwt = () => {
  const encode = (value) => btoa(JSON.stringify(value)).replace(/=+$/, '');
  return `${encode({ alg: 'HS256' })}.${encode({ exp: Math.floor(Date.now() / 1000) + 3600 })}.signature`;
};
const adapter = vi.fn(async (config) => ({ data: {}, status: 200, statusText: 'OK', headers: {}, config }));
const originalAdapter = api.defaults.adapter;

beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); resetSessionLock();
  api.defaults.adapter = adapter;
  adapter.mockImplementation(async (config) => ({ data: {}, status: 200, statusText: 'OK', headers: {}, config }));
  Swal.fire.mockResolvedValue({ isConfirmed: true });
});
afterEach(() => { api.defaults.adapter = originalAdapter; vi.restoreAllMocks(); });

describe('request confirmation boundary', () => {
  it('sends a critical request only after the user confirms', async () => {
    let decide;
    Swal.fire.mockImplementationOnce(() => new Promise((resolve) => { decide = resolve; }));
    const request = api.post('/cases/matter-1/filings/', { filing_type: 'SUMMONS' });
    await vi.waitFor(() => expect(Swal.fire).toHaveBeenCalledTimes(1));
    expect(adapter).not.toHaveBeenCalled();
    decide({ isConfirmed: true }); await request;
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(Swal.fire.mock.calls[0][0]).toMatchObject({ showCancelButton: true, focusCancel: true });
  });

  it('cancels without a request or failure message and lets a later attempt proceed', async () => {
    Swal.fire.mockResolvedValueOnce({ isConfirmed: false });
    let error;
    try { await api.delete('/platform/firms/trial-1/'); } catch (caught) { error = caught; }
    expect(error.isActionCancelled).toBe(true);
    expect(getApiErrorMessage(error)).toBe('');
    expect(adapter).not.toHaveBeenCalled();
    await api.delete('/platform/firms/trial-1/');
    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it('does not request confirmation for passive progress or reads', async () => {
    await api.get('/cases/');
    await api.post('/tutorials/1/progress/', { position: 12 });
    await api.post('/knowledge-base/ask/', { question: 'What is a court?' });
    expect(Swal.fire).not.toHaveBeenCalled();
    expect(adapter).toHaveBeenCalledTimes(3);
  });

  it('accepts a one-use capability from an existing typed-name SWAL without a second dialog', async () => {
    const result = await themedSwal.fire({ titleText: 'Delete Trial Firm?', input: 'text', showCancelButton: true });
    await api.delete('/platform/firms/trial-1/', { confirmation: result.confirmation, data: { confirmation: 'Trial Firm' } });
    expect(Swal.fire).toHaveBeenCalledTimes(1);
    await api.delete('/platform/firms/trial-1/', { confirmation: result.confirmation });
    expect(Swal.fire).toHaveBeenCalledTimes(2);
  });

  it('strips data-entry confirmation metadata before sending the body', async () => {
    const result = await themedSwal.fire({ input: 'text', showCancelButton: true });
    await api.patch('/admin/firm/settings/', withConfirmation(result, { opening_time: '08:30' }));
    expect(Swal.fire).toHaveBeenCalledTimes(1);
    expect(JSON.parse(adapter.mock.calls[0][0].data)).toEqual({ opening_time: '08:30' });
  });

  it('does not treat a boolean bypass flag as approval', async () => {
    await api.post('/finance/invoices/1/approve/', {}, { confirmation: true });
    expect(Swal.fire).toHaveBeenCalledTimes(1);
  });

  it('does not reuse approval when a retry changes the body or query', async () => {
    const config = { method: 'post', url: '/cases/1/transitions/', data: { to_state: 'FILED' } };
    try {
      await requireCriticalConfirmation(config);
      config._retry = true;
      await requireCriticalConfirmation(config);
      expect(Swal.fire).toHaveBeenCalledTimes(1);
      config.data = { to_state: 'CONCLUDED' };
      await requireCriticalConfirmation(config);
      config.params = { alternative: 1 };
      await requireCriticalConfirmation(config);
      expect(Swal.fire).toHaveBeenCalledTimes(3);
    } finally { releaseCriticalAction(config); }
  });

  it('retries an unchanged request after token renewal without asking twice', async () => {
    localStorage.setItem('accessToken', jwt()); localStorage.setItem('refreshToken', jwt());
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { access: jwt(), refresh: jwt() } });
    adapter.mockImplementationOnce(async (config) => { throw new AxiosError('Expired', 'ERR_BAD_REQUEST', config, {}, { status: 401, data: {}, config }); });
    await api.post('/finance/invoices/2/approve/', {});
    expect(Swal.fire).toHaveBeenCalledTimes(1);
    expect(adapter).toHaveBeenCalledTimes(2);
  });

  it('prevents a duplicate click while the first confirmation is pending', async () => {
    let decide;
    Swal.fire.mockImplementationOnce(() => new Promise((resolve) => { decide = resolve; }));
    const first = api.post('/cases/1/closure/2/finalise/', {});
    await vi.waitFor(() => expect(Swal.fire).toHaveBeenCalledTimes(1));
    const second = await api.post('/cases/1/closure/2/finalise/', {}).catch((error) => error);
    expect(second.isActionCancelled).toBe(true);
    decide({ isConfirmed: true }); await first;
    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it('preserves both approvals when two requests wait for the same token renewal', async () => {
    localStorage.setItem('accessToken', jwt()); localStorage.setItem('refreshToken', jwt());
    let renew;
    vi.spyOn(axios, 'post').mockImplementation(() => new Promise((resolve) => { renew = resolve; }));
    adapter.mockImplementation(async (config) => {
      if (!config._retry) throw new AxiosError('Expired', 'ERR_BAD_REQUEST', config, {}, { status: 401, data: {}, config });
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    });
    const first = api.post('/finance/invoices/4/approve/', {});
    await vi.waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    const second = api.post('/finance/invoices/5/approve/', {});
    await vi.waitFor(() => expect(adapter).toHaveBeenCalledTimes(2));
    renew({ data: { access: jwt(), refresh: jwt() } });
    await Promise.all([first, second]);
    expect(adapter).toHaveBeenCalledTimes(4);
    expect(Swal.fire).toHaveBeenCalledTimes(2);
  });

  it('cancels an aborted request before dispatch even if the dialog was confirmed', async () => {
    let decide;
    const controller = new AbortController();
    Swal.fire.mockImplementationOnce(() => new Promise((resolve) => { decide = resolve; }));
    const request = api.post('/cases/2/archive/', {}, { signal: controller.signal }).catch((error) => error);
    await vi.waitFor(() => expect(Swal.fire).toHaveBeenCalledTimes(1));
    controller.abort(); decide({ isConfirmed: true });
    expect((await request).isActionCancelled).toBe(true);
    expect(adapter).not.toHaveBeenCalled();
  });

  it('never prints passwords, tokens or bank references in the confirmation', async () => {
    await api.post('/auth/change-password/', { current_password: 'Secret-old', new_password: 'Secret-new' });
    expect(JSON.stringify(Swal.fire.mock.calls)).not.toMatch(/Secret-old|Secret-new/);
  });

  it('checks a locked session before opening a confirmation', async () => {
    localStorage.setItem('accessToken', jwt()); lockSession();
    await expect(api.post('/cases/', {})).rejects.toMatchObject({ isSessionLocked: true });
    expect(Swal.fire).not.toHaveBeenCalled();
    expect(adapter).not.toHaveBeenCalled();
  });

  it('keeps custom prompts scoped to the synchronous action, never background requests', async () => {
    await withCriticalAction({ title: 'Issue reviewed fee note?', confirmText: 'Issue fee note' }, () => api.post('/finance/invoices/3/issue/', {}));
    await api.post('/cases/');
    expect(Swal.fire.mock.calls[0][0].titleText).toBe('Issue reviewed fee note?');
    expect(Swal.fire.mock.calls[1][0].titleText).toBe('Open this legal matter?');
  });
});
