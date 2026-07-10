import { getStoredAuth } from '@/core/utils/authStorage';

const normalize = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase();
};

const readJwtIdentity = () => {
  try {
    const token = getStoredAuth().accessToken;
    if (!token) return '';

    const payload = JSON.parse(atob(token.split('.')[1] || ''));

    return normalize(
      payload.user_id ||
        payload.id ||
        payload.sub ||
        payload.email ||
        payload.username,
    );
  } catch {
    return '';
  }
};

export const getThemeUserIdentity = (user) => {
  const directIdentity = normalize(
    user?.id ||
      user?.user_id ||
      user?.uuid ||
      user?.pk ||
      user?._id ||
      user?.profile?.id ||
      user?.profile?.user_id ||
      user?.email,
  );

  return directIdentity || readJwtIdentity() || 'guest';
};

export const getThemeStorageKey = ({ role = 'public', user } = {}) => {
  return `theme-${normalize(role) || 'public'}-${getThemeUserIdentity(user)}`;
};

export const LAST_ACTIVE_THEME_KEY = 'theme-last-active';

export const isValidTheme = (theme) => ['light', 'dark'].includes(theme);

export const getSystemTheme = () => {
  if (typeof window === 'undefined') return 'light';

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

export const readLastActiveTheme = () => {
  try {
    const theme = localStorage.getItem(LAST_ACTIVE_THEME_KEY);
    return isValidTheme(theme) ? theme : null;
  } catch {
    return null;
  }
};

export const persistLastActiveTheme = (theme) => {
  if (!isValidTheme(theme)) return;

  try {
    localStorage.setItem(LAST_ACTIVE_THEME_KEY, theme);
  } catch {
    // Ignore storage failures so theme switching never breaks navigation.
  }
};

export const persistThemeForUser = ({ role, user, theme }) => {
  if (!isValidTheme(theme)) return;

  try {
    localStorage.setItem(getThemeStorageKey({ role, user }), theme);
    persistLastActiveTheme(theme);
  } catch {
    // Ignore storage failures so auth and routing stay uninterrupted.
  }
};
