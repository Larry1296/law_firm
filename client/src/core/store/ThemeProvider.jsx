import { useEffect, useMemo, useRef, useState } from 'react';

import ThemeContext from '@/core/store/ThemeContext';
import {
  getSystemTheme,
  getThemeStorageKey,
  isValidTheme,
  persistLastActiveTheme,
  readLastActiveTheme,
} from '@/core/utils/themeIdentity';

const ThemeProvider = ({ children, user, role }) => {
  const storageKey = useMemo(
    () => getThemeStorageKey({ role, user }),
    [role, user],
  );

  const followsLastActiveTheme = useMemo(
    () => String(role || '').toLowerCase() === 'auth',
    [role],
  );

  const followsSystemTheme = useMemo(
    () => String(role || '').toLowerCase() === 'public',
    [role],
  );

  const resolveInitialTheme = () => {
    if (followsSystemTheme) {
      return getSystemTheme();
    }

    const storedTheme = localStorage.getItem(storageKey);
    const lastActiveTheme = readLastActiveTheme();

    if (followsLastActiveTheme && lastActiveTheme) {
      return lastActiveTheme;
    }

    if (isValidTheme(storedTheme)) {
      return storedTheme;
    }

    return lastActiveTheme || getSystemTheme();
  };

  /*
    Prevent unnecessary sync loops
  */
  const previousStorageKey = useRef(storageKey);

  /*
    Initialize instantly from localStorage
    to avoid flash/flicker
  */
  const [theme, setTheme] = useState(() => {
    return resolveInitialTheme();
  });

  /*
    Only update theme if actual user changes
  */
  useEffect(() => {
    if (previousStorageKey.current !== storageKey) {
      previousStorageKey.current = storageKey;

      setTheme(resolveInitialTheme());
    }
  }, [storageKey]);

  useEffect(() => {
    if (!followsSystemTheme) return undefined;

    setTheme(getSystemTheme());

    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return undefined;

    const handleSystemThemeChange = (event) => {
      setTheme(event.matches ? 'dark' : 'light');
    };

    media.addEventListener?.('change', handleSystemThemeChange);

    return () => {
      media.removeEventListener?.('change', handleSystemThemeChange);
    };
  }, [followsSystemTheme]);

  /*
    Apply theme to DOM + persist
  */
  useEffect(() => {
    const root = document.documentElement;

    root.classList.toggle('dark', theme === 'dark');

    localStorage.setItem(storageKey, theme);
    persistLastActiveTheme(theme);
  }, [theme, storageKey]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
