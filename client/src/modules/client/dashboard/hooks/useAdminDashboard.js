import { useQuery } from '@tanstack/react-query';

import clientDashboardService from '@/modules/client/dashboard/services/adminDashboardService';

export const useClientDashboard = () =>
  useQuery({
    queryKey: ['client-dashboard'],
    queryFn: clientDashboardService.getDashboard,
  });

export default useClientDashboard;
