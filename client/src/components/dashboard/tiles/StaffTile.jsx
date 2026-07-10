import { BriefcaseBusiness } from 'lucide-react';

import DashboardTile from '@/components/dashboard/DashboardTile';

export default function StaffTile() {
  return (
    <DashboardTile variant='staff'>
      <div className='h-full flex flex-col justify-between'>
        {/* HEADER */}
        <div className='flex items-start justify-between'>
          <div>
            <p className='text-sm opacity-80'>Active Staff</p>
            <h2 className='mt-2 text-5xl font-bold'>28</h2>
          </div>

          <div className='p-3 rounded-xl bg-white/10'>
            <BriefcaseBusiness size={32} />
          </div>
        </div>

        {/* BREAKDOWN */}
        <div className='mt-6 space-y-2'>
          <div className='flex items-center justify-between text-sm'>
            <span className='opacity-90'>Lawyers</span>
            <span className='font-semibold'>18</span>
          </div>

          <div className='flex items-center justify-between text-sm'>
            <span className='opacity-90'>Secretaries</span>
            <span className='font-semibold'>10</span>
          </div>

          {/* subtle divider */}
          <div className='h-px bg-white/10 my-3' />

          <div className='text-xs opacity-75'>+2 new staff this month</div>
        </div>
      </div>
    </DashboardTile>
  );
}
