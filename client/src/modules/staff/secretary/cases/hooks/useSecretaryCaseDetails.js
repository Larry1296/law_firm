import { useQuery } from '@tanstack/react-query';
import secretaryCasesService from '@/modules/staff/secretary/cases/services/secretaryCaseService';

// Held in the shared query cache, so the matter stays current after changes without a page refresh.
const useSecretaryCaseDetails = (caseId) => {
  const query = useQuery({
    queryKey: ['secretary-case', caseId],
    queryFn: () => secretaryCasesService.getMyCaseById(caseId),
    enabled: Boolean(caseId),
  });
  return {
    caseData: query.data ?? null,
    loading: query.isLoading,
    error: query.error,
  };
};

export default useSecretaryCaseDetails;
