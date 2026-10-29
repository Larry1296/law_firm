import { useContext } from 'react';

import AuthContext from '@/core/store/AuthContext';
import UnlockPinCard from '@/modules/profile/components/UnlockPinCard';
import { PageHeader, Panel } from '@/modules/platform/components/ui';

export default function PlatformProfilePage() {
  const { user } = useContext(AuthContext) || {};

  return (
    <>
      <PageHeader
        title='Profile'
        description='Your platform administrator account and how you unlock your workspace.'
      />

      <div className='grid grid-cols-1 gap-6 xl:grid-cols-3'>
        <Panel title='Account' className='xl:col-span-2'>
          <dl className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            {[
              ['Full name', user?.full_name],
              ['Email', user?.email],
              ['Role', 'Platform administrator'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className='text-xs font-semibold uppercase tracking-widest text-text-muted-light dark:text-text-muted-dark'>{label}</dt>
                <dd className='mt-1 break-words text-sm font-medium'>{value || 'Not set'}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <UnlockPinCard />
      </div>
    </>
  );
}
