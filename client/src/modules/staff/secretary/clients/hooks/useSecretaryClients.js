import { useQuery } from '@tanstack/react-query';
import secretaryClientsService from '@/modules/staff/secretary/clients/services/secretaryClientServices';

// Held in the shared query cache, so the list stays current after changes without a page refresh.
export function useSecretaryClients() {
  const query = useQuery({
    queryKey: ['secretary-clients'],
    queryFn: () => secretaryClientsService.getClients(),
  });
  return { clients: query.data?.clients || [], loading: query.isLoading, refetch: query.refetch };
}
