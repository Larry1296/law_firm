import axiosInstance from '@/core/api/axios';

const documentsService = {
  async getDocuments(params = {}) {
    const { data } = await axiosInstance.get('/client/documents/', {
      params,
    });
    return data;
  },
};

export default documentsService;
