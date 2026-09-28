import axiosInstance from '@/core/api/axios';

const preparationService = {
  async getAdvocateSittings() {
    const { data } = await axiosInstance.get('/staff/lawyer/ai/court-preparation/');
    return data?.sittings || [];
  },
  async refreshAdvocateBrief(eventId) {
    const { data } = await axiosInstance.post(`/staff/lawyer/ai/court-preparation/${eventId}/refresh/`);
    return data;
  },
  async getClientSittings() {
    const { data } = await axiosInstance.get('/client/court-preparation/');
    return data?.sittings || [];
  },
};

export default preparationService;
