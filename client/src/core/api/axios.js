import axios from 'axios';

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
  headers: {
    'Content-Type': 'application/json',
  },
});

/* =========================================================
   REQUEST INTERCEPTOR
========================================================= */
axiosInstance.interceptors.request.use(
  (config) => {
    const storage = getAuthStorage();
    const token = storage.getItem('accessToken');

    config.headers = config.headers ?? {};

    const isAuthEndpoint =
      config.url?.includes('/login') ||
      config.url?.includes('/register') ||
      config.url?.includes('/token/refresh');

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
      originalRequest?.url?.includes('/register') ||
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
