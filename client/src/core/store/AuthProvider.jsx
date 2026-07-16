import { useCallback, useEffect, useState } from 'react';

import { jwtDecode } from 'jwt-decode';

import AuthContext from '@/core/store/AuthContext';
import authService from '@/modules/auth/service/authService';
import {
  clearAuthSession,
  getAuthStorage,
  getStoredAuth,
  saveAuthSession,
} from '@/core/utils/authStorage';

const REFRESH_BEFORE_EXPIRY_MS = 60 * 1000;
const MIN_REFRESH_DELAY_MS = 5 * 1000;
const SESSION_SYNC_INTERVAL_MS = 30 * 1000;

const getTokenExpiryMs = (token) => {
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    return decoded.exp ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
};

const isExpired = (token) => {
  const expiry = getTokenExpiryMs(token);
  return !!expiry && expiry <= Date.now();
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return getStoredAuth().user;
    } catch (error) {
      console.error('Failed to parse user:', error);
      return null;
    }
  });

  const [accessToken, setAccessToken] = useState(
    () => getStoredAuth().accessToken,
  );

  const [refreshToken, setRefreshToken] = useState(
    () => getStoredAuth().refreshToken,
  );

  const login = ({ user, access, refresh }, rememberMe = true) => {
    setUser(user);
    setAccessToken(access);
    setRefreshToken(refresh);

    saveAuthSession({ user, access, refresh }, rememberMe);
  };

  const clearSessionAndRedirect = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);

    clearAuthSession();

    if (window.location.pathname !== '/login') {
      window.location.replace('/login');
    }
  }, []);

  const logout = async ({ redirect = true } = {}) => {
    const refresh = refreshToken || getStoredAuth().refreshToken;

    if (refresh) {
      try {
        await authService.logout({
          refresh,
        });
      } catch (error) {
        console.error('Logout API failed:', error);
      }
    }

    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);

    clearAuthSession();

    if (redirect && window.location.pathname !== '/login') {
      window.location.replace('/login');
    }
  };

  const refreshSession = useCallback(async () => {
    const stored = getStoredAuth();
    const currentRefreshToken = stored.refreshToken;

    if (!currentRefreshToken || isExpired(currentRefreshToken)) {
      clearSessionAndRedirect();
      return null;
    }

    try {
      const data = await authService.refreshToken({
        refresh: currentRefreshToken,
      });

      const nextAccessToken = data.access;
      const nextRefreshToken = data.refresh || currentRefreshToken;
      const currentUser = stored.user || user;

      if (!nextAccessToken) {
        throw new Error('Missing refreshed access token');
      }

      const storage = getAuthStorage();
      storage.setItem('accessToken', nextAccessToken);
      storage.setItem('refreshToken', nextRefreshToken);
      storage.setItem('user', JSON.stringify(currentUser || {}));

      setAccessToken(nextAccessToken);
      setRefreshToken(nextRefreshToken);
      setUser(currentUser);

      return nextAccessToken;
    } catch (error) {
      console.error('Session refresh failed:', error);
      clearSessionAndRedirect();
      return null;
    }
  }, [clearSessionAndRedirect, user]);

  const syncSessionUser = useCallback(async () => {
    const stored = getStoredAuth();

    if (!stored.accessToken || !stored.refreshToken || !stored.user) {
      return;
    }

    try {
      const data = await authService.me();
      const serverUser = {
        ...data.user,
        firm_role: data.firm_role ?? data.user?.firm_role ?? null,
        is_firm_owner: data.is_firm_owner ?? data.user?.is_firm_owner ?? false,
      };
      const wasAdmin = stored.user?.role === 'ADMIN';
      const isStillAdmin = serverUser.role === 'ADMIN';

      if (wasAdmin && !isStillAdmin) {
        clearSessionAndRedirect();
        return;
      }

      const storage = getAuthStorage();
      storage.setItem('user', JSON.stringify(serverUser));
      setUser(serverUser);
    } catch (error) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        clearSessionAndRedirect();
      }
    }
  }, [clearSessionAndRedirect]);

  useEffect(() => {
    const stored = getStoredAuth();

    if (!stored.accessToken || !stored.refreshToken) {
      return undefined;
    }

    if (isExpired(stored.refreshToken)) {
      clearSessionAndRedirect();
      return undefined;
    }

    const accessExpiryMs = getTokenExpiryMs(stored.accessToken);

    if (!accessExpiryMs || isExpired(stored.accessToken)) {
      refreshSession();
      return undefined;
    }

    const delay = Math.max(
      accessExpiryMs - Date.now() - REFRESH_BEFORE_EXPIRY_MS,
      MIN_REFRESH_DELAY_MS,
    );

    const timeoutId = window.setTimeout(() => {
      refreshSession();
    }, delay);

    const checkSessionOnFocus = () => {
      const current = getStoredAuth();

      if (!current.accessToken || !current.refreshToken) {
        return;
      }

      if (isExpired(current.refreshToken)) {
        clearSessionAndRedirect();
        return;
      }

      const currentAccessExpiryMs = getTokenExpiryMs(current.accessToken);
      const shouldRefresh =
        !currentAccessExpiryMs ||
        currentAccessExpiryMs - Date.now() <= REFRESH_BEFORE_EXPIRY_MS;

      if (shouldRefresh) {
        refreshSession();
      }
    };

    window.addEventListener('focus', checkSessionOnFocus);
    document.addEventListener('visibilitychange', checkSessionOnFocus);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('focus', checkSessionOnFocus);
      document.removeEventListener('visibilitychange', checkSessionOnFocus);
    };
  }, [accessToken, refreshToken, clearSessionAndRedirect, refreshSession]);

  useEffect(() => {
    if (!accessToken || !refreshToken) {
      return undefined;
    }

    syncSessionUser();

    const intervalId = window.setInterval(
      syncSessionUser,
      SESSION_SYNC_INTERVAL_MS,
    );

    window.addEventListener('focus', syncSessionUser);
    document.addEventListener('visibilitychange', syncSessionUser);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', syncSessionUser);
      document.removeEventListener('visibilitychange', syncSessionUser);
    };
  }, [accessToken, refreshToken, syncSessionUser]);

  // =========================
  // ROLE HELPERS
  // =========================
  const role = user?.role;
  const firmRole = user?.firm_role;

  const isAdmin = role === 'ADMIN';
  const isOfficialClient = role === 'OFFICIAL_CLIENT';
  const isProspect = role === 'PROSPECT';
  const isClient = isOfficialClient || isProspect;
  const isStaff = role === 'STAFF';

  const isLawyer = firmRole === 'LAWYER';
  const isSecretary = firmRole === 'SECRETARY';
  const isAccountant = firmRole === 'ACCOUNTANT';
  const isHR = firmRole === 'HR';
  const isIT = firmRole === 'IT';

  const value = {
    user,
    accessToken,
    refreshToken,

    login,
    logout,

    isAuthenticated: !!accessToken,

    // roles
    role,
    firmRole,

    // helpers
    isAdmin,
    isClient,
    isOfficialClient,
    isProspect,
    isStaff,
    isLawyer,
    isSecretary,
    isAccountant,
    isHR,
    isIT,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
