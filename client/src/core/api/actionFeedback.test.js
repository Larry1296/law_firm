import { beforeEach, describe, expect, it, vi } from 'vitest';

import { doneMessage, reportRefused, reportSaved } from './actionFeedback';

const swal = vi.hoisted(() => ({ fire: vi.fn(), getPopup: vi.fn(() => null) }));
vi.mock('@/core/utils/themedSwal', () => ({ default: swal }));

const fileAssign = { method: 'post', url: '/cases/c1/physical-file/', data: { operation: 'assign' } };

describe('doneMessage', () => {
  it('turns the confirmation question into what was done', () => {
    expect(doneMessage('Record MAT-2026-00001 as prepared?')).toBe('Recorded: MAT-2026-00001 as prepared');
    expect(doneMessage('Approve the signed engagement?')).toBe('Approved: the signed engagement');
    expect(doneMessage('Open this legal matter?')).toBe('Opened: this legal matter');
  });

  it('falls back to a plain saved for a question it cannot restate', () => {
    expect(doneMessage('Permanently remove this record?')).toBe('Saved');
  });
});

describe('action toasts', () => {
  beforeEach(() => { swal.fire.mockClear(); swal.getPopup.mockReturnValue(null); });

  it('shows a SweetAlert toast when a confirmed change saves or is refused', () => {
    reportSaved({ ...fileAssign, criticalAction: { title: 'Record MAT-2026-00001 as prepared?' } });
    expect(swal.fire).toHaveBeenLastCalledWith(expect.objectContaining({ toast: true, icon: 'success', title: 'Recorded: MAT-2026-00001 as prepared' }));

    reportRefused({ config: fileAssign, response: { data: { detail: 'This matter already has a confirmed physical file.' } } });
    expect(swal.fire).toHaveBeenLastCalledWith(expect.objectContaining({ toast: true, icon: 'error', title: 'Not saved', text: 'This matter already has a confirmed physical file.' }));
  });

  it('leaves a dialog the page is showing in place and stays quiet for reads and cancellations', () => {
    swal.getPopup.mockReturnValue({});
    reportSaved(fileAssign);
    swal.getPopup.mockReturnValue(null);
    reportSaved({ method: 'get', url: '/cases/' });
    reportRefused({ isActionCancelled: true, config: fileAssign });
    expect(swal.fire).not.toHaveBeenCalled();
  });
});
