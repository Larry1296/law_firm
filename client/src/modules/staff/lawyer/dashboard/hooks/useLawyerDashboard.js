import { useQuery } from '@tanstack/react-query';

import lawyerDashboardService from '@/modules/staff/lawyer/dashboard/services/lawyerDashboardService';

export const useLawyerDashboard = () =>
  useQuery({
    queryKey: ['lawyer-dashboard'],
    queryFn: lawyerDashboardService.getDashboard,
  });

export default useLawyerDashboard;
