import { useQuery } from '@tanstack/react-query';

import authService from '@/modules/auth/service/authService';
import LoggedInUserProfile from '@/modules/profile/components/LoggedInUserProfile';

export default function AdminProfilePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-profile'],
    queryFn: authService.me,
  });

  const user = data?.user || {};
  const firm = data?.firm || {};

  return (
    <LoggedInUserProfile
      title='Admin Profile'
      subtitle='Your firm owner account, access role, and current firm context.'
      account={user}
      firm={firm}
      roleLabel={user.is_firm_owner ? 'Firm Owner / Admin' : 'Admin'}
      statusLabel='Active'
      isLoading={isLoading}
      isError={isError}
      primaryFields={[
        ['Full Name', user.full_name],
        ['Email', user.email],
        ['System Role', user.role],
        ['Firm Role', data?.firm_role],
        ['Firm Owner', user.is_firm_owner ? 'Yes' : 'No'],
        ['Must Change Password', user.must_change_password ? 'Yes' : 'No'],
      ]}
      workFields={[
        ['Firm Name', firm.name],
        ['Firm ID', firm.id],
      ]}
      workSectionTitle='Firm Details'
      showImportantDates={false}
      permissions={[
        user.is_firm_owner ? 'FIRM_OWNER' : 'ADMIN_ACCESS',
        'MANAGE_FIRM_WORKSPACE',
      ]}
    />
  );
}
