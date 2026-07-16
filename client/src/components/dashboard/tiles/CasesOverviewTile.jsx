import { BriefcaseBusiness } from 'lucide-react';

import DashboardTile from '@/components/dashboard/DashboardTile';

export default function CasesOverviewTile() {
  return (
    <DashboardTile size='large' variant='cases'>
      <div className='mb-6 flex min-w-0 items-start justify-between gap-3 sm:mb-8 sm:gap-4'>
        <div className='min-w-0'>
          <p className='uppercase tracking-widest text-xs opacity-70'>
            Case Management
          </p>

          <h3 className='text-xl font-bold sm:text-2xl mt-2'>Cases Overview</h3>
        </div>

        <div className='bg-white/10 p-4 rounded-2xl backdrop-blur-md'>
          <BriefcaseBusiness className='shrink-0' size={28} />
        </div>
      </div>

      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6'>
        <div className='bg-white/10 rounded-2xl p-4'>
          <p className='text-sm opacity-80'>Active Cases</p>

          <h2 className='text-3xl font-bold sm:text-5xl mt-2'>48</h2>
        </div>

        <div className='bg-white/10 rounded-2xl p-4'>
          <p className='text-sm opacity-80'>Closed Cases</p>

          <h2 className='text-3xl font-bold sm:text-5xl mt-2'>172</h2>
        </div>

        <div className='bg-white/10 rounded-2xl p-4'>
          <p className='text-sm opacity-80'>High Priority</p>

          <h2 className='text-3xl font-bold sm:text-5xl mt-2'>11</h2>
        </div>

        <div className='bg-white/10 rounded-2xl p-4'>
          <p className='text-sm opacity-80'>Court Today</p>

          <h2 className='text-3xl font-bold sm:text-5xl mt-2'>5</h2>
        </div>
      </div>
    </DashboardTile>
  );
}
