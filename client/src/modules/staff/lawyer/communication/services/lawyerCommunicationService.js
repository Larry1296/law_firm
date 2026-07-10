import axiosInstance from '@/core/api/axios';
import communicationService from '@/modules/communications/services/communicationService';

const lawyerCommunicationService = {
  ...communicationService,

  async getNotifications(params = {}) {
    const { data } = await axiosInstance.get('/staff/lawyer/notifications/', {
      params,
    });
    return data;
  },
};

export default lawyerCommunicationService;
