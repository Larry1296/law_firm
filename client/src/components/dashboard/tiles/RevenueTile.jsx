import { TrendingUp, Wallet } from 'lucide-react';

import DashboardTile from '@/components/dashboard/DashboardTile';

export default function RevenueTile() {
  return (
    <DashboardTile size='wide' variant='finance'>
      <div className='flex h-full flex-col justify-between'>
        <div className='flex items-start justify-between'>
          <div>
            <p className='text-sm opacity-80'>Revenue Overview</p>

            <h2 className='mt-2 text-5xl font-bold'>KES 2.4M</h2>
          </div>

          <Wallet size={36} />
        </div>

        <div className='grid grid-cols-3 gap-4 mt-4'>
          <div>
            <p className='text-xs opacity-75'>This Month</p>

            <p className='font-semibold'>KES 420K</p>
          </div>

          <div>
            <p className='text-xs opacity-75'>Outstanding</p>

            <p className='font-semibold'>KES 180K</p>
          </div>

          <div>
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
