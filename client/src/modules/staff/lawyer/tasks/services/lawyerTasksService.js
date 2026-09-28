import axiosInstance from '@/core/api/axios';

const lawyerTasksService = {
  async getTasks(params = {}) {
    const { data } = await axiosInstance.get('/staff/lawyer/tasks/', {
      params,
    });
    return data;
  },

  async getApprovals() {
    const { data } = await axiosInstance.get('/staff/lawyer/approvals/');
    return data;
  },
};

export default lawyerTasksService;
