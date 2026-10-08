import axiosInstance from '@/core/api/axios';

const adminFirmService = {
  async getFirm() {
    const { data } = await axiosInstance.get('/admin/firm/');
    return data;
  },

  async updateFirm(payload) {
    const { data } = await axiosInstance.patch('/admin/firm/', payload);
    return data;
  },

  // The server trims, squares and resizes any logo, so it fits every logo slot the same way.
  async uploadLogo(file) {
    const form = new FormData();
    form.append('logo', file);
    const { data } = await axiosInstance.post('/admin/firm/logo/', form);
    return data.firm;
  },

  async removeLogo() {
    const { data } = await axiosInstance.delete('/admin/firm/logo/');
    return data.firm;
  },

  // The records room: the firm's rooms, cabinets, safes, drawers and shelves, as labelled physically.
  async getRecordsRoom() {
    const { data } = await axiosInstance.get('/admin/firm/records-room/');
    return data;
  },

  async createStorageLocation(payload) {
    const { data } = await axiosInstance.post('/admin/firm/records-room/', payload);
    return data;
  },

  async updateStorageLocation(id, payload) {
    const { data } = await axiosInstance.patch(`/admin/firm/records-room/${id}/`, payload);
    return data;
  },

  async registerOwnerLawyerProfile(payload) {
    const { data } = await axiosInstance.post(
      '/admin/firm/owner-lawyer-profile/',
      payload,
    );
    return data;
  },

  async getAdminDelegation() {
    const { data } = await axiosInstance.get('/admin/firm/admin-delegation/');
    return data;
  },

  async delegateAdmin(payload) {
    const { data } = await axiosInstance.post(
      '/admin/firm/admin-delegation/',
      payload,
    );
    return data;
  },

  async revokeDelegatedAdmin(userId) {
    const { data } = await axiosInstance.delete(
      `/admin/firm/admin-delegation/${userId}/`,
    );
    return data;
  },

  async getSettings() {
    const { data } = await axiosInstance.get('/admin/firm/settings/');
    return data;
  },

  async updateSettings(payload) {
    const { data } = await axiosInstance.patch('/admin/firm/settings/', payload);
    return data;
  },

  async getDepartments() {
    const { data } = await axiosInstance.get('/admin/firm/departments/');
    return data.departments || [];
  },

  async getBranches() {
    const { data } = await axiosInstance.get('/admin/firm/branches/');
    return data.branches || [];
  },

  async createBranch(payload) {
    const { data } = await axiosInstance.post('/admin/firm/branches/', payload);
    return data;
  },

  async updateBranch(id, payload) {
    const { data } = await axiosInstance.patch(
      `/admin/firm/branches/${id}/`,
      payload,
    );
    return data;
  },

  async deleteBranch(id) {
    await axiosInstance.delete(`/admin/firm/branches/${id}/`);
  },

  async getStaffOptions() {
    const { data } = await axiosInstance.get('/admin/firm/staff-options/');
    return data.staff || [];
  },

  async getITReport() {
    const { data } = await axiosInstance.get('/admin/firm/it-report/');
    return data;
  },

  async createDepartment(payload) {
    const { data } = await axiosInstance.post('/admin/firm/departments/', payload);
    return data;
  },

  async updateDepartment(id, payload) {
    const { data } = await axiosInstance.patch(
      `/admin/firm/departments/${id}/`,
      payload,
    );
    return data;
  },

  async deleteDepartment(id) {
    await axiosInstance.delete(`/admin/firm/departments/${id}/`);
  },
};

export default adminFirmService;
