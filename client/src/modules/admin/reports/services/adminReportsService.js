import axiosInstance from '@/core/api/axios';

const adminReportsService = {
  async getFirmReport() {
    const { data } = await axiosInstance.get('/admin/reports/');
    return data;
  },

  async getAuditEvents(params = {}) {
    const { data } = await axiosInstance.get('/audit-logs/', { params });
    return data;
  },

  async getDocumentRegister(params = {}) {
    const { data } = await axiosInstance.get('/admin/documents/', { params });
    return data;
  },
};

export default adminReportsService;
