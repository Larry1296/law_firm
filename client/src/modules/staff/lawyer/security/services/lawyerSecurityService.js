import axiosInstance from '@/core/api/axios';

const lawyerSecurityService = {
  async changePassword(payload) {
    const { data } = await axiosInstance.post(
      '/staff/lawyer/change-password/',
      payload,
    );
    return data;
  },
};

export default lawyerSecurityService;
