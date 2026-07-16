import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import eventsService from '@/modules/events/services/eventsService';

export const eventKeys = {
  list: (params = {}) => ['events', params],
};

export const useEvents = (params = {}) =>
  useQuery({
    queryKey: eventKeys.list(params),
    queryFn: () => eventsService.getEvents(params),
  });

export const useUpdateEventAwareness = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, payload }) => eventsService.updateAwareness(eventId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });
};
