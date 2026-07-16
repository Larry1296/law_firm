import { CreditCard, FileText, AlertCircle } from 'lucide-react';
import DashboardTile from '@/components/dashboard/DashboardTile';

export default function BillingTile({ size = 'medium', variant = 'billing' }) {
  return (
    <DashboardTile size={size} variant={variant}>
      <div className='flex h-full flex-col justify-between'>
        {/* HEADER */}
        <div className='flex min-w-0 items-start justify-between gap-3 sm:gap-4'>
          <div className='min-w-0'>
            <p className='text-sm opacity-80'>Billing</p>
            <h2 className='mt-2 text-3xl font-bold sm:text-5xl'>$1,250</h2>
          </div>

          <CreditCard className='shrink-0' size={30} />
        </div>

        {/* BILLING INFO */}
        <div className='space-y-3'>
          {/* Outstanding invoice */}
          <div className='rounded-xl bg-white/10 p-3'>
            <div className='flex items-center gap-2 mb-1'>
              <AlertCircle size={14} />
              <span className='text-xs font-medium'>Outstanding Invoice</span>
            </div>
            <p className='text-sm'>Invoice #INV-2026-014</p>
            <p className='text-xs opacity-70'>Due in 5 days</p>
          </div>

          {/* Recent payment */}
          <div className='rounded-xl bg-white/10 p-3'>
            <div className='flex items-center gap-2 mb-1'>
              <FileText size={14} />
              <span className='text-xs font-medium'>Recent Payment</span>
            </div>
            <p className='text-sm'>Paid $500 on Case Filing</p>
            <p className='text-xs opacity-70'>Yesterday</p>
          </div>
        </div>

        {/* ACTION */}
        <button className='mt-4 w-full rounded-xl py-2 bg-white/10 hover:bg-white/20 transition'>
          View Billing History
        </button>
      </div>
    </DashboardTile>
  );
}
