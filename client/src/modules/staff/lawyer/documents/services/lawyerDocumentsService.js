import axiosInstance from '@/core/api/axios';

const lawyerDocumentsService = {
  async getDocuments(params = {}) {
    const { data } = await axiosInstance.get('/staff/lawyer/documents/', {
      params,
    });
    return data;
  },

  async uploadDocument(payload) {
    const { data } = await axiosInstance.post(
      '/staff/lawyer/documents/upload/',
      payload,
    );
    return data;
  },
};

export default lawyerDocumentsService;
