import { useState } from 'react';

import authService from '@/modules/auth/service/authService';
import {
  clearAuthSession,
  getAuthStorage,
  getStoredAuth,
} from '@/core/utils/authStorage';
import Swal from '@/core/utils/themedSwal';
import { getApiErrorMessage } from '@/core/utils/errorMessages';

export default function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const {
    accessToken,
    refreshToken: refreshTokenValue,
    user,
  } = getStoredAuth();

  const isAuthenticated = !!accessToken && !!refreshTokenValue && !!user;

  const firmRole =
    user?.firm_role ||
    user?.firmRole ||
    user?.staff_role ||
    user?.staffRole ||
    null;

  // =====================
  // BASE EXECUTOR
  // =====================
  const execute = async (callback, successMessage = null) => {
    try {
      setLoading(true);
      setError(null);

      const response = await callback();
      const data = response?.data || response;

      const storage = getAuthStorage();

      if (data?.access) {
        storage.setItem('accessToken', data.access);
      }

      if (data?.refresh) {
        storage.setItem('refreshToken', data.refresh);
      }

      if (data?.user) {
        storage.setItem('user', JSON.stringify(data.user));
      }

      if (successMessage) {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: successMessage,
          timer: 1500,
          showConfirmButton: false,
          timerProgressBar: true,
        });
      }

      return response;
    } catch (err) {
      const message = getApiErrorMessage(err);

      setError(message);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message,
      });

      throw err;
    } finally {
      setLoading(false);
    }
  };

  // =====================
  // AUTH
  // =====================
  const login = (payload) =>
    execute(() => authService.login(payload), 'Login successful');

  const register = (payload) =>
    execute(() => authService.register(payload), 'Registration successful');

  // =====================
  // PASSWORD FLOW
  // =====================
  const forgotPassword = (payload) =>
    execute(
      () => authService.forgotPassword(payload),
      'Reset link sent to email',
    );

  const resetPassword = (payload) =>
    execute(
      () => authService.resetPassword(payload),
      'Password reset successful',
    );

  // =====================
  // RECOVER ACCOUNT
  // =====================
  const recoverAccount = (payload) =>
    execute(() => authService.recoverAccount(payload));

  // =====================
  // TOKEN REFRESH
  // =====================
  const refreshToken = async () => {
    const { refreshToken: refresh } = getStoredAuth();

    if (!refresh) return null;

    const response = await authService.refreshToken({ refresh });
    const data = response?.data || response;

    const storage = getAuthStorage();

    if (data?.access) {
      storage.setItem('accessToken', data.access);
    }

    if (data?.refresh) {
      storage.setItem('refreshToken', data.refresh);
    }

    return response;
  };

  // =====================
  // LOGOUT
  // =====================
  const logout = () =>
    execute(async () => {
      const { refreshToken: refresh } = getStoredAuth();

      if (refresh) {
        await authService.logout({ refresh });
      }

      clearAuthSession();

      window.location.replace('/login');

      return { success: true };
    });

  return {
    user,
    isAuthenticated,
    firmRole,
    login,
    register,
    forgotPassword,
    resetPassword,
    recoverAccount,
    refreshToken,
    logout,
    loading,
    error,
  };
}
