import { useQuery } from '@tanstack/react-query';

import lawyerDocumentsService from '@/modules/staff/lawyer/documents/services/lawyerDocumentsService';

export const useLawyerDocuments = (params = {}) => {
  const documentsQuery = useQuery({
    queryKey: ['lawyer-documents', params],
    queryFn: () => lawyerDocumentsService.getDocuments(params),
  });

  return {
    ...documentsQuery,
    documents: documentsQuery.data?.documents || [],
  };
};

export default useLawyerDocuments;
