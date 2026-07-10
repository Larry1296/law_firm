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
      className={`h-full min-h-[180px] ${className}`}
      rounded={rounded}
      shadow={shadow}
    >
      <div className='flex justify-between items-start'>
        <div>
          <p className='text-sm opacity-80'>Total Clients</p>

          <h2 className='text-5xl font-bold mt-2'>124</h2>

          <p className='mt-3 text-sm'>+12 this month</p>
        </div>

        <Users size={32} />
      </div>
    </DashboardTile>
  );
}
