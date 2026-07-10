import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import adminStaffService from '@/modules/admin/staff/services/adminStaffService';

/* =========================================================
   QUERY KEY
========================================================= */
const STAFF_KEY = ['admin-staff'];

/* =========================================================
   FETCH STAFF
========================================================= */
const fetchStaff = async () => {
  const response = await adminStaffService.getStaff();
  return response.data;
};

/* =========================================================
   HOOK
========================================================= */
export const useAdminStaff = () => {
  const queryClient = useQueryClient();

  /* ======================================================
     LIST STAFF
  ====================================================== */
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: STAFF_KEY,
    queryFn: fetchStaff,
  });

  /* ======================================================
     CREATE STAFF
  ====================================================== */
  const createStaff = useMutation({
    mutationFn: adminStaffService.createStaff,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: STAFF_KEY,
      });
    },
  });

  /* ======================================================
     DELETE STAFF
  ====================================================== */
  const deleteStaff = useMutation({
    mutationFn: adminStaffService.deleteStaff,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: STAFF_KEY,
      });
    },
  });

  /* ======================================================
     TOGGLE STATUS
  ====================================================== */
  const toggleStaffStatus = useMutation({
    mutationFn: adminStaffService.toggleStaffStatus,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: STAFF_KEY,
      });
    },
  });

  /* ======================================================
     UPDATE PERMISSIONS
  ====================================================== */
  const updatePermissions = useMutation({
    mutationFn: ({ userId, payload }) =>
      adminStaffService.updateStaffPermissions(userId, payload),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: STAFF_KEY,
      });
    },
  });

  return {
    summary: data?.summary || {
      total_staff: 0,
      active_staff: 0,
      inactive_staff: 0,
      lawyers: 0,
      secretaries: 0,
      accountants: 0,
      hr: 0,
      it: 0,
      total_active_cases: 0,
      total_closed_cases: 0,
    },

    staff: data?.staff || [],

    isLoading,
    isFetching,
    isError,
    error,
    refetch,

    createStaff: createStaff.mutateAsync,
    isCreatingStaff: createStaff.isPending,

    deleteStaff: deleteStaff.mutateAsync,
    isDeletingStaff: deleteStaff.isPending,

    toggleStaffStatus: toggleStaffStatus.mutateAsync,
    isTogglingStaff: toggleStaffStatus.isPending,

    updatePermissions: updatePermissions.mutateAsync,
    isUpdatingPermissions: updatePermissions.isPending,
  };
};

export default useAdminStaff;
