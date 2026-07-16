import { MessageSquare, User } from 'lucide-react';
import DashboardTile from '@/components/dashboard/DashboardTile';

export default function MessagesTile({
  size = 'medium',
  variant = 'messages',
}) {
  return (
    <DashboardTile size={size} variant={variant}>
      <div className='flex h-full flex-col justify-between'>
        {/* HEADER */}
        <div className='flex min-w-0 items-start justify-between gap-3 sm:gap-4'>
          <div className='min-w-0'>
            <p className='text-sm opacity-80'>Messages</p>
            <h2 className='mt-2 text-3xl font-bold sm:text-5xl'>6</h2>
          </div>

          <MessageSquare className='shrink-0' size={30} />
        </div>

        {/* MESSAGE PREVIEW */}
        <div className='space-y-3'>
          <div className='rounded-xl bg-white/10 p-3'>
            <div className='flex items-center gap-2 mb-1'>
              <User size={14} />
              <span className='text-xs font-medium'>Advocate • 10:15 AM</span>
            </div>

            <p className='text-sm'>
              We have reviewed your documents and will proceed with filing.
            </p>
          </div>

          <div className='rounded-xl bg-white/10 p-3'>
            <div className='flex items-center gap-2 mb-1'>
              <User size={14} />
              <span className='text-xs font-medium'>Advocate • Yesterday</span>
            </div>

            <p className='text-sm'>
              Please confirm the attached affidavit details.
            </p>
          </div>
        </div>

        {/* FOOTER ACTION */}
        <button className='mt-4 w-full rounded-xl py-2 bg-white/10 hover:bg-white/20 transition'>
          Open Messages
        </button>
      </div>
    </DashboardTile>
  );
}
