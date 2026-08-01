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
  async createRequest(payload) {
    const { data } = await axiosInstance.post('/staff/secretary/documents/', { ...payload, action: 'request' });
    return data;
  },
  async verifyClientUpload(requestId, payload) {
    const { data } = await axiosInstance.patch(`/staff/secretary/documents/requests/${requestId}/verify/`, payload);
    return data;
  },
  async dispatchRequest(requestId, payload) {
    const { data } = await axiosInstance.post(`/staff/secretary/documents/requests/${requestId}/dispatch/`, payload);
    return data;
  },
};

export default secretaryDocumentsService;
