import { Users, Scale, AlertTriangle, CheckCircle2 } from 'lucide-react';

import DashboardTile from '@/components/dashboard/DashboardTile';

export default function WorkloadTile({
  size = 'medium',
  className = '',
  rounded = 'none',
  shadow = false,
}) {
  const workload = [
    {
      id: 1,
      name: 'Senior Lawyers',
      cases: 14,
      status: 'Balanced',
      icon: CheckCircle2,
    },
    {
      id: 2,
      name: 'Junior Lawyers',
      cases: 22,
      status: 'Overloaded',
      icon: AlertTriangle,
    },
    {
      id: 3,
      name: 'Paralegals',
      cases: 9,
      status: 'Optimal',
      icon: CheckCircle2,
    },
  ];

  const statusStyles = {
    Balanced: 'bg-success/15 text-success',
    Overloaded: 'bg-error/15 text-error',
    Optimal: 'bg-info/15 text-info',
  };

  return (
    <DashboardTile
      size={size}
      variant='staff'
      className={`h-full min-h-[160px] sm:min-h-[180px] ${className}`}
      rounded={rounded}
      shadow={shadow}
    >
      <div className='h-full flex flex-col'>
        {/* Header */}
        <div className='flex items-center gap-3 mb-5'>
          <div className='p-3 rounded-xl bg-white/15'>
            <Users size={22} />
          </div>

          <div className='min-w-0'>
            <h3 className='font-semibold text-lg'>Workload Distribution</h3>
            <p className='text-sm opacity-80'>
              Case assignment across legal teams
            </p>
          </div>
        </div>

        {/* Content */}
        <div className='flex-1 space-y-3'>
          {workload.map((group) => {
            const Icon = group.icon;

            return (
              <div
                key={group.id}
                className='rounded-xl p-3 bg-white/10 border border-white/10'
              >
                <div className='flex min-w-0 items-start justify-between gap-3 sm:gap-4'>
                  <div>
                    <h4 className='break-words font-medium'>{group.name}</h4>
                    <p className='text-sm opacity-80 mt-1'>
                      {group.cases} active cases
                    </p>
                  </div>

                  <Icon size={18} />
                </div>

                <span
                  className={`inline-block mt-2 px-2 py-1 text-xs rounded-lg font-medium ${
                    statusStyles[group.status]
                  }`}
                >
                  {group.status}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer stats */}
        <div className='mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3'>
          <div className='rounded-xl bg-white/10 p-3 text-center'>
            <p className='text-lg font-bold sm:text-xl'>45</p>
            <p className='text-xs opacity-75'>Active Staff</p>
          </div>

          <div className='rounded-xl bg-white/10 p-3 text-center'>
            <p className='text-lg font-bold sm:text-xl'>12</p>
            <p className='text-xs opacity-75'>Overloaded</p>
          </div>

          <div className='rounded-xl bg-white/10 p-3 text-center'>
            <p className='text-lg font-bold sm:text-xl'>8</p>
            <p className='text-xs opacity-75'>Free Capacity</p>
          </div>
        </div>
      </div>
    </DashboardTile>
  );
}
