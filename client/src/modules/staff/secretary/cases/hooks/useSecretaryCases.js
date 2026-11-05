import { useQuery } from '@tanstack/react-query';
import secretaryCasesService from '@/modules/staff/secretary/cases/services/secretaryCaseService';

// Held in the shared query cache, so the list stays current after changes without a page refresh.
const useSecretaryCases = (params = {}) => {
  const query = useQuery({
    queryKey: ['secretary-cases', params],
    queryFn: () => secretaryCasesService.getMyCases(params),
  });
  return {
    cases: query.data?.cases || [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};

export default useSecretaryCases;
