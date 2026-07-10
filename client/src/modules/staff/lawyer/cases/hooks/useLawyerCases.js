import { useQuery } from '@tanstack/react-query';
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
