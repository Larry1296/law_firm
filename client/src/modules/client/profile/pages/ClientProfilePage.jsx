import useClientProfile from '@/modules/client/profile/hooks/useClientProfile';
import LoggedInUserProfile from '@/modules/profile/components/LoggedInUserProfile';

const hiddenClientProfileFields = new Set([
  'funding_sources',
  'tax_pin',
  'registration_authority',
  'operational_regions',
  'director_contact',
]);

const profileEntries = (profile = {}) =>
  Object.entries(profile)
    .filter(
      ([key]) =>
        !['id', 'created_at', 'updated_at'].includes(key) &&
        !hiddenClientProfileFields.has(key),
    )
    .map(([key, value]) => [
      key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
      value,
    ]);

const formatDate = (value) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function ClientProfilePage() {
  const { client, isLoading, isError } = useClientProfile();

  return (
    <LoggedInUserProfile
      title='Client Profile'
      subtitle='Your client account, firm access, and client record information.'
      profile={client || {}}
      firm={{
        id: client?.firm_id,
        name: client?.firm_name,
        email: client?.firm_email,
        phone_number: client?.firm_phone_number,
      }}
      roleLabel='Official Client'
      isLoading={isLoading}
      isError={isError}
      primaryFields={[
        ['Full Name', client?.full_name],
        ['Email', client?.email],
        ['Phone', client?.phone_number],
        ['Client Type', client?.client_type],
        ['Lifecycle Status', client?.lifecycle_status],
        ['Verified', client?.is_verified ? 'Yes' : 'No'],
      ]}
      profileSectionTitle='Client Record Details'
      profileFields={profileEntries(client?.type_profile)}
      workSectionTitle='Firm Details'
      workFields={[
        ['Firm Name', client?.firm_name],
        ['Firm Email', client?.firm_email],
        ['Firm Phone', client?.firm_phone_number],
      ]}
      permissionsTitle='Client Access'
      permissionsEmptyText='No client access permissions available.'
      permissions={['CASE_COMMUNICATION', 'CASE_DOCUMENTS', 'CLIENT_NOTIFICATIONS']}
      importantDatesTitle='Client Timeline'
      dateFields={[
        ['Brought On Board', formatDate(client?.created_at)],
        ['Last Profile Update', formatDate(client?.updated_at)],
      ]}
    />
  );
}
