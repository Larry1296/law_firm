import { CalendarDays, Gavel, User } from 'lucide-react';
import DashboardTile from '@/components/dashboard/DashboardTile';

export default function AppointmentsTile({
  size = 'tall',
  variant = 'calendar',
}) {
  return (
    <DashboardTile size={size} variant={variant}>
      <div className='flex h-full flex-col justify-between'>
        {/* HEADER */}
        <div className='flex min-w-0 items-start justify-between gap-3 sm:gap-4'>
          <div className='min-w-0'>
            <p className='text-sm opacity-80'>Upcoming Appointments</p>
            <h2 className='mt-2 text-3xl font-bold sm:text-5xl'>4</h2>
          </div>

          <CalendarDays size={34} />
        </div>

        {/* APPOINTMENTS LIST */}
        <div className='space-y-3'>
          <div className='rounded-xl bg-white/10 p-3'>
            <div className='flex items-center gap-2 mb-1'>
              <User size={14} />
              <span className='text-xs font-medium'>
                Lawyer Meeting • Today 2:00 PM
              </span>
            </div>
            <p className='text-sm'>Case Strategy Discussion</p>
          </div>

          <div className='rounded-xl bg-white/10 p-3'>
            <div className='flex items-center gap-2 mb-1'>
              <Gavel size={14} />
              <span className='text-xs font-medium'>
                Court Prep • Tomorrow 9:00 AM
              </span>
            </div>
            <p className='text-sm'>Document Review Session</p>
          </div>
        </div>
      </div>
    </DashboardTile>
  );
}
