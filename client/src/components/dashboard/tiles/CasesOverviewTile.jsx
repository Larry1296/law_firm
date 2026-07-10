import { BriefcaseBusiness } from 'lucide-react';

import DashboardTile from '@/components/dashboard/DashboardTile';

export default function CasesOverviewTile() {
  return (
    <DashboardTile size='large' variant='cases'>
      <div className='flex justify-between items-start mb-8'>
        <div>
          <p className='uppercase tracking-widest text-xs opacity-70'>
            Case Management
          </p>

          <h3 className='text-2xl font-bold mt-2'>Cases Overview</h3>
        </div>

        <div className='bg-white/10 p-4 rounded-2xl backdrop-blur-md'>
          <BriefcaseBusiness size={30} />
        </div>
      </div>

      <div className='grid grid-cols-2 gap-6'>
        <div className='bg-white/10 rounded-2xl p-4'>
          <p className='text-sm opacity-80'>Active Cases</p>

          <h2 className='text-5xl font-bold mt-2'>48</h2>
        </div>

        <div className='bg-white/10 rounded-2xl p-4'>
          <p className='text-sm opacity-80'>Closed Cases</p>

          <h2 className='text-5xl font-bold mt-2'>172</h2>
        </div>

        <div className='bg-white/10 rounded-2xl p-4'>
          <p className='text-sm opacity-80'>High Priority</p>

          <h2 className='text-5xl font-bold mt-2'>11</h2>
        </div>

        <div className='bg-white/10 rounded-2xl p-4'>
          <p className='text-sm opacity-80'>Court Today</p>

          <h2 className='text-5xl font-bold mt-2'>5</h2>
        </div>
      </div>
    </DashboardTile>
  );
}
