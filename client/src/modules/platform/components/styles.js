export const inputClass =
  'w-full rounded-lg border border-border-light bg-surface-light px-3 py-2 text-sm text-text-primary-light placeholder:text-text-muted-light focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/50 disabled:opacity-60 dark:border-border-dark dark:bg-background-dark dark:text-text-primary-dark dark:placeholder:text-text-muted-dark';

export const cellClass = 'px-5 py-3 align-top text-text-primary-light dark:text-text-primary-dark';

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
