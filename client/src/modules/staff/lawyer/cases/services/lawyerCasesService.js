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
