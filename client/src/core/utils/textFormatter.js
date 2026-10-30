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

// Short words such as OPEN, FIRM or AND are ordinary words; only these stay in capitals.
const ACRONYMS = new Set([
  'ID', 'KYC', 'KRA', 'PIN', 'ELRC', 'ELC', 'CTS', 'AI', 'LSK', 'ADR', 'PEP', 'EDD', 'CDD', 'AML',
  'KES', 'USD', 'EUR', 'GBP', 'VAT', 'SMS', 'URL', 'PDF', 'OTP', 'NGO', 'LLP', 'IP', 'HR',
  'DPP', 'ODPP', 'OCS', 'NSSF', 'NHIF', 'SHA', 'SHIF', 'ICT', 'MAT', 'PMA',
]);

export const displayEnum = (value) => {
  if (!value) return '';

  return String(value)
    .trim()
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((part) => {
      if (ACRONYMS.has(part.toUpperCase()) || /\d/.test(part)) return part.toUpperCase();
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
