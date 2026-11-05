import { useQuery } from '@tanstack/react-query';
import adminCasesService from '@/modules/admin/cases/services/adminCasesService';

// Held in the shared query cache, so a staff change shows without a page refresh.
export default function useFirmSecretaries() {
  const query = useQuery({
    queryKey: ['firm-secretaries'],
    queryFn: async () => (await adminCasesService.getSecretaries())?.data?.secretaries || [],
  });
  return {
    secretaries: query.data || [],
    refetch: query.refetch,
  };
}
