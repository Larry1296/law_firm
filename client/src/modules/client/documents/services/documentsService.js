import axiosInstance from '@/core/api/axios';

const documentsService = {
  async getDocuments(params = {}) {
    const { data } = await axiosInstance.get('/client/documents/', {
      params,
    });
    return data;
  },
  async uploadDocument(payload) {
    const { data } = await axiosInstance.post('/client/documents/', payload);
    return data;
  },
};

export default documentsService;
