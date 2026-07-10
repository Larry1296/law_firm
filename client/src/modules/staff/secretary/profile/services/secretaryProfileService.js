import axiosInstance from '@/core/api/axios';

const secretaryProfileService = {
  async getProfile() {
    const { data } = await axiosInstance.get('/staff/secretary/profile/');
    return data.secretary;
  },
};

export default secretaryProfileService;
