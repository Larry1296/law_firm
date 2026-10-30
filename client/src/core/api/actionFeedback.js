import { getApiErrorMessage } from '@/core/utils/errorMessages';
import { criticalAction } from './criticalActionPolicy';

const PAST = {
  record: 'Recorded', approve: 'Approved', open: 'Opened', save: 'Saved', post: 'Posted', confirm: 'Confirmed',
  create: 'Created', send: 'Sent', update: 'Updated', supersede: 'Superseded', register: 'Registered',
  assign: 'Assigned', reassign: 'Reassigned', remove: 'Removed', delete: 'Deleted', cancel: 'Cancelled',
  complete: 'Completed', issue: 'Issued', accept: 'Accepted', decline: 'Declined', reject: 'Rejected',
  revoke: 'Revoked', change: 'Changed', start: 'Started', close: 'Closed', archive: 'Archived', restore: 'Restored',
};

// "Record MAT-2026-00001 as prepared?" reads back as "Recorded: MAT-2026-00001 as prepared".
export function doneMessage(title = '') {
  const statement = String(title).trim().replace(/\?$/, '');
  const [verb, ...rest] = statement.split(' ');
  const past = PAST[(verb || '').toLowerCase()];
  return past && rest.length ? `${past}: ${rest.join(' ')}` : 'Saved';
}

const TONES = {
  success: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100',
  error: 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100',
};

// A small corner notice of its own, so it never replaces a dialog the page is showing.
const toast = (tone, title, text) => {
  if (typeof document === 'undefined') return;
  let stack = document.getElementById('action-feedback');
  if (!stack) {
    stack = Object.assign(document.createElement('div'), { id: 'action-feedback' });
    stack.className = 'pointer-events-none fixed right-4 top-4 z-[2000] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2';
    stack.setAttribute('aria-live', 'polite');
    document.body.appendChild(stack);
  }
  const note = document.createElement('div');
  note.setAttribute('role', tone === 'error' ? 'alert' : 'status');
  note.className = `pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-lg ${TONES[tone]}`;
  const heading = Object.assign(document.createElement('p'), { className: 'font-semibold', textContent: `${tone === 'success' ? '✓' : '✕'} ${title}` });
  note.appendChild(heading);
  if (text) note.appendChild(Object.assign(document.createElement('p'), { className: 'mt-0.5', textContent: text }));
  note.addEventListener('click', () => note.remove());
  stack.appendChild(note);
  setTimeout(() => note.remove(), tone === 'success' ? 3500 : 7000);
};

// Every change the user confirmed reports how it ended, whatever page made it.
export function reportSaved(config) {
  const base = config ? criticalAction(config) : null;
  if (!base) return;
  const policy = { ...base, ...config.criticalAction };
  if (/sign out/i.test(policy.confirmText || '')) return;
  toast('success', doneMessage(policy.title));
}

export function reportRefused(error) {
  const config = error?.config;
  if (!config || error?.isActionCancelled || !criticalAction(config)) return;
  toast('error', 'Not saved', getApiErrorMessage(error));
}
