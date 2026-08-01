import axiosInstance from '@/core/api/axios';

const lawyerDocumentsService = {
  async getDocuments(params = {}) {
    const { data } = await axiosInstance.get('/staff/lawyer/documents/', {
      params,
    });
    return data;
  },

  async createAction(payload) {
    const { data } = await axiosInstance.post('/staff/lawyer/documents/', payload);
    return data;
  },
  async reviewRequest({ requestId, ...payload }) {
    const { data } = await axiosInstance.patch(`/staff/lawyer/documents/requests/${requestId}/review/`, payload);
    return data;
  },
  async createMatterDocument(payload) {
    const body = new FormData();
    Object.entries({ ...payload, action: 'matter_document' }).forEach(([key, value]) => body.append(key, value));
    const { data } = await axiosInstance.post('/staff/lawyer/documents/', body);
    return data;
  },
};

export default lawyerDocumentsService;
