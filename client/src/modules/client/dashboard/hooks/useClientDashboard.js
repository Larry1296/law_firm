import { useQuery } from '@tanstack/react-query';

import clientDashboardService from '@/modules/client/dashboard/services/clientDashboardService';

export default function useClientDashboard() {
  return useQuery({
    queryKey: ['client-dashboard'],
    queryFn: clientDashboardService.getDashboard,
    refetchInterval: 10000,
  });
}
