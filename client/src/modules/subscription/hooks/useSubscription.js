import { useQuery } from '@tanstack/react-query';

import subscriptionService from '@/modules/subscription/services/subscriptionService';

export const SUBSCRIPTION_QUERY_KEY = ['subscription', 'summary'];

export default function useSubscription({ enabled = true } = {}) {
  const query = useQuery({
    queryKey: SUBSCRIPTION_QUERY_KEY,
    queryFn: subscriptionService.getSummary,
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const features = query.data?.features || [];

  return {
    ...query,
    subscription: query.data,
    hasFeature: (code) => features.includes(code),
    writable: query.data ? query.data.writable : true,
  };
}
