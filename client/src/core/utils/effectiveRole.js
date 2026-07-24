const OFFICIAL_STATUSES = ['OFFICIAL', 'OFFICIAL_CLIENT'];

export const getEffectiveRole = (user, firmRole) => {
  const role = user?.role;

  if (role === 'STAFF') {
    return firmRole || user?.firm_role || role;
  }

  if (
    role === 'PROSPECT' &&
    OFFICIAL_STATUSES.includes(user?.client?.lifecycle_status)
  ) {
    return 'OFFICIAL_CLIENT';
  }

  return role;
};

export const getClientDashboardPath = (user) => (
  OFFICIAL_STATUSES.includes(user?.client?.lifecycle_status)
    ? '/client/dashboard'
    : '/portal/dashboard'
);
