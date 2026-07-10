import { useQuery } from '@tanstack/react-query';
import clientCasesService from '@/modules/client/cases/services/clientCasesService';

export const useClientCases = (params = {}) => {
  return useQuery({
    queryKey: ['client-cases', params],

    queryFn: async () => {
      const res = await clientCasesService.getMyCases(params);

      const cases = res?.data || [];

      return cases;
    },

    onError: (error) => {
      console.error('❌ useClientCases ERROR:', error);
    },

    onSuccess: (data) => {
      console.log('🎯 QUERY SUCCESS - FINAL DATA:', data);
    },
  });
};
