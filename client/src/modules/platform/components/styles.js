// Shared form control look, defined in index.css.
export const inputClass = 'form-control';

export const cellClass = 'px-5 py-3 align-top text-text-primary-light dark:text-text-primary-dark';

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
