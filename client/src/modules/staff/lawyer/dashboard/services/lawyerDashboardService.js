import axiosInstance from '@/core/api/axios';

const lawyerDashboardService = {
  async getDashboard() {
    const { data } = await axiosInstance.get('/staff/lawyer/dashboard/');
    return data;
  },
};

export default lawyerDashboardService;
