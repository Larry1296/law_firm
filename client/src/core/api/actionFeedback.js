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

// The app's own SweetAlert toast, shown only when the page has no dialog of its own open.
const toast = (icon, title, text) => {
  if (themedSwal.getPopup?.()) return;
  themedSwal.fire({
    toast: true, position: 'top-end', icon, title, text,
    showConfirmButton: false, showCloseButton: true,
    timer: icon === 'success' ? 3500 : 7000, timerProgressBar: true,
  });
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
