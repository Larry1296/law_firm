import axiosInstance from '@/core/api/axios';

const lawyerCasesService = {
  async getMyCases(params = {}) {
    const { data } = await axiosInstance.get('/staff/lawyer/cases/', {
      params,
    });

    return data;
  },

  async getMyCaseById(caseId) {
    const { data } = await axiosInstance.get(`/staff/lawyer/cases/${caseId}/`);

    return data.case || data;
  },
};

export default lawyerCasesService;
