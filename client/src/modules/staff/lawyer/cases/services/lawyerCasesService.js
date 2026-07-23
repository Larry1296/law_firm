import axiosInstance from '@/core/api/axios';
import { sanitizeCaseCreatePayload } from '@/modules/cases/shared/create/caseCreatePayload';

const lawyerCasesService = {
  async getMyCases(params = {}) {
    const { data } = await axiosInstance.get('/staff/lawyer/cases/', {
      params,
    });
    return data.cases || data.results || [];
  },

  async getMyCaseById(caseId) {
    const { data } = await axiosInstance.get(`/staff/lawyer/cases/${caseId}/`);
    return data.case || data;
  },

  async createCase(payload) {
    const createPayload = sanitizeCaseCreatePayload(payload);
    const { data } = await axiosInstance.post('/staff/lawyer/cases/', createPayload);
    return data;
  },

  async getCaseCreateOptions() {
    const { data } = await axiosInstance.get('/staff/lawyer/cases/create-options/');
    return data;
  },

  async getConflictCheck(clientId, checkId) {
    const { data } = await axiosInstance.get(
      `/staff/lawyer/clients/${clientId}/conflict-checks/${checkId}/`,
    );
    return data.conflict_check;
  },

  async getConflictChecks(clientId) {
    const { data } = await axiosInstance.get(
      `/staff/lawyer/clients/${clientId}/conflict-checks/`,
    );
    return data.conflict_checks || [];
  },

  async createConflictCheck(clientId, payload) {
    const { data } = await axiosInstance.post(
      `/staff/lawyer/clients/${clientId}/conflict-checks/`,
      payload,
    );
    return data.conflict_check;
  },

  async updateConflictCheck(clientId, checkId, payload) {
    const { data } = await axiosInstance.patch(
      `/staff/lawyer/clients/${clientId}/conflict-checks/${checkId}/`,
      payload,
    );
    return data.conflict_check;
  },

  async runConflictAction(clientId, checkId, action, payload = {}) {
    const { data } = await axiosInstance.post(
      `/staff/lawyer/clients/${clientId}/conflict-checks/${checkId}/${action}/`,
      payload,
    );
    return data.conflict_check;
  },

  async recordFirmAcceptance(clientId, checkId, payload = {}) {
    const { data } = await axiosInstance.post(
      `/staff/lawyer/clients/${clientId}/conflict-checks/${checkId}/acceptance/`,
      payload,
    );
    return data.conflict_check;
  },

  async updateLifecycleTransition(caseId, payload) {
    const { data } = await axiosInstance.post(
      `/cases/${caseId}/transitions/`,  // <-- correct endpoint
      payload,
    );
    return data.data || data;
  },

  async updateCaseStatus(caseId, payload) {
    const { data } = await axiosInstance.post(
      `/cases/${caseId}/status/`,
      payload,
    );
    return data.data || data;
  },
};

export default lawyerCasesService;
