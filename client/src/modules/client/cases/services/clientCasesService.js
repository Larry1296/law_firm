import axiosInstance from '@/core/api/axios';

const clientCasesService = {
  async getMyCases(params = {}) {
    const { data } = await axiosInstance.get('/client/cases/', {
      params,
    });

    return data;
  },

  async getMyCaseById(caseId) {
    const { data } = await axiosInstance.get(`/client/cases/${caseId}/`);

    return data.case || data;
  },
};

export default clientCasesService;
