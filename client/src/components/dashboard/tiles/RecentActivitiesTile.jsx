import { FileText, UserPlus, BriefcaseBusiness, Upload } from 'lucide-react';

import DashboardTile from '@/components/dashboard/DashboardTile';

export default function RecentActivitiesTile() {
  return (
    <DashboardTile size='wide' variant='activity'>
      <div className='h-full flex flex-col'>
        <div className='flex items-center justify-between mb-5'>
          <div className='min-w-0'>
            <p className='text-sm opacity-80'>Recent Activities</p>

            <h2 className='text-xl font-bold sm:text-2xl mt-1'>Firm Activity Feed</h2>
          </div>
        </div>

        <div className='flex-1 space-y-3 overflow-hidden'>
          <div className='flex items-center gap-3 bg-white/10 rounded-xl p-3'>
            <FileText size={18} />

            <div>
              <p className='text-sm font-medium'>New case created</p>

              <p className='text-xs opacity-75'>
                Land Dispute Case • 12 mins ago
              </p>
            </div>
          </div>

          <div className='flex items-center gap-3 bg-white/10 rounded-xl p-3'>
            <UserPlus size={18} />

            <div>
              <p className='text-sm font-medium'>Client onboarded</p>

              <p className='text-xs opacity-75'>
                Membership approved • 25 mins ago
              </p>
            </div>
          </div>

          <div className='flex items-center gap-3 bg-white/10 rounded-xl p-3'>
            <BriefcaseBusiness size={18} />

            <div>
              <p className='text-sm font-medium'>Lawyer assigned</p>

              <p className='text-xs opacity-75'>Commercial Litigation Case</p>
            </div>
          </div>

          <div className='flex items-center gap-3 bg-white/10 rounded-xl p-3'>
            <Upload size={18} />

            <div>
              <p className='text-sm font-medium'>Document uploaded</p>

              <p className='text-xs opacity-75'>Court Filing.pdf</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardTile>
  );
}
