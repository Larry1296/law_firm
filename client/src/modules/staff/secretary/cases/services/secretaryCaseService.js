import axiosInstance from '@/core/api/axios';

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
    const { data } = await axiosInstance.post('/staff/secretary/cases/', payload);

    return data;
  },
};

export default secretaryCasesService;
