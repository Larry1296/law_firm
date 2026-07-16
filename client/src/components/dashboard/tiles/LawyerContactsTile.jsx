import { User, Phone, Mail, MessageSquare } from 'lucide-react';
import DashboardTile from '@/components/dashboard/DashboardTile';

export default function LawyerContactsTile({
  size = 'small',
  variant = 'lawyerContacts',
}) {
  return (
    <DashboardTile size={size} variant={variant}>
      <div className='flex h-full flex-col justify-between'>
        {/* HEADER */}
        <div className='flex min-w-0 items-start justify-between gap-3 sm:gap-4'>
          <div className='min-w-0'>
            <p className='text-sm opacity-80'>Your Lawyer</p>
            <h2 className='mt-2 text-xl font-bold sm:text-2xl'>A. Mwangi</h2>
            <p className='text-xs opacity-70'>
              Advocate • Civil & Property Law
            </p>
          </div>

          <User size={30} />
        </div>

        {/* CONTACT INFO */}
        <div className='space-y-3'>
          <div className='rounded-xl bg-white/10 p-3'>
            <div className='flex items-center gap-2 mb-1'>
              <Phone size={14} />
              <span className='text-xs font-medium'>Phone</span>
            </div>
            <p className='text-sm'>+254 712 345 678</p>
          </div>

          <div className='rounded-xl bg-white/10 p-3'>
            <div className='flex items-center gap-2 mb-1'>
              <Mail size={14} />
              <span className='text-xs font-medium'>Email</span>
            </div>
            <p className='text-sm'>mwangi@lawfirm.co.ke</p>
          </div>
        </div>

        {/* ACTIONS */}
        <div className='flex gap-2 mt-4'>
          <button className='flex-1 rounded-xl py-2 bg-white/10 hover:bg-white/20 transition flex items-center justify-center gap-2'>
            <MessageSquare size={14} />
            Message
          </button>
        </div>
      </div>
    </DashboardTile>
  );
}
