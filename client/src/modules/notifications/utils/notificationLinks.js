const WORKSPACES = ['admin', 'lawyer', 'secretary', 'accountant', 'hr', 'it', 'client', 'portal', 'platform'];

// The workspace the reader is in, e.g. '/lawyer' for '/lawyer/cases/4'.
export function workspaceBase(pathname = '') {
  const first = pathname.split('/')[1];
  return WORKSPACES.includes(first) ? `/${first}` : '';
}

/**
 * Some notifications carry a role-neutral link ('/cases/<id>', '/notifications?event=…').
 * Open those inside the reader's own workspace instead of on a page that does not exist.
 */
export function resolveNotificationUrl(url, { pathname = '', fallbackPath = '' } = {}) {
  if (!url) return fallbackPath;
  const base = workspaceBase(pathname);
  if (url.startsWith('/notifications')) {
    return `${fallbackPath || `${base}/notifications`}${url.slice('/notifications'.length)}`;
  }
  if (base && workspaceBase(url) === '') return `${base}${url}`;
  return url;
}
