import axiosInstance from '@/core/api/axios';

const lawyerProfileService = {
  async getProfile() {
    const { data } = await axiosInstance.get('/staff/lawyer/profile/');
    return data;
  },

  async updateProfile(payload) {
    const { data } = await axiosInstance.patch('/staff/lawyer/profile/', payload);
    return data;
  },
};

export default lawyerProfileService;
