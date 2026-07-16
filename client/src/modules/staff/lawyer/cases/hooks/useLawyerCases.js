import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import lawyerCasesService from '@/modules/staff/lawyer/cases/services/lawyerCasesService';

/* LIST */
export const useMyCases = (params = {}) => {
  return useQuery({
    queryKey: ['lawyer-cases', params],
    queryFn: () => lawyerCasesService.getMyCases(params),
  });
};

/* DETAIL */
export const useMyCase = (caseId) => {
  return useQuery({
    queryKey: ['lawyer-case', caseId],
    queryFn: () => lawyerCasesService.getMyCaseById(caseId),
    enabled: !!caseId,
  });
};

export const useUpdateCaseStatus = (caseId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => lawyerCasesService.updateCaseStatus(caseId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lawyer-case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['lawyer-cases'] });
    },
  });
};
