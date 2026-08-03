import axiosInstance from '@/core/api/axios';

const lawyerAIService = {
  async getPriorities(params = {}) {
    const { data } = await axiosInstance.get('/staff/lawyer/ai/matters/', { params });
    return data;
  },
  async getCaseAnalysis(caseId) {
    const { data } = await axiosInstance.get(`/staff/lawyer/ai/matters/${caseId}/`);
    return data;
  },
  async generateCaseAnalysis(caseId, documentIds) {
    const { data } = await axiosInstance.post(`/staff/lawyer/ai/matters/${caseId}/assessments/`, {
      document_ids: documentIds,
      confirm_external_processing: false,
    });
    return data;
  },
};

export default lawyerAIService;
