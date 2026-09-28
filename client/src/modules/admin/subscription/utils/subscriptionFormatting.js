const kesFormatter = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  maximumFractionDigits: 0,
});

export function formatKes(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? kesFormatter.format(amount) : '—';
}

export function formatSubscriptionDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatLimit(value) {
  return value === null || value === undefined ? 'Unlimited' : String(value);
}

export const LIMIT_LABELS = {
  advocates: 'Advocates',
  support_staff: 'Support staff',
  active_matters: 'Active matters',
  branches: 'Branches',
};

export const STATUS_LABELS = {
  TRIALING: 'Free trial',
  ACTIVE: 'Active',
  GRACE: 'Renewal overdue (grace period)',
  EXPIRED: 'Lapsed — read-only',
  SUSPENDED: 'Suspended',
  CANCELLED: 'Cancelled',
};
