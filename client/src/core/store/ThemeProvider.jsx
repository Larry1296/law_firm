import { useEffect, useMemo, useState } from 'react';

import ThemeContext from '@/core/store/ThemeContext';
import {
  clearLegacyThemeKeys,
  clearThemeChoice,
  getSystemTheme,
  getThemeStorageKey,
  readThemeChoice,
  saveThemeChoice,
} from '@/core/utils/themeIdentity';

clearLegacyThemeKeys();

// Visitors on the homepage and sign-in pages share one browser profile, so a
// toggle there lasts only for the visit; signed-in users keep their choice.
const SESSION_ONLY_ROLES = new Set(['public', 'auth']);

/**
 * The theme is the device's light/dark setting, following it live, unless the
 * user has explicitly chosen one with the theme toggle.
 */
const ThemeProvider = ({ children, user, role }) => {
  const storageKey = useMemo(() => getThemeStorageKey({ role, user }), [role, user]);
  const remembersChoice = !SESSION_ONLY_ROLES.has(String(role || '').toLowerCase());

  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const [choice, setChoice] = useState(() => ({
    key: storageKey,
    theme: remembersChoice ? readThemeChoice(storageKey) : null,
  }));

  // A different signed-in user brings their own choice (or none).
  const chosenTheme = choice.key === storageKey
    ? choice.theme
    : remembersChoice ? readThemeChoice(storageKey) : null;
  const theme = chosenTheme || systemTheme;

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return undefined;

    const handleSystemThemeChange = (event) => setSystemTheme(event.matches ? 'dark' : 'light');
    media.addEventListener?.('change', handleSystemThemeChange);
    return () => media.removeEventListener?.('change', handleSystemThemeChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Choosing the device's own theme drops the saved choice, so the app goes
  // back to following the device instead of pinning that theme.
  const setTheme = (next) => {
    const value = typeof next === 'function' ? next(theme) : next;
    const followsSystem = value === systemTheme;
    setChoice({ key: storageKey, theme: followsSystem ? null : value });
    if (!remembersChoice) return;
    if (followsSystem) clearThemeChoice(storageKey);
    else saveThemeChoice(storageKey, value);
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
