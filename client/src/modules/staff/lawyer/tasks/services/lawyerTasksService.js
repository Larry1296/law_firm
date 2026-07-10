import axiosInstance from '@/core/api/axios';

const lawyerTasksService = {
  async getTasks(params = {}) {
    const { data } = await axiosInstance.get('/staff/lawyer/tasks/', {
      params,
    });
    return data;
  },
};

export default lawyerTasksService;
