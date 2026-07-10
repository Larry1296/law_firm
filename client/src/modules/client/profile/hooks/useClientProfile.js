import { useQuery } from '@tanstack/react-query';

import clientProfileService from '@/modules/client/profile/services/profileService';

export const useClientProfile = () => {
  const query = useQuery({
    queryKey: ['client-profile'],
    queryFn: clientProfileService.getProfile,
  });

  return {
    ...query,
    client: query.data?.client,
  };
};

export default useClientProfile;
