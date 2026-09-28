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

// Only a theme the user explicitly chose is stored; with no choice the app
// follows the device's light/dark setting.
const CHOICE_PREFIX = 'theme-choice-';

export const getThemeStorageKey = ({ role = 'public', user } = {}) => {
  return `${CHOICE_PREFIX}${normalize(role) || 'public'}-${getThemeUserIdentity(user)}`;
};

export const isValidTheme = (theme) => ['light', 'dark'].includes(theme);

export const getSystemTheme = () => {
  if (typeof window === 'undefined') return 'light';

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

export const readThemeChoice = (storageKey) => {
  try {
    const theme = localStorage.getItem(storageKey);
    return isValidTheme(theme) ? theme : null;
  } catch {
    return null;
  }
};

export const saveThemeChoice = (storageKey, theme) => {
  try {
    localStorage.setItem(storageKey, theme);
  } catch {
    // Ignore storage failures so theme switching never breaks navigation.
  }
};

/*
  Earlier versions saved whatever theme was showing on every visit, which
  pinned users to it instead of their device setting. Those values were never
  a choice, so they are dropped.
*/
export const clearLegacyThemeKeys = () => {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('theme-') && !key.startsWith(CHOICE_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage may be unavailable (private mode); nothing to clean.
  }
};
