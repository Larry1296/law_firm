import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import lawyerAIService from '../services/lawyerAIService';

export function useLawyerAIPriorities(params) {
  return useQuery({ queryKey: ['lawyer-ai-priorities', params], queryFn: () => lawyerAIService.getPriorities(params) });
}

export function useLawyerCaseAnalysis(caseId) {
  return useQuery({ queryKey: ['lawyer-ai-case', caseId], queryFn: () => lawyerAIService.getCaseAnalysis(caseId), enabled: Boolean(caseId) });
}

export function useGenerateLawyerCaseAnalysis(caseId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentIds) => lawyerAIService.generateCaseAnalysis(caseId, documentIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lawyer-ai-case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['lawyer-ai-priorities'] });
    },
  });
}
