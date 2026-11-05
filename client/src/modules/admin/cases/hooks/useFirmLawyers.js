import { useQuery } from '@tanstack/react-query';
import adminCasesService from '@/modules/admin/cases/services/adminCasesService';

// Held in the shared query cache, so a staff change shows without a page refresh.
export default function useFirmLawyers() {
  const query = useQuery({
    queryKey: ['firm-lawyers'],
    queryFn: async () => (await adminCasesService.getLawyers())?.data?.lawyers || [],
  });
  return { lawyers: query.data || [], refetch: query.refetch };
}
