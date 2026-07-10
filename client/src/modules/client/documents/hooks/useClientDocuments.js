import { useQuery } from '@tanstack/react-query';

import documentsService from '@/modules/client/documents/services/documentsService';

export const useClientDocuments = (params = {}) => {
  const query = useQuery({
    queryKey: ['client-documents', params],
    queryFn: () => documentsService.getDocuments(params),
  });

  return {
    ...query,
    documents: query.data?.documents || [],
  };
};

export default useClientDocuments;
