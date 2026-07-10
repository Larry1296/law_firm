import axiosInstance from '@/core/api/axios';

const secretaryDashboardService = {
  async getDashboard() {
    const { data } = await axiosInstance.get('/staff/secretary/dashboard/');
    return data;
  },
};

export default secretaryDashboardService;
