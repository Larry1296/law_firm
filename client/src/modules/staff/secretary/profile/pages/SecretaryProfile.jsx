import { useQuery } from '@tanstack/react-query';

import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import secretaryProfileService from '@/modules/staff/secretary/profile/services/secretaryProfileService';

export default function SecretaryProfile() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['secretary-profile'],
    queryFn: secretaryProfileService.getProfile,
  });

  if (isLoading) return <div className='p-6'>Loading profile...</div>;
  if (error) return <div className='p-6'>Failed to load profile.</div>;

  return (
    <div className='space-y-6 p-4 md:p-6'>
      <SectionHeading title='Secretary Profile' subtitle={data?.law_firm_name} />

      <Card className='p-6'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <p><strong>Name:</strong> {data?.full_name}</p>
          <p><strong>Email:</strong> {data?.email}</p>
          <p><strong>Phone:</strong> {data?.phone_number}</p>
          <p><strong>Role:</strong> {data?.firm_role}</p>
          <p><strong>Department:</strong> {data?.department || 'N/A'}</p>
          <p><strong>Job Title:</strong> {data?.job_title}</p>
          <p><strong>Office:</strong> {data?.office_location || 'N/A'}</p>
          <p><strong>Status:</strong> {data?.employment_status}</p>
        </div>
      </Card>
    </div>
  );
}
