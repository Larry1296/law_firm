import { describe, expect, it } from 'vitest';

import { doneMessage } from './actionFeedback';

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

describe('action notices', () => {
  it('shows a corner notice when a confirmed change saves or is refused', async () => {
    const { reportRefused, reportSaved } = await import('./actionFeedback');
    reportSaved({ method: 'post', url: '/cases/c1/physical-file/', data: { operation: 'assign' }, criticalAction: { title: 'Record MAT-2026-00001 as prepared?' } });
    expect(document.querySelector('[role="status"]').textContent).toContain('Recorded: MAT-2026-00001 as prepared');

    reportRefused({ config: { method: 'post', url: '/cases/c1/physical-file/', data: {} }, response: { data: { detail: 'This matter already has a confirmed physical file.' } } });
    expect(document.querySelector('[role="alert"]').textContent).toContain('This matter already has a confirmed physical file.');
  });

  it('stays quiet for reads and for a cancelled confirmation', async () => {
    const { reportRefused, reportSaved } = await import('./actionFeedback');
    document.body.innerHTML = '';
    reportSaved({ method: 'get', url: '/cases/' });
    reportRefused({ isActionCancelled: true, config: { method: 'post', url: '/cases/c1/physical-file/' } });
    expect(document.getElementById('action-feedback')).toBeNull();
  });
});
