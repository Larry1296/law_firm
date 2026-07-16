import axiosInstance from '@/core/api/axios';

const eventsService = {
  async getEvents(params = {}) {
    const { data } = await axiosInstance.get('/events/', { params });
    return data;
  },

  async updateAwareness(eventId, payload) {
    const { data } = await axiosInstance.patch(`/events/${eventId}/awareness/`, payload);
    return data;
  },
};

export default eventsService;
