import { useQuery } from '@tanstack/react-query';

import staffWorkspaceService from '@/modules/staff/common/services/staffWorkspaceService';

export function useStaffDashboard(config) {
  return useQuery({
    queryKey: ['staff-dashboard', config.firmRole],
    queryFn: () => staffWorkspaceService.getDashboard(config.apiBase),
  });
}

export function useStaffProfile(config) {
  return useQuery({
    queryKey: ['staff-profile', config.firmRole],
    queryFn: () => staffWorkspaceService.getProfile(config.apiBase),
  });
}

export function useStaffItems(config, endpoint) {
  return useQuery({
    queryKey: ['staff-items', config.firmRole, endpoint],
    queryFn: () => staffWorkspaceService.getItems(config.apiBase, endpoint),
  });
}
