import axiosInstance from '@/core/api/axios';

const secretaryDocumentsService = {
  async getDocuments(params = {}) {
    const { data } = await axiosInstance.get('/staff/secretary/documents/', {
      params,
    });
    return data;
  },
};

export default secretaryDocumentsService;
