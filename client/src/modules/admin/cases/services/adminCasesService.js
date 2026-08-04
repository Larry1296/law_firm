import axiosInstance from '@/core/api/axios';
import { sanitizeCaseCreatePayload } from '@/modules/admin/cases/utils/caseCreatePayload';

const adminCasesService = {
  async getCases(params = {}) {
    const { data } = await axiosInstance.get('/cases/', { params });
    return data;
  },

  async getCaseById(id) {
    const { data } = await axiosInstance.get(`/cases/${id}/`);
    return data;
  },

  async createCase(payload) {
    const createPayload = sanitizeCaseCreatePayload(payload);
    const { data } = await axiosInstance.post('/cases/', createPayload);
    return data;
  },

  async updateCase(caseId, payload) {
    const { data } = await axiosInstance.patch(`/cases/${caseId}/`, payload);
    return data;
  },

  async transitionCase(caseId, payload) {
    const { data } = await axiosInstance.post(`/cases/${caseId}/transitions/`, payload);
    return data;
  },

  async conflictCheckAction(caseId, payload) {
    const { data } = await axiosInstance.post(`/cases/${caseId}/conflict-check/actions/`, payload);
    return data;
  },

  async verifyJurisdiction(caseId, payload) {
    const { data } = await axiosInstance.post(`/cases/${caseId}/jurisdiction/actions/`, payload);
    return data;
  },

  async createCaseEvent(caseId, payload) {
    const { data } = await axiosInstance.post(`/cases/${caseId}/events/`, payload);
    return data;
  },

  async createCaseTask(caseId, payload) {
    const { data } = await axiosInstance.post(`/cases/${caseId}/tasks/`, payload);
    return data;
  },

  async getDeadlines(caseId) { return (await axiosInstance.get(`/cases/${caseId}/deadlines/`)).data; },
  async createDeadline(caseId, payload) { return (await axiosInstance.post(`/cases/${caseId}/deadlines/`, payload)).data; },
  async changeDeadline(deadlineId, payload) { return (await axiosInstance.post(`/cases/deadlines/${deadlineId}/change/`, payload)).data; },
  async getLegalAssessments(caseId) { return (await axiosInstance.get(`/cases/${caseId}/legal-assessments/`)).data; },
  async setWorkstream(caseId, payload) { return (await axiosInstance.post(`/cases/${caseId}/workstream/`, payload)).data; },
  async getClosures(caseId) { return (await axiosInstance.get(`/cases/${caseId}/closure/`)).data; },
  async requestClosure(caseId, payload) { return (await axiosInstance.post(`/cases/${caseId}/closure/`, payload)).data; },
  async closureAction(caseId, closureId, action, payload = {}) { return (await axiosInstance.post(`/cases/${caseId}/closure/${closureId}/${action}/`, payload)).data; },
  async getArchive(caseId) { return (await axiosInstance.get(`/cases/${caseId}/archive/`)).data; },
  async createArchive(caseId, payload) { return (await axiosInstance.post(`/cases/${caseId}/archive/`, payload)).data; },

  async reassignLawyer(caseId, membershipId) {
    const { data } = await axiosInstance.patch(
      `/cases/${caseId}/reassign-lawyer/`,
      {
        membership_id: membershipId,
      },
    );

    return data;
  },

  async getLawyers() {
    const { data } = await axiosInstance.get('/admin/staff/lawyers/');
    const lawyers = (data.lawyers || []).map((lawyer) => ({
      ...lawyer,
      membership_id: lawyer.membership_id || lawyer.id,
    }));
    return {
      ...data,
      data: {
        lawyers,
      },
    };
  },

  async getSecretaries() {
    const { data } = await axiosInstance.get('/admin/staff/secretaries/');
    const secretaries = (data.secretaries || []).map((secretary) => ({
      ...secretary,
      membership_id: secretary.membership_id || secretary.id,
    }));
    return {
      ...data,
      data: {
        secretaries,
      },
    };
  },

  async reassignSecretary(caseId, membershipId) {
    const { data } = await axiosInstance.patch(
      `/cases/${caseId}/reassign-secretary/`,
      {
        membership_id: membershipId,
      },
    );

    return data;
  },

  async getCaseSummary() {
    const { data } = await axiosInstance.get('/cases/');
    return data.summary;
  },

  async getLawyerPerformance() {
    const { data } = await axiosInstance.get('/cases/');
    return data.lawyer_performance;
  },

  async getTopClients() {
    const { data } = await axiosInstance.get('/cases/');
    return data.top_clients;
  },

  async getCasesList() {
    const { data } = await axiosInstance.get('/cases/');
    return data.cases;
  },
};

export default adminCasesService;
