import LoggedInUserProfile from '@/modules/profile/components/LoggedInUserProfile';
import { useStaffProfile } from '@/modules/staff/common/hooks/useStaffWorkspace';

export default function StaffProfilePage({ config }) {
  const { data, isLoading, isError } = useStaffProfile(config);
  const profile = data?.profile || {};

  return (
    <LoggedInUserProfile
      title={`${config.label} Profile`}
      subtitle='Your staff profile, role details, and assigned permissions.'
      profile={profile}
      firm={{ name: profile.law_firm_name }}
      roleLabel={config.label}
      isLoading={isLoading}
      isError={isError}
      primaryFields={[
        ['Full Name', profile.full_name],
        ['Email', profile.email],
        ['Phone', profile.phone_number],
        ['Staff Number', profile.staff_number],
        ['Status', profile.is_active ? 'Active' : 'Inactive'],
      ]}
      workFields={[
        ['Department', profile.department],
        ['Job Title', profile.job_title],
        ['Work Email', profile.work_email],
        ['Work Phone', profile.work_phone],
        ['Office Location', profile.office_location],
        ['Employment Status', profile.employment_status],
      ]}
      permissions={profile.permissions || []}
    />
  );
}
