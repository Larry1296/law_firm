import themedSwal from '@/core/utils/themedSwal';
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

// The app's own SweetAlert dialog in the middle of the screen, shown only when the page has none of its own open:
// a success closes itself, a refusal waits to be read.
const notify = (icon, title, text) => {
  // The confirmation that started the change may still be fading out; only a dialog that stays open counts.
  const open = themedSwal.getPopup?.();
  if (open && !open.classList?.contains('swal2-hide')) return;
  themedSwal.fire({
    icon, title, text,
    ...(icon === 'success'
      ? { showConfirmButton: false, timer: 2200, timerProgressBar: true }
      : { confirmButtonText: 'OK' }),
  });
};

// Every change the user confirmed reports how it ended, whatever page made it.
export function reportSaved(config) {
  const base = config ? criticalAction(config) : null;
  if (!base) return;
  const policy = { ...base, ...config.criticalAction };
  if (/sign out/i.test(policy.confirmText || '')) return;
  notify('success', doneMessage(policy.title));
}

export function reportRefused(error) {
  const config = error?.config;
  if (!config || error?.isActionCancelled || !criticalAction(config)) return;
  notify('error', 'Not saved', getApiErrorMessage(error));
}
