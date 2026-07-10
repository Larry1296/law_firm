import { useQuery } from '@tanstack/react-query';
import clientCasesService from '@/modules/client/cases/services/clientCasesService';

export const useClientCaseDetails = (caseId) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['client-case', caseId],

    enabled: !!caseId,

    queryFn: async () => {
      return await clientCasesService.getMyCaseById(caseId);
    },
  });

  return {
    caseData: data,
    loading: isLoading,
    error,
    refetch,
  };
};
