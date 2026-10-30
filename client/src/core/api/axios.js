import axios from 'axios';
import { captureConfirmationOptions, releaseCriticalAction, requireCriticalConfirmation } from './criticalActionGuard';
import { reportRefused, reportSaved } from './actionFeedback';

import {
  clearAuthSession,
  getAuthStorage,
  getStoredAuth,
} from '@/core/utils/authStorage';
import { attachApiErrorMessage } from '@/core/utils/errorMessages';
import Swal from '@/core/utils/themedSwal';
import {
  isSessionLocked,
  isTokenExpired,
  lockIfExpired,
  lockSession,
} from '@/core/auth/sessionLock';

/* =========================================================
   BASE INSTANCE
========================================================= */
const cleanBaseURL = import.meta.env.VITE_API_BASE_URL?.trim().replace(
  /\/$/,
  '',
);

let pausedDialogOpen = false;
const showChangesPaused = async (data) => {
  if (pausedDialogOpen) return;
  pausedDialogOpen = true;
  const isOwner = getStoredAuth().user?.role === 'ADMIN';
  await Swal.fire({
    icon: 'warning',
    title: 'Changes are paused',
    text: `${data?.detail || data?.message || "The firm's subscription has lapsed."} ${isOwner
      ? 'Renew from Subscription to continue.'
      : 'Ask the firm owner to renew the subscription.'}`,
    confirmButtonText: 'OK',
  }).finally(() => { pausedDialogOpen = false; });
};

const axiosInstance = axios.create({
  baseURL: cleanBaseURL,
});
captureConfirmationOptions(axiosInstance);

// A locked screen sends nothing until the user unlocks it.
const sessionLockedError = () => {
  const error = new Error('Your session is locked. Unlock it to continue.');
  error.isSessionLocked = true;
  error.userMessage = error.message;
  return error;
};

/* =========================================================
   REQUEST INTERCEPTOR
========================================================= */
axiosInstance.interceptors.request.use(
  async (config) => {
    const storage = getAuthStorage();
    const token = storage.getItem('accessToken');

    config.headers = config.headers ?? {};

    // Let Axios choose JSON for plain objects and let the browser add the
    // required multipart boundary for FormData uploads. A global JSON header
    // causes uploaded files to arrive at Django as an empty request body.
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (typeof config.headers.delete === 'function') {
        config.headers.delete('Content-Type');
      } else {
        delete config.headers['Content-Type'];
      }
    }

    const isAuthEndpoint =
      config.url?.includes('/login') ||
      config.url?.includes('/token/refresh') ||
      config.url?.includes('/auth/unlock/');

    // An expired token is never renewed silently: the screen locks instead.
    if (token && !isAuthEndpoint && (isSessionLocked() || lockIfExpired(token))) {
      return Promise.reject(sessionLockedError());
    }

    const initiatingUser = getStoredAuth().user?.id;
    await requireCriticalConfirmation(config);
    const currentToken = getAuthStorage().getItem('accessToken');
    if ((initiatingUser !== getStoredAuth().user?.id) || (currentToken && !isAuthEndpoint && (isSessionLocked() || lockIfExpired(currentToken)))) {
      releaseCriticalAction(config);
      return Promise.reject(sessionLockedError());
    }
    if (currentToken && !isAuthEndpoint) {
      config.headers.Authorization = `Bearer ${currentToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

/* =========================================================
   REFRESH LOGIC STATE
========================================================= */
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

const forceLogoutToLogin = () => {
  clearAuthSession();

  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
};

/* =========================================================
   RESPONSE INTERCEPTOR (AUTO REFRESH)
========================================================= */
axiosInstance.interceptors.response.use(
  (response) => { reportSaved(response.config); releaseCriticalAction(response.config); return response; },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    const isAuthEndpoint =
      originalRequest?.url?.includes('/login') ||
      originalRequest?.url?.includes('/token/refresh') ||
      originalRequest?.url?.includes('/auth/unlock/');

    // A lapsed firm keeps its records viewable but pauses changes until it renews.
    if (status === 402 && error.response?.data?.code === 'subscription_inactive') {
      releaseCriticalAction(originalRequest);
      showChangesPaused(error.response.data);
      // The dialog explains it, so pages do not show the refusal again.
      error.isActionCancelled = true;
      return Promise.reject(error);
    }

    const isAdminStaffEndpoint = originalRequest?.url?.includes('/admin/staff/');
    const storedUser = getStoredAuth().user;
    if (status !== 401 || isAuthEndpoint) releaseCriticalAction(originalRequest);

    if (status === 403 && isAdminStaffEndpoint && storedUser?.role === 'ADMIN') {
      forceLogoutToLogin();
      attachApiErrorMessage(error);
      return Promise.reject(error);
    }

    // A session still on a temporary password goes back to sign-in, where the change is required.
    if (status === 403 && error.response?.data?.code === 'password_change_required') {
      forceLogoutToLogin();
      attachApiErrorMessage(error);
      return Promise.reject(error);
    }

    if (status !== 401 || isAuthEndpoint) {
      attachApiErrorMessage(error);
      reportRefused(error);
      return Promise.reject(error);
    }

    // A token that ran out while the request was in flight locks the screen, as at expiry.
    if (isSessionLocked() || isTokenExpired(getStoredAuth().accessToken)) {
      releaseCriticalAction(originalRequest);
      lockSession();
      return Promise.reject(sessionLockedError());
    }

    // prevent infinite loop
    if (originalRequest._retry) {
      releaseCriticalAction(originalRequest);
      forceLogoutToLogin();
      attachApiErrorMessage(error);
      return Promise.reject(error);
    }

    if (isRefreshing) {
      originalRequest._retry = true;
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { refreshToken } = getStoredAuth();

      if (!refreshToken) {
        throw new Error('No refresh token');
      }

      const { data } = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/auth/token/refresh/`,
        {
          refresh: refreshToken,
        },
      );

      const newAccessToken = data.access;
      const newRefreshToken = data.refresh || refreshToken;

      const storage = getAuthStorage();
      storage.setItem('accessToken', newAccessToken);
      storage.setItem('refreshToken', newRefreshToken);
      storage.setItem('user', JSON.stringify(getStoredAuth().user || {}));

      axiosInstance.defaults.headers.Authorization = `Bearer ${newAccessToken}`;

      processQueue(null, newAccessToken);

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      return axiosInstance(originalRequest);
    } catch (err) {
      releaseCriticalAction(originalRequest);
      processQueue(err, null);

      forceLogoutToLogin();

      attachApiErrorMessage(err);
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  },
);

export default axiosInstance;
