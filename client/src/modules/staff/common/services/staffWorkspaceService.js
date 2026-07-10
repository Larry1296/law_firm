import axiosInstance from '@/core/api/axios';

const normalizeBase = (base) => base.replace(/\/$/, '');

const staffWorkspaceService = {
  async getDashboard(apiBase) {
    const { data } = await axiosInstance.get(`${normalizeBase(apiBase)}/dashboard/`);
    return data;
  },

  async getProfile(apiBase) {
    const { data } = await axiosInstance.get(`${normalizeBase(apiBase)}/profile/`);
    return data;
  },

  async getItems(apiBase, endpoint) {
    const { data } = await axiosInstance.get(`${normalizeBase(apiBase)}/${endpoint}/`);
    return data;
  },

  async changePassword(apiBase, payload) {
    const { data } = await axiosInstance.post(
      `${normalizeBase(apiBase)}/change-password/`,
      payload,
    );
    return data;
  },
};

export default staffWorkspaceService;
