import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

import {
  clearAuthSession,
  getAuthStorage,
  getStoredAuth,
} from '@/core/utils/authStorage';
import { attachApiErrorMessage } from '@/core/utils/errorMessages';

/* =========================================================
   BASE INSTANCE
========================================================= */
const cleanBaseURL = import.meta.env.VITE_API_BASE_URL?.trim().replace(
  /\/$/,
  '',
);

const axiosInstance = axios.create({
  baseURL: cleanBaseURL,
});

const TOKEN_EXPIRY_SKEW_MS = 30 * 1000;
let proactiveRefreshPromise = null;

const tokenNeedsRefresh = (token) => {
  if (!token) return false;
  try {
    const { exp } = jwtDecode(token);
    return !exp || exp * 1000 <= Date.now() + TOKEN_EXPIRY_SKEW_MS;
  } catch {
    return true;
  }
};

const refreshAccessToken = async () => {
  if (proactiveRefreshPromise) return proactiveRefreshPromise;

  proactiveRefreshPromise = (async () => {
    const { refreshToken, user } = getStoredAuth();
    if (!refreshToken) throw new Error('No refresh token');

    const { data } = await axios.post(`${cleanBaseURL}/auth/token/refresh/`, {
      refresh: refreshToken,
    });
    if (!data?.access) throw new Error('Token refresh returned no access token');

    const storage = getAuthStorage();
    storage.setItem('accessToken', data.access);
    storage.setItem('refreshToken', data.refresh || refreshToken);
    if (user) storage.setItem('user', JSON.stringify(user));
    return data.access;
  })().finally(() => {
    proactiveRefreshPromise = null;
  });

  return proactiveRefreshPromise;
};

/* =========================================================
   REQUEST INTERCEPTOR
========================================================= */
axiosInstance.interceptors.request.use(
  async (config) => {
    const storage = getAuthStorage();
    let token = storage.getItem('accessToken');

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
      config.url?.includes('/token/refresh');

    if (token && !isAuthEndpoint && tokenNeedsRefresh(token)) {
      try {
        token = await refreshAccessToken();
      } catch (error) {
        clearAuthSession();
        if (window.location.pathname !== '/login') window.location.replace('/login');
        return Promise.reject(error);
      }
    }

    if (token && !isAuthEndpoint) {
      config.headers.Authorization = `Bearer ${token}`;
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
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    const isAuthEndpoint =
      originalRequest?.url?.includes('/login') ||
      originalRequest?.url?.includes('/token/refresh');

    const isAdminStaffEndpoint = originalRequest?.url?.includes('/admin/staff/');
    const storedUser = getStoredAuth().user;

    if (status === 403 && isAdminStaffEndpoint && storedUser?.role === 'ADMIN') {
      forceLogoutToLogin();
      attachApiErrorMessage(error);
      return Promise.reject(error);
    }

    if (status !== 401 || isAuthEndpoint) {
      attachApiErrorMessage(error);
      return Promise.reject(error);
    }

    // prevent infinite loop
    if (originalRequest._retry) {
      forceLogoutToLogin();
      attachApiErrorMessage(error);
      return Promise.reject(error);
    }

    if (isRefreshing) {
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
