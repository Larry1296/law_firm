export const getFirstName = (...candidates) => {
  const value = candidates.find(
    (candidate) => typeof candidate === 'string' && candidate.trim(),
  );

  if (!value) return '';

  const normalized = value.trim();
  const name = normalized.includes('@')
    ? normalized.split('@')[0]
    : normalized.split(/\s+/)[0];

  return name;
};
