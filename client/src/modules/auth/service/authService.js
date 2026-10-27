import axiosInstance from '@/core/api/axios';

const authService = {
  // =====================
  // AUTH
  // =====================
  async login(payload) {
    const { data } = await axiosInstance.post('auth/login/', payload);
    return data;
  },

  async me() {
    const { data } = await axiosInstance.get('/auth/me/');
    return data;
  },

  // =====================
  // PASSWORD FLOW
  // =====================
  async forgotPassword(payload) {
    const { data } = await axiosInstance.post(
      '/auth/forgot-password/',
      payload,
    );
    return data;
  },

  async resetPassword(payload) {
    const { data } = await axiosInstance.post('/auth/reset-password/', payload);
    return data;
  },

  async changeStaffPassword(firmRole, payload, options = {}) {
    const endpoints = {
      LAWYER: '/staff/lawyer/change-password/',
      SECRETARY: '/staff/secretary/change-password/',
      ACCOUNTANT: '/staff/accountant/change-password/',
      HR: '/staff/hr/change-password/',
      IT: '/staff/it/change-password/',
    };
    const endpoint = endpoints[firmRole] || '/staff/lawyer/change-password/';
    const body =
      firmRole === 'LAWYER'
        ? payload
        : {
            old_password: payload.current_password,
            new_password: payload.new_password,
            confirm_password: payload.confirm_password,
          };

    const { data } = await axiosInstance.post(endpoint, body, options);
    return data;
  },

  async changePassword(payload, options = {}) {
    const { data } = await axiosInstance.post('/auth/change-password/', payload, options);
    return data;
  },

  // =====================
  // TOKEN
  // =====================
  async refreshToken(payload) {
    const { data } = await axiosInstance.post('/auth/token/refresh/', payload);
    return data;
  },

  // =====================
  // ACCOUNT RECOVERY
  // =====================
  async recoverAccount(payload) {
    const { data } = await axiosInstance.post(
      '/auth/recover-account/',
      payload,
    );
    return data;
  },

  // =====================
  // WORKSPACE UNLOCK PIN
  // =====================
  async unlockWithPin(payload) {
    const { data } = await axiosInstance.post('/auth/unlock/', payload);
    return data;
  },

  async setUnlockPin(payload) {
    const { data } = await axiosInstance.post('/auth/unlock-pin/', payload);
    return data;
  },

  async removeUnlockPin() {
    const { data } = await axiosInstance.delete('/auth/unlock-pin/');
    return data;
  },

  // =====================
  // LOGOUT
  // =====================
  async logout(payload, options = {}) {
    const { data } = await axiosInstance.post('/auth/logout/', payload, options);
    return data;
  },
};

export default authService;
