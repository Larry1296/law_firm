// Files the API serves itself (such as firm logos) are addressed relative to the API base.
export const apiAssetUrl = (path) => {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const base = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
};
