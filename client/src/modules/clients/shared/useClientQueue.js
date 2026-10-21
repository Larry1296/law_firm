import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@/core/api/axios';
import Swal from '@/core/utils/themedSwal';
import { getApiErrorMessage } from '@/core/utils/errorMessages';

export function useClientQueue() {
  return useQuery({
    queryKey: ['client-arrivals'],
    queryFn: async () => (await axios.get('/arrivals/')).data,
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
  });
}

export function useQueueAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }) => (await axios.post(`/arrivals/${id}/`, { action })).data,
    onSuccess: (_data, { action }) => {
      client.invalidateQueries({ queryKey: ['client-arrivals'] });
      const titles = { CALL: 'Reception notified — ready to usher in', USHER: 'Client ushered in', START: 'Consultation started', COMPLETE: 'Consultation completed', LEFT: 'Visitor marked as left' };
      Swal.fire({ icon: 'success', title: titles[action] || 'Queue updated', confirmButtonText: 'Done' });
    },
    onError: (error) => {
      client.invalidateQueries({ queryKey: ['client-arrivals'] });
      Swal.fire({ icon: 'error', title: 'Queue was not changed', text: getApiErrorMessage(error, 'Refresh the queue and try again.'), confirmButtonText: 'Done' });
    },
  });
}
