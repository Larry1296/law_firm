import axiosInstance from '@/core/api/axios';

const secretaryDocumentsService = {
  async getDocuments(params = {}) {
    const { data } = await axiosInstance.get('/staff/secretary/documents/', {
      params,
    });
    return data;
  },
  async uploadDocument(payload) {
    const { data } = await axiosInstance.post('/staff/secretary/documents/', payload);
    return data;
  },
};

export default secretaryDocumentsService;
