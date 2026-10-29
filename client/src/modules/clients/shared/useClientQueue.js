import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
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

export const OUTCOMES = { INSTRUCTING: 'Instructing the firm — open a file', ENQUIRY_ONLY: 'Enquiry only — no file' };

// The advocate directs at the end of the consultation whether the secretary opens a client file.
async function consultationOutcome() {
  const { isConfirmed, value } = await Swal.fire({
    title: 'Outcome of the consultation', input: 'radio', inputOptions: OUTCOMES,
    // Wide enough for each outcome on one line, never wider than a phone screen.
    width: 'min(38rem, calc(100vw - 32px))',
    text: 'If the visitor is instructing the firm, create the prospective client record next so the conflict check can start.',
    inputValidator: (choice) => !choice && 'Select the outcome of the consultation.',
    showCancelButton: true, confirmButtonText: 'Complete consultation', cancelButtonText: 'Back',
  });
  if (!isConfirmed) throw Object.assign(new Error('Cancelled'), { isActionCancelled: true });
  return value;
}

export function useQueueAction() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const workspace = useLocation().pathname.split('/')[1];
  return useMutation({
    mutationFn: async ({ id, action }) => (await axios.post(`/arrivals/${id}/`, action === 'COMPLETE' ? { action, outcome: await consultationOutcome() } : { action })).data,
    onSuccess: (data, { id, action }) => {
      client.invalidateQueries({ queryKey: ['client-arrivals'] });
      if (action === 'COMPLETE' && data?.outcome === 'INSTRUCTING') {
        navigate(`/${workspace}/clients/create?visit=${id}`);
        return;
      }
      const titles = { CALL: 'Reception notified — ready to usher in', USHER: 'Client ushered in', START: 'Consultation started', COMPLETE: 'Consultation completed', LEFT: 'Visitor marked as left' };
      Swal.fire({ icon: 'success', title: titles[action] || 'Queue updated', confirmButtonText: 'Done' });
    },
    onError: (error) => {
      if (error?.isActionCancelled) return;
      client.invalidateQueries({ queryKey: ['client-arrivals'] });
      Swal.fire({ icon: 'error', title: 'Queue was not changed', text: getApiErrorMessage(error, 'Refresh the queue and try again.'), confirmButtonText: 'Done' });
    },
  });
}
