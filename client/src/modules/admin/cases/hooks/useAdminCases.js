import { useQuery } from '@tanstack/react-query';
import adminCasesService from '@/modules/admin/cases/services/adminCasesService';

export default function useAdminCases(params = {}) {
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-cases', params],
    queryFn: async () => {
      const result = await adminCasesService.getCases(params);
      return result?.data ?? result;
    },
  });

  return {
    data,
    loading: isLoading,
    isLoading,
    isFetching,
    error,
    refetch,

    summary: data?.summary,
    cases: data?.cases || [],
    lawyerPerformance: data?.lawyer_performance || [],
    topClients: data?.top_clients || [],
    courtDistribution: data?.court_distribution || [],
    caseTypeBreakdown: data?.case_type_breakdown || [],
    statusBreakdown: data?.status_breakdown || [],
    priorityBreakdown: data?.priority_breakdown || [],
    monthlyCaseIntake: data?.monthly_case_intake || [],
  };
}
