import axiosInstance from '@/core/api/axios';

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

  async updateCaseStatus(caseId, payload) {
    const { data } = await axiosInstance.post(
      `/cases/${caseId}/status/`,
      payload,
    );

    return data.data || data;
  },
};

export default lawyerCasesService;
