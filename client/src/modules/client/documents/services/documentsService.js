import axiosInstance from '@/core/api/axios';

const documentsService = {
  async getDocuments(params = {}) {
    const { data } = await axiosInstance.get('/client/documents/', {
      params,
    });
    return data;
  },

  async uploadRequestedDocument(requestId, file) {
    const form = new FormData();
    form.append('request_id', requestId);
    form.append('file', file);
    const { data } = await axiosInstance.post('/client/documents/', form);
    return data;
  },
};

export default documentsService;
