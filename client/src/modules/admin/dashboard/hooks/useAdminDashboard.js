import { useQuery } from '@tanstack/react-query';

import adminDashboardService from '@/modules/admin/dashboard/services/adminDashboardService';

export default function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: adminDashboardService.getDashboard,
  });
}
