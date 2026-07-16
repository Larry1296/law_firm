import axiosInstance from '@/core/api/axios';

const courtroomService = {
  async getTodayCourtroomEvents() {
    const { data } = await axiosInstance.get('/events/courtroom/today/');
    return data;
  },

  async createCaseEvent(caseId, payload) {
    const { data } = await axiosInstance.post('/events/', { ...payload, case_id: caseId });
    return data;
  },

  async updateCourtroomLink(eventId, payload) {
    const { data } = await axiosInstance.patch(
      `/events/${eventId}/courtroom-link/`,
      payload,
    );
    return data;
  },

  async getProviders() {
    const { data } = await axiosInstance.get('/courtroom/providers/');
    return data;
  },

  async createProvider(payload) {
    const { data } = await axiosInstance.post('/courtroom/providers/', payload);
    return data;
  },

  async updateProvider(providerId, payload) {
    const { data } = await axiosInstance.patch(`/courtroom/providers/${providerId}/`, payload);
    return data;
  },

  async getSessions(params = {}) {
    const { data } = await axiosInstance.get('/courtroom/sessions/', { params });
    return data;
  },

  async createSession(payload) {
    const { data } = await axiosInstance.post('/courtroom/sessions/', payload);
    return data;
  },

  async updateSession(sessionId, payload) {
    const { data } = await axiosInstance.patch(`/courtroom/sessions/${sessionId}/`, payload);
    return data;
  },

  async getAttendance(sessionId) {
    const { data } = await axiosInstance.get(`/courtroom/sessions/${sessionId}/attendance/`);
    return data;
  },

  async createAttendance(sessionId, payload) {
    const { data } = await axiosInstance.post(`/courtroom/sessions/${sessionId}/attendance/`, payload);
    return data;
  },

  async getRecordings(sessionId) {
    const { data } = await axiosInstance.get(`/courtroom/sessions/${sessionId}/recordings/`);
    return data;
  },

  async createRecording(sessionId, payload) {
    const { data } = await axiosInstance.post(`/courtroom/sessions/${sessionId}/recordings/`, payload);
    return data;
  },

  async getCauseListSyncs() {
    const { data } = await axiosInstance.get('/courtroom/cause-list-syncs/');
    return data;
  },

  async createCauseListSync(payload) {
    const { data } = await axiosInstance.post('/courtroom/cause-list-syncs/', payload);
    return data;
  },

  async getAnalytics() {
    const { data } = await axiosInstance.get('/courtroom/analytics/');
    return data;
  },
};

export default courtroomService;
