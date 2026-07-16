export const titleCase = (value) => {
  if (!value) return '';

  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const sentenceCase = (value) => {
  if (!value) return '';

  const text = String(value).trim().toLowerCase();

  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const enumLabel = (value) => {
  if (!value) return '';

  return String(value)
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const displayEnum = (value) => {
  if (!value) return '';

  return String(value)
    .trim()
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((part) => {
      if (/^[A-Z0-9]{2,4}$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ');
};

export const initials = (value, fallback = 'U') => {
  const text = String(value || '').trim();
  if (!text) return fallback.toUpperCase();

  const source = text.includes('@') ? text.split('@')[0] : text;
  const parts = source
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const letters = (parts.length > 1 ? parts.slice(0, 2) : parts)
    .map((part) => part.charAt(0))
    .join('');

  return (letters || fallback).toUpperCase();
};
