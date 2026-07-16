import { Gavel, CalendarDays } from 'lucide-react';
import DashboardTile from '@/components/dashboard/DashboardTile';

export default function HearingsTile({
  size = 'tall',
  variant = 'hearings',
  className = '',
  rounded = 'none',
  shadow = false,
}) {
  return (
    <DashboardTile
      size={size}
      variant={variant}
      className={`h-full min-h-[160px] sm:min-h-[180px] ${className}`}
      rounded={rounded}
      shadow={shadow}
    >
      <div className='flex h-full flex-col justify-between'>
        <div className='flex min-w-0 items-start justify-between gap-3 sm:gap-4'>
          <div className='min-w-0'>
            <p className='text-sm opacity-80'>Upcoming Hearings</p>
            <h2 className='mt-2 text-3xl font-bold sm:text-5xl'>18</h2>
          </div>

          <Gavel size={34} />
        </div>

        <div className='space-y-3'>
          <div className='rounded-xl bg-white/10 p-3'>
            <div className='flex items-center gap-2 mb-1'>
              <CalendarDays size={14} />
              <span className='text-xs font-medium'>Today • 10:00 AM</span>
            </div>
            <p className='text-sm'>Land Dispute Hearing</p>
          </div>

          <div className='rounded-xl bg-white/10 p-3'>
            <div className='flex items-center gap-2 mb-1'>
              <CalendarDays size={14} />
              <span className='text-xs font-medium'>Tomorrow • 09:30 AM</span>
            </div>
            <p className='text-sm'>Commercial Litigation</p>
          </div>
        </div>
      </div>
    </DashboardTile>
  );
}
