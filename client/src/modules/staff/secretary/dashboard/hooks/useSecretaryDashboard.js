import { useQuery } from '@tanstack/react-query';

import secretaryDashboardService from '@/modules/staff/secretary/dashboard/services/secretaryDashboardService';

export default function useSecretaryDashboard() {
  return useQuery({
    queryKey: ['secretary-dashboard'],
    queryFn: secretaryDashboardService.getDashboard,
  });
}
