const toDate = (value) => {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDateTime = (value, locale = undefined) => {
  const date = toDate(value);
  if (!date) return 'N/A';

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
};

export const formatDate = (value, locale = undefined) => {
  const date = toDate(value);
  if (!date) return 'N/A';

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

export default {
  formatDateTime,
  formatDate,
};
