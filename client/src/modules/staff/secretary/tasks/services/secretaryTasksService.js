import axiosInstance from '@/core/api/axios';

const secretaryTasksService = {
  async getTasks(params = {}) {
    const { data } = await axiosInstance.get('/staff/secretary/tasks/', {
      params,
    });
    return data;
  },
};

export default secretaryTasksService;
