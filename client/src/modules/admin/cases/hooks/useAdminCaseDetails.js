// hooks/useAdminCaseDetails.js

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import adminCasesService from '@/modules/admin/cases/services/adminCasesService';

export default function useCaseDetails(caseId) {
  const queryClient = useQueryClient();

  const {
    data: caseData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-case', caseId],
    queryFn: async () => {
      const response = await adminCasesService.getCaseById(caseId);
      return response.data;
    },
    enabled: !!caseId,
  });

  const { data: lawyersResponse, isLoading: lawyersLoading } = useQuery({
    queryKey: ['firm-lawyers'],
    queryFn: async () => {
      const response = await adminCasesService.getLawyers();
      return response.data?.lawyers || [];
    },
  });

  const { data: secretariesResponse, isLoading: secretariesLoading } = useQuery(
    {
      queryKey: ['firm-secretaries'],
      queryFn: async () => {
        const response = await adminCasesService.getSecretaries();
        return response.data?.secretaries || [];
      },
    },
  );

  const reassignLawyerMutation = useMutation({
    mutationFn: ({ caseId, membershipId }) =>
      adminCasesService.reassignLawyer(caseId, membershipId),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin-case', caseId],
      });

      queryClient.invalidateQueries({
        queryKey: ['admin-cases'],
      });
    },
  });

  const reassignSecretaryMutation = useMutation({
    mutationFn: ({ caseId, membershipId }) =>
      adminCasesService.reassignSecretary(caseId, membershipId),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin-case', caseId],
      });

      queryClient.invalidateQueries({
        queryKey: ['admin-cases'],
      });
    },
  });

  return {
    caseData,

    lawyers: lawyersResponse || [],
    secretaries: secretariesResponse || [],

    isLoading,
    lawyersLoading,
    secretariesLoading,

    error,

    reassignLawyer: reassignLawyerMutation.mutateAsync,
    isReassigning: reassignLawyerMutation.isPending,
    reassignSecretary: reassignSecretaryMutation.mutateAsync,
    isReassigningSecretary: reassignSecretaryMutation.isPending,
  };
}
