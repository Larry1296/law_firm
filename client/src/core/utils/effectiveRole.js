export const getEffectiveRole = (user, firmRole) => {
  const role = user?.role;

  if (role === 'STAFF') {
    return firmRole || user?.firm_role || role;
  }

  if (
    role === 'PROSPECT' &&
    user?.client?.lifecycle_status === 'OFFICIAL_CLIENT'
  ) {
    return 'OFFICIAL_CLIENT';
  }

  return role;
};

export const getClientDashboardPath = (user) => (
  user?.client?.lifecycle_status === 'OFFICIAL_CLIENT'
    ? '/client/dashboard'
    : '/portal/dashboard'
);
