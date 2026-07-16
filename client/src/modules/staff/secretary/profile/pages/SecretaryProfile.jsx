import secretaryProfileService from '@/modules/staff/secretary/profile/services/secretaryProfileService';
import LoggedInUserProfile from '@/modules/profile/components/LoggedInUserProfile';
import { useQuery } from '@tanstack/react-query';

export default function SecretaryProfile() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['secretary-profile'],
    queryFn: secretaryProfileService.getProfile,
  });

  const secretary = data || {};

  return (
    <LoggedInUserProfile
      title='Secretary Profile'
      subtitle='Your secretary profile, work contacts, assignments, and permissions.'
      profile={secretary}
      firm={{ name: secretary.law_firm_name }}
      roleLabel='Secretary'
      isLoading={isLoading}
      isError={isError}
      primaryFields={[
        ['Full Name', secretary.full_name],
        ['Email', secretary.email],
        ['Phone', secretary.phone_number],
        ['Staff Number', secretary.staff_number],
        ['Employee Number', secretary.employee_number],
        ['Status', secretary.is_active ? 'Active' : 'Inactive'],
      ]}
      workFields={[
        ['Department', secretary.department],
        ['Job Title', secretary.job_title],
        ['Work Email', secretary.work_email],
        ['Work Phone', secretary.work_phone],
        ['Office Location', secretary.office_location],
        ['Employment Type', secretary.employment_type],
        ['Employment Status', secretary.employment_status],
      ]}
      profileFields={[
        ['Assigned Lawyers', (secretary.assigned_lawyers || []).map((lawyer) => lawyer.full_name).join(', ')],
        ['Prepare Documents', secretary.can_prepare_documents ? 'Yes' : 'No'],
        ['Schedule Appointments', secretary.can_schedule_appointments ? 'Yes' : 'No'],
        ['Manage Client Intake', secretary.can_manage_client_intake ? 'Yes' : 'No'],
        ['Receive Documents', secretary.can_receive_documents ? 'Yes' : 'No'],
      ]}
      permissions={secretary.permissions || []}
    />
  );
}
