import { TrendingUp, Wallet } from 'lucide-react';

import DashboardTile from '@/components/dashboard/DashboardTile';

export default function RevenueTile() {
  return (
    <DashboardTile size='wide' variant='finance'>
      <div className='flex h-full flex-col justify-between'>
        <div className='flex min-w-0 items-start justify-between gap-3 sm:gap-4'>
          <div className='min-w-0'>
            <p className='text-sm opacity-80'>Revenue Overview</p>

            <h2 className='mt-2 text-3xl font-bold sm:text-5xl'>KES 2.4M</h2>
          </div>

          <Wallet size={36} />
        </div>

        <div className='mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4'>
          <div className='min-w-0'>
            <p className='text-xs opacity-75'>This Month</p>

            <p className='font-semibold'>KES 420K</p>
          </div>

          <div className='min-w-0'>
            <p className='text-xs opacity-75'>Outstanding</p>

            <p className='font-semibold'>KES 180K</p>
          </div>

          <div className='min-w-0'>
            <p className='text-xs opacity-75'>Growth</p>

            <div className='flex items-center gap-1 font-semibold'>
              <TrendingUp size={14} />
              12%
            </div>
          </div>
        </div>
      </div>
    </DashboardTile>
  );
}
