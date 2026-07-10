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

  async register(payload) {
    const { data } = await axiosInstance.post('/auth/register/', payload);
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

  async changeStaffPassword(firmRole, payload) {
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

    const { data } = await axiosInstance.post(endpoint, body);
    return data;
  },

  async changePassword(payload) {
    const { data } = await axiosInstance.post('/auth/change-password/', payload);
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
  // LOGOUT
  // =====================
  async logout(payload) {
    const { data } = await axiosInstance.post('/auth/logout/', payload);
    return data;
  },
};

export default authService;
