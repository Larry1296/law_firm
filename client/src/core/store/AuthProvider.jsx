import { useCallback, useEffect, useState } from 'react';

import { jwtDecode } from 'jwt-decode';

import SessionLockScreen from '@/core/auth/SessionLockScreen';
import {
  isSessionLocked,
  lockIfExpired,
  lockSession,
  subscribeToSessionLock,
  unlockSession,
} from '@/core/auth/sessionLock';
import AuthContext from '@/core/store/AuthContext';
import { getEffectiveRole } from '@/core/utils/effectiveRole';
import authService from '@/modules/auth/service/authService';
import { confirmAction } from '@/core/utils/themedSwal';
import {
  clearAuthSession,
  getAuthStorage,
  getAuthStorageMode,
  getStoredAuth,
  saveAuthSession,
} from '@/core/utils/authStorage';

const SESSION_CHECK_INTERVAL_MS = 5 * 1000;
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
    } catch (error) { if (error?.isActionCancelled) return;
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

  const [locked, setLocked] = useState(isSessionLocked);

  useEffect(() => subscribeToSessionLock(setLocked), []);

  const login = ({ user, access, refresh }, rememberMe = true) => {
    setUser(user);
    setAccessToken(access);
    setRefreshToken(refresh);

    saveAuthSession({ user, access, refresh }, rememberMe);
    unlockSession();
  };

  /** Updates the signed-in user's firm branding (such as a new logo) everywhere at once. */
  const updateFirm = useCallback((firm) => {
    setUser((current) => {
      if (!current) return current;
      const next = { ...current, firm: { ...current.firm, ...firm } };
      getAuthStorage().setItem('user', JSON.stringify(next));
      return next;
    });
  }, []);

  const clearSessionAndRedirect = useCallback(() => {
    unlockSession();
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);

    clearAuthSession();

    if (window.location.pathname !== '/login') {
      window.location.replace('/login');
    }
  }, []);

  const logout = async ({ redirect = true } = {}) => {
    const confirmation = await confirmAction({ title: 'Sign out of Sheria Master?', text: 'You will need to sign in again to continue.', confirmText: 'Sign out', tone: 'warning' });
    if (!confirmation) return false;
    const refresh = refreshToken || getStoredAuth().refreshToken;

    if (refresh) {
      try {
        await authService.logout({
          refresh,
        }, { confirmation });
      } catch (error) {
        if (error?.isActionCancelled) return false;
        console.error('Logout API failed:', error);
      }
    }

    unlockSession();
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);

    clearAuthSession();

    if (redirect && window.location.pathname !== '/login') {
      window.location.replace('/login');
    }
    return true;
  };

  const syncSessionUser = useCallback(async () => {
    const stored = getStoredAuth();

    if (!stored.accessToken || !stored.refreshToken || !stored.user || isSessionLocked()) {
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
    } catch (error) { if (error?.isActionCancelled) return;
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        clearSessionAndRedirect();
      }
    }
  }, [clearSessionAndRedirect]);

  /*
    Every few seconds (and when the tab regains focus) the screen locks if the
    access token, or the whole sign-in, has run out. Nothing is renewed behind
    the user's back; their password unlocks the screen with a fresh session.
  */
  const checkSession = useCallback(() => {
    const stored = getStoredAuth();
    if (!stored.accessToken || !stored.refreshToken) return;

    if (isSessionLocked()) {
      // Another tab unlocked this same account with the password: carry on here too.
      // Only a fresh sign-in leaves both tokens valid; a lock always has one expired.
      const renewed = !isExpired(stored.accessToken) && !isExpired(stored.refreshToken);
      if (renewed && user && String(stored.user?.id) === String(user.id)) {
        setAccessToken(stored.accessToken);
        setRefreshToken(stored.refreshToken);
        unlockSession();
      }
      return;
    }

    if (isExpired(stored.refreshToken)) lockSession();
    else lockIfExpired(stored.accessToken);
  }, [user]);

  useEffect(() => {
    if (!accessToken || !refreshToken) {
      return undefined;
    }

    // Session expiry is the external condition this effect synchronizes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkSession();

    const intervalId = window.setInterval(checkSession, SESSION_CHECK_INTERVAL_MS);
    window.addEventListener('focus', checkSession);
    document.addEventListener('visibilitychange', checkSession);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', checkSession);
      document.removeEventListener('visibilitychange', checkSession);
    };
  }, [accessToken, refreshToken, checkSession]);

  // Behind the lock screen the page is hidden from keyboard and screen readers too.
  const showLock = locked && !!user && !!accessToken;
  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;
    root.inert = showLock;
    return () => { root.inert = false; };
  }, [showLock]);

  /** Unlock with the signed-in user's password; a different account cannot take over the screen. */
  const unlock = async (password) => {
    const data = await authService.login({ email: user.email, password });
    if (String(data?.user?.id) !== String(user.id)) {
      throw new Error('Sign in as the account that was locked, or sign out.');
    }
    const nextUser = {
      ...data.user,
      firm_role: data.firm_role ?? data.user?.firm_role ?? null,
      is_firm_owner: data.is_firm_owner ?? data.user?.is_firm_owner ?? false,
    };
    login({ user: nextUser, access: data.access, refresh: data.refresh }, getAuthStorageMode() === 'local');
  };

  useEffect(() => {
    if (!accessToken || !refreshToken) {
      return undefined;
    }

    // Synchronize the local session snapshot when token identity changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
  const effectiveRole = getEffectiveRole(user, firmRole);

  const isAdmin = effectiveRole === 'ADMIN';
  const isOfficialClient = effectiveRole === 'OFFICIAL_CLIENT';
  const isProspect = effectiveRole === 'PROSPECT';
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
    updateFirm,

    isAuthenticated: !!accessToken,
    isLocked: showLock,

    // roles
    role,
    firmRole,
    effectiveRole,

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

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showLock && <SessionLockScreen user={user} onUnlock={unlock} onSignOut={() => logout()} />}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
