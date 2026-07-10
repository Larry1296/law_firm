import axiosInstance from '@/core/api/axios';

const clientProfileService = {
  async getProfile() {
    const { data } = await axiosInstance.get('/client/profile/');
    return data;
  },
};

export default clientProfileService;
