import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import adminClientsService from '@/modules/admin/clients/services/adminClientsService';

/* =========================================================
   QUERY KEYS
========================================================= */

const CLIENTS_KEY = ['admin-clients'];

/* =========================================================
   HOOK
========================================================= */

export const useAdminClients = (params = {}) => {
  const queryClient = useQueryClient();

  /* =========================================================
     CLIENT LIST
  ========================================================= */

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: [...CLIENTS_KEY, params],
    queryFn: () => adminClientsService.getClients(params),
  });

  /* =========================================================
     CREATE CLIENT
  ========================================================= */

  const createClientMutation = useMutation({
    mutationFn: ({ payload, clientType }) =>
      adminClientsService.createClient(payload, clientType),
  });

  /* =========================================================
     UPDATE CLIENT
  ========================================================= */

  const updateClientMutation = useMutation({
    mutationFn: ({ clientId, payload }) =>
      adminClientsService.updateClient(clientId, payload),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: CLIENTS_KEY,
      });
    },
  });

  /* =========================================================
     DELETE CLIENT
  ========================================================= */

  const deleteClientMutation = useMutation({
    mutationFn: (clientId) => adminClientsService.deleteClient(clientId),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: CLIENTS_KEY,
      });
    },
  });

  const archiveClientMutation = useMutation({
    mutationFn: (clientId) => adminClientsService.archiveClient(clientId),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: CLIENTS_KEY,
      });
    },
  });

  const restoreClientMutation = useMutation({
    mutationFn: (clientId) => adminClientsService.restoreClient(clientId),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: CLIENTS_KEY,
      });
    },
  });

  return {
    /* Dashboard Analytics */
    analytics: data?.analytics ?? {
      total_clients: 0,
      active_clients: 0,
      inactive_clients: 0,
      prospects_with_access: 0,
      assisted_clients: 0,
      prospects: 0,
      official_clients: 0,
      archived_clients: 0,
      deleted_clients: 0,
      clients_by_type: {},
      recent_clients: 0,
      growth_metrics: {
        new_today: 0,
        new_this_week: 0,
        new_this_month: 0,
      },
    },

    /* Client List */
    clients: data?.clients ?? [],

    /* Query State */
    isLoading,
    isFetching,
    isError,
    error,
    refetch,

    /* Create (unified) */
    createClient: (payload, clientType) =>
      createClientMutation.mutateAsync({ payload, clientType }),

    isCreatingClient: createClientMutation.isPending,

    /* Update */
    updateClient: updateClientMutation.mutateAsync,
    isUpdatingClient: updateClientMutation.isPending,

    /* Delete */
    deleteClient: deleteClientMutation.mutateAsync,
    isDeletingClient: deleteClientMutation.isPending,

    /* Archive / Restore */
    archiveClient: archiveClientMutation.mutateAsync,
    isArchivingClient: archiveClientMutation.isPending,
    restoreClient: restoreClientMutation.mutateAsync,
    isRestoringClient: restoreClientMutation.isPending,
  };
};

export default useAdminClients;
