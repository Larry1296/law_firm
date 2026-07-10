import { FileText, Lock, Clock, CheckCircle2, Upload } from 'lucide-react';

import DashboardTile from '@/components/dashboard/DashboardTile';

export default function DocumentsTile({
  size = 'large',
  className = '',
  rounded = 'none',
  shadow = false,
}) {
  const recentDocuments = [
    {
      id: 1,
      title: 'Affidavit - Land Dispute',
      status: 'Reviewed',
    },
    {
      id: 2,
      title: 'Employment Agreement',
      status: 'Pending',
    },
    {
      id: 3,
      title: 'Court Filing Bundle',
      status: 'Pending',
    },
  ];

  return (
    <DashboardTile
      size={size}
      variant='documents'
      className={`h-full min-h-[180px] ${className}`}
      rounded={rounded}
      shadow={shadow}
    >
      <div className='h-full flex flex-col'>
        <div className='flex items-center gap-3 mb-6'>
          <div className='p-3 rounded-xl bg-white/15'>
            <FileText size={22} />
          </div>

          <div>
            <h3 className='text-lg font-semibold'>Document Management</h3>

            <p className='text-sm opacity-80'>Firm-wide document overview</p>
          </div>
        </div>

        <div className='grid grid-cols-2 gap-3 mb-5'>
          <div className='rounded-xl bg-white/10 p-4'>
            <div className='flex items-center justify-between'>
              <Upload size={18} />
              <span className='text-2xl font-bold'>1,248</span>
            </div>

            <p className='text-sm mt-2 opacity-80'>Total Documents</p>
          </div>

          <div className='rounded-xl bg-white/10 p-4'>
            <div className='flex items-center justify-between'>
              <Clock size={18} />
              <span className='text-2xl font-bold'>27</span>
            </div>

            <p className='text-sm mt-2 opacity-80'>Pending Review</p>
          </div>

          <div className='rounded-xl bg-white/10 p-4'>
            <div className='flex items-center justify-between'>
              <Lock size={18} />
              <span className='text-2xl font-bold'>412</span>
            </div>

            <p className='text-sm mt-2 opacity-80'>Confidential</p>
          </div>

          <div className='rounded-xl bg-white/10 p-4'>
            <div className='flex items-center justify-between'>
              <CheckCircle2 size={18} />
              <span className='text-2xl font-bold'>96%</span>
            </div>

            <p className='text-sm mt-2 opacity-80'>Compliance Rate</p>
          </div>
        </div>

        <div className='flex-1'>
          <h4 className='font-medium mb-3'>Recent Uploads</h4>

          <div className='space-y-3'>
            {recentDocuments.map((document) => (
              <div
                key={document.id}
                className='rounded-xl p-3 bg-white/10 border border-white/10'
              >
                <div className='flex items-center justify-between'>
                  <p className='font-medium text-sm'>{document.title}</p>

                  <span
                    className={`text-xs px-2 py-1 rounded-lg ${
                      document.status === 'Reviewed'
                        ? 'bg-success/20 text-success'
                        : 'bg-warning/20 text-warning'
                    }`}
                  >
                    {document.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button className='mt-4 w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 transition'>
          Open Document Center
        </button>
      </div>
    </DashboardTile>
  );
}
