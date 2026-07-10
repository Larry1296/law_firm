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
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};
