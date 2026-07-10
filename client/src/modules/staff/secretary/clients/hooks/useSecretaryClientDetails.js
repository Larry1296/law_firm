import { useQuery } from '@tanstack/react-query';

import secretaryClientsService from '@/modules/staff/secretary/clients/services/secretaryClientServices';

export const useSecretaryClientDetails = (clientId) => {
  return useQuery({
    queryKey: ['secretary-client-details', clientId],

    queryFn: () => secretaryClientsService.getClientById(clientId),

    enabled: !!clientId,
  });
};
