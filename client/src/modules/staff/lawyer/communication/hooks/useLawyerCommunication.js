import { useQuery } from '@tanstack/react-query';

import lawyerCommunicationService from '@/modules/staff/lawyer/communication/services/lawyerCommunicationService';

export const useLawyerNotifications = (params = {}) => {
  const query = useQuery({
    queryKey: ['lawyer-notifications', params],
    queryFn: () => lawyerCommunicationService.getNotifications(params),
  });

  return {
    ...query,
    notifications: query.data?.notifications || [],
  };
};

export default useLawyerNotifications;
