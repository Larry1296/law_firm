import { useEffect, useState } from 'react';
import secretaryClientsService from '@/modules/staff/secretary/clients/services/secretaryClientServices';

export function useSecretaryClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await secretaryClientsService.getClients();

      setClients(res.clients || []);
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial data loading intentionally synchronizes this hook with the API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchClients();
  }, []);

  return { clients, loading, refetch: fetchClients };
}
