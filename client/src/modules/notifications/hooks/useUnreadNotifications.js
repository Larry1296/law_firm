import { useQuery } from '@tanstack/react-query';

import axiosInstance from '@/core/api/axios';

export default function useUnreadNotifications() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const response = await axiosInstance.get('/notifications/', {
        params: { unread: true },
      });
      return response.data;
    },
    refetchInterval: 10000,
  });
}
