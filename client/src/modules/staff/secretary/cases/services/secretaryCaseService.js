import axiosInstance from '@/core/api/axios';
import { sanitizeCaseCreatePayload } from '@/modules/admin/cases/utils/caseCreatePayload';

const secretaryCasesService = {
  // LIST
  async getMyCases(params = {}) {
    const { data } = await axiosInstance.get('/staff/secretary/cases/', {
      params,
    });

    return data;
  },

  // DETAIL
  async getMyCaseById(caseId) {
    const { data } = await axiosInstance.get(`/staff/secretary/cases/${caseId}/`);
    return data.case || data;
  },

  // CREATE (NEW SECRETARY ENDPOINT)
  async createCase(payload) {
    const createPayload = sanitizeCaseCreatePayload(payload);
    const { data } = await axiosInstance.post('/staff/secretary/cases/', createPayload);

    return data;
  },

  async getCaseCreateOptions() {
    const { data } = await axiosInstance.get('/staff/secretary/cases/create-options/');
    return data;
  },
};

export default secretaryCasesService;
