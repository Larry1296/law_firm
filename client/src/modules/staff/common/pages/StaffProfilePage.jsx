import { ShieldCheck, User } from 'lucide-react';

import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import { useStaffProfile } from '@/modules/staff/common/hooks/useStaffWorkspace';

const display = (value) => value || 'N/A';

export default function StaffProfilePage({ config }) {
  const { data, isLoading, isError } = useStaffProfile(config);
  const profile = data?.profile || {};

  return (
    <div className='p-4 sm:p-6 lg:p-8 space-y-6'>
      <SectionHeading
        title={`${config.label} Profile`}
        subtitle='Your staff profile, role details, and assigned permissions.'
        icon={User}
      />

      {isLoading && <Card className='p-6'>Loading profile...</Card>}

      {isError && (
        <Card className='p-6'>
          <p className='text-sm text-red-600 dark:text-red-300'>
            Could not load profile.
          </p>
        </Card>
      )}

      {!isLoading && !isError && (
        <div className='grid grid-cols-1 xl:grid-cols-3 gap-4'>
          <Card className='p-6 xl:col-span-2'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
              {[
                ['Full Name', profile.full_name],
                ['Email', profile.email],
                ['Phone', profile.phone_number],
                ['Staff Number', profile.staff_number],
                ['Department', profile.department],
                ['Job Title', profile.job_title],
                ['Work Email', profile.work_email],
                ['Work Phone', profile.work_phone],
                ['Office Location', profile.office_location],
                ['Employment Status', profile.employment_status],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className='text-xs uppercase tracking-widest text-[color:var(--text-muted)]'>
                    {label}
                  </p>
                  <p className='mt-1 font-medium'>{display(value)}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className='p-6'>
            <div className='flex items-center gap-3 mb-4'>
              <ShieldCheck className='text-[color:var(--brand-primary)] dark:text-blue-300' />
              <h3 className='font-semibold'>Permissions</h3>
            </div>

            <div className='space-y-2'>
              {(profile.permissions || []).map((permission) => (
                <div
                  key={permission}
                  className='rounded-md border border-[color:var(--border)] px-3 py-2 text-sm'
                >
                  {permission.replaceAll('_', ' ')}
                </div>
              ))}

              {!profile.permissions?.length && (
                <p className='text-sm text-[color:var(--text-muted)]'>
                  No explicit permissions assigned yet.
                </p>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
