import { serverNow } from '@/core/utils/serverClock';
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

// The calendar date (YYYY-MM-DD) for a date input, in the user's own time zone. toISOString() would give the
// UTC date, which in Nairobi (UTC+3) is still yesterday until 3 a.m. "Today" is the server's day, so a device
// with a wrong clock does not date what it records.
export const localDateInput = (value = serverNow()) => {
  const date = toDate(value);
  if (!date) return '';
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export default {
  formatDateTime,
  formatDate,
  localDateInput,
};
