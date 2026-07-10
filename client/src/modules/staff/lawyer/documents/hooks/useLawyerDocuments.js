import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import lawyerDocumentsService from '@/modules/staff/lawyer/documents/services/lawyerDocumentsService';

export const useLawyerDocuments = (params = {}) => {
  const queryClient = useQueryClient();

  const documentsQuery = useQuery({
    queryKey: ['lawyer-documents', params],
    queryFn: () => lawyerDocumentsService.getDocuments(params),
  });

  const uploadDocument = useMutation({
    mutationFn: lawyerDocumentsService.uploadDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lawyer-documents'] });
    },
  });

  return {
    ...documentsQuery,
    documents: documentsQuery.data?.documents || [],
    uploadDocument: uploadDocument.mutateAsync,
    isUploadingDocument: uploadDocument.isPending,
  };
};

export default useLawyerDocuments;
