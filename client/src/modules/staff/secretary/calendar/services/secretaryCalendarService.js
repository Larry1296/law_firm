import axiosInstance from '@/core/api/axios';

const secretaryCalendarService = {
  async getEvents(params = {}) {
    const { data } = await axiosInstance.get('/staff/secretary/calendar/', {
      params,
    });
    return data;
  },
};

export default secretaryCalendarService;
