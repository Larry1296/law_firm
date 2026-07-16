import { useQuery } from '@tanstack/react-query';

import authService from '@/modules/auth/service/authService';
import clientProfileService from '@/modules/client/profile/services/profileService';
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

async function getPortalProfile() {
  const [sessionResult, clientResult] = await Promise.allSettled([
    authService.me(),
    clientProfileService.getProfile(),
  ]);

  return {
    session: sessionResult.status === 'fulfilled' ? sessionResult.value : null,
    client: clientResult.status === 'fulfilled' ? clientResult.value?.client : null,
  };
}

export default function PortalProfile() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['portal-profile'],
    queryFn: getPortalProfile,
  });

  const user = data?.session?.user || {};
  const firm = data?.session?.firm || {};
  const client = data?.client || {};
  const profile = {
    ...user,
    ...client,
    full_name: client.full_name || user.full_name,
    email: client.email || user.email,
  };

  return (
    <LoggedInUserProfile
      title='Prospect Profile'
      subtitle='Your prospect account, firm relationship, and onboarding details.'
      account={user}
      profile={profile}
      firm={firm}
      roleLabel='Prospect'
      isLoading={isLoading}
      isError={isError}
      primaryFields={[
        ['Full Name', profile.full_name],
        ['Email', profile.email],
        ['Phone', profile.phone_number],
        ['Client Type', client.client_type],
        ['Lifecycle Status', client.lifecycle_status || user.role],
        ['Verified', client.is_verified ? 'Yes' : 'No'],
      ]}
      profileSectionTitle='Prospect Record Details'
      profileFields={profileEntries(client.type_profile)}
      workSectionTitle='Firm Details'
      workFields={[
        ['Firm Name', firm.name || client.firm_name],
        ['Firm Email', client.firm_email],
        ['Firm Phone', client.firm_phone_number],
      ]}
      permissionsTitle='Portal Access'
      permissions={['PROSPECT_PORTAL_ACCESS', 'CONSULTATION_REQUESTS']}
      importantDatesTitle='Prospect Timeline'
      dateFields={[
        ['Registered On', formatDate(client.created_at)],
        ['Last Profile Update', formatDate(client.updated_at)],
      ]}
    />
  );
}
