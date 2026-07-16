import axiosInstance from '@/core/api/axios';

const clientDashboardService = {
  async getDashboard() {
    const { data } = await axiosInstance.get('/client/dashboard/');
    return data;
  },
};

export default clientDashboardService;
