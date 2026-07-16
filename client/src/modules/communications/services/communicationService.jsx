import axiosInstance from '@/core/api/axios';

const communicationService = {
  /* ======================================================
     ANNOUNCEMENTS
  ====================================================== */
  async getAdminAnnouncements() {
    const { data } = await axiosInstance.get(
      '/admin/communications/announcements/',
    );
    return data;
  },

  async createAnnouncement(payload) {
    const { data } = await axiosInstance.post(
      '/admin/communications/announcements/',
      payload,
    );
    return data;
  },

  async getAnnouncementInbox() {
    const { data } = await axiosInstance.get('/communications/announcements/');
    return data;
  },

  async markAnnouncementRead(announcementId) {
    const { data } = await axiosInstance.post(
      `/communications/announcements/${announcementId}/read/`,
    );
    return data;
  },

  /* ======================================================
     THREADS
  ====================================================== */
  async getThreads(params = {}) {
    const { data } = await axiosInstance.get('/communications/threads/', {
      params,
    });
    return data;
  },

  async getAdminThreads(params = {}) {
    const { data } = await axiosInstance.get('/admin/communications/threads/', {
      params,
    });
    return data;
  },

  async getSecretaryCaseThreads() {
    const { data } = await axiosInstance.get(
      '/staff/secretary/communications/case-threads/',
    );
    return data;
  },

  async startStaffThread(payload) {
    const { data } = await axiosInstance.post(
      '/admin/communications/staff-threads/',
      payload,
    );
    return data;
  },

  async getStaffContacts() {
    const { data } = await axiosInstance.get(
      '/admin/communications/staff-contacts/',
    );
    return data;
  },

  async getCaseThread(caseId) {
    const { data } = await axiosInstance.get(
      `/communications/cases/${caseId}/thread/`,
    );
    return data;
  },

  async getCaseLawyerThread(caseId) {
    const { data } = await axiosInstance.get(
      `/communications/cases/${caseId}/lawyer-thread/`,
    );
    return data;
  },

  /* ======================================================
     MESSAGES
  ====================================================== */
  async getThreadMessages(threadId) {
    const { data } = await axiosInstance.get(
      `/communications/threads/${threadId}/messages/`,
    );
    return data;
  },

  async sendThreadMessage(threadId, body) {
    const { data } = await axiosInstance.post(
      `/communications/threads/${threadId}/messages/`,
      {
        body,
      },
    );
    return data;
  },

  async getCaseMessages(caseId) {
    const { data } = await axiosInstance.get(
      `/communications/cases/${caseId}/messages/`,
    );
    return data;
  },

  async sendCaseMessage(caseId, body) {
    const { data } = await axiosInstance.post(
      `/communications/cases/${caseId}/messages/`,
      {
        body,
      },
    );
    return data;
  },

  async forwardMessageToLawyer(messageId) {
    const { data } = await axiosInstance.post(
      `/communications/messages/${messageId}/forward-to-lawyer/`,
    );
    return data;
  },

  async forwardMessageToClient(messageId) {
    const { data } = await axiosInstance.post(
      `/communications/messages/${messageId}/forward-to-client/`,
    );
    return data;
  },
};

export default communicationService;
