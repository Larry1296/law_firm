import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import lawyerProfileService from '@/modules/staff/lawyer/profile/services/lawyerProfileService';

export const useLawyerProfile = () => {
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['lawyer-profile'],
    queryFn: lawyerProfileService.getProfile,
  });

  const updateProfile = useMutation({
    mutationFn: lawyerProfileService.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lawyer-profile'] });
    },
  });

  return {
    ...profileQuery,
    lawyer: profileQuery.data?.lawyer,
    updateProfile: updateProfile.mutateAsync,
    isUpdatingProfile: updateProfile.isPending,
  };
};

export default useLawyerProfile;
