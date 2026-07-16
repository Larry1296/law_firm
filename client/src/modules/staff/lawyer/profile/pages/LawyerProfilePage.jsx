import { useQuery } from '@tanstack/react-query';

import lawyerProfileService from '@/modules/staff/lawyer/profile/services/lawyerProfileService';
import LoggedInUserProfile from '@/modules/profile/components/LoggedInUserProfile';

export default function LawyerProfilePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['lawyer-profile'],
    queryFn: lawyerProfileService.getProfile,
  });

  const lawyer = data?.lawyer || {};

  return (
    <LoggedInUserProfile
      title='Lawyer Profile'
      subtitle='Your advocate profile, work contacts, and legal practice flags.'
      profile={lawyer}
      firm={{ name: lawyer.law_firm_name }}
      roleLabel='Lawyer'
      isLoading={isLoading}
      isError={isError}
      primaryFields={[
        ['Full Name', lawyer.full_name],
        ['Email', lawyer.email],
        ['Phone', lawyer.phone_number],
        ['National ID', lawyer.national_id_number],
        ['Staff Number', lawyer.staff_number],
        ['Status', lawyer.is_active ? 'Active' : 'Inactive'],
      ]}
      workFields={[
        ['Department', lawyer.department],
        ['Job Title', lawyer.job_title],
        ['Work Email', lawyer.work_email],
        ['Work Phone', lawyer.work_phone],
        ['Office Location', lawyer.office_location],
        ['Employment Status', lawyer.employment_status],
      ]}
      profileFields={[
        ['Professional Summary', lawyer.professional_summary],
        ['Notary', lawyer.is_notary ? 'Yes' : 'No'],
        ['Commissioner for Oaths', lawyer.can_commission_oaths ? 'Yes' : 'No'],
        ['Court Approved', lawyer.is_court_approved ? 'Yes' : 'No'],
      ]}
      permissions={[
        lawyer.is_notary ? 'NOTARY' : null,
        lawyer.can_commission_oaths ? 'COMMISSION_OATHS' : null,
        lawyer.is_court_approved ? 'COURT_APPROVED' : null,
      ].filter(Boolean)}
    />
  );
}
