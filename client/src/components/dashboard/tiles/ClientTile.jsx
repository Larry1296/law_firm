import DashboardTile from '@/components/dashboard/DashboardTile';
import { Users } from 'lucide-react';

export default function ClientsTile({
  size = 'small',
  className = '',
  rounded = 'none',
  shadow = false,
}) {
  return (
    <DashboardTile
      size={size}
      variant='clients'
      className={`h-full min-h-[160px] sm:min-h-[180px] ${className}`}
      rounded={rounded}
      shadow={shadow}
    >
      <div className='flex min-w-0 items-start justify-between gap-3 sm:gap-4'>
        <div className='min-w-0'>
          <p className='text-sm opacity-80'>Total Clients</p>

          <h2 className='text-3xl font-bold sm:text-5xl mt-2'>124</h2>

          <p className='mt-3 text-sm'>+12 this month</p>
        </div>

        <Users className='shrink-0' size={30} />
      </div>
    </DashboardTile>
  );
}
