import { CheckSquare, Clock3, AlertCircle, CheckCircle2 } from 'lucide-react';

import DashboardTile from '@/components/dashboard/DashboardTile';

export default function TasksTile({
  size = 'medium',
  className = '',
  rounded = 'none',
  shadow = false,
}) {
  const tasks = [
    {
      id: 1,
      title: 'Review Employment Contract',
      priority: 'High',
      status: 'Pending',
    },
    {
      id: 2,
      title: 'Approve Client Intake',
      priority: 'Medium',
      status: 'In Progress',
    },
    {
      id: 3,
      title: 'Assign Lawyer to New Case',
      priority: 'High',
      status: 'Pending',
    },
    {
      id: 4,
      title: 'Verify Uploaded Documents',
      priority: 'Low',
      status: 'Completed',
    },
  ];

  const priorityStyles = {
    High: 'bg-error/15 text-error',
    Medium: 'bg-warning/15 text-warning',
    Low: 'bg-success/15 text-success',
  };

  const statusIcon = {
    Pending: AlertCircle,
    'In Progress': Clock3,
    Completed: CheckCircle2,
  };

  return (
    <DashboardTile
      size={size}
      variant='tasks'
      className={`h-full min-h-[180px] ${className}`}
      rounded={rounded}
      shadow={shadow}
    >
      <div className='h-full flex flex-col'>
        <div className='flex items-center gap-3 mb-5'>
          <div className='p-3 rounded-xl bg-white/15'>
            <CheckSquare size={22} />
          </div>

          <div>
            <h3 className='font-semibold text-lg'>Tasks & Approvals</h3>

            <p className='text-sm opacity-80'>Pending operational actions</p>
          </div>
        </div>

        <div className='flex-1 space-y-3'>
          {tasks.map((task) => {
            const StatusIcon = statusIcon[task.status];

            return (
              <div
                key={task.id}
                className='rounded-xl p-3 bg-white/10 border border-white/10'
              >
                <div className='flex justify-between items-start gap-3'>
                  <div>
                    <h4 className='font-medium'>{task.title}</h4>

                    <div className='flex gap-2 mt-2'>
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-medium ${priorityStyles[task.priority]}`}
                      >
                        {task.priority}
                      </span>
                    </div>
                  </div>

                  <StatusIcon size={18} />
                </div>

                <p className='text-xs opacity-75 mt-2'>{task.status}</p>
              </div>
            );
          })}
        </div>

        <div className='grid grid-cols-3 gap-2 mt-4'>
          <div className='rounded-xl bg-white/10 p-3 text-center'>
            <p className='text-xl font-bold'>18</p>
            <p className='text-xs opacity-75'>Open</p>
          </div>

          <div className='rounded-xl bg-white/10 p-3 text-center'>
            <p className='text-xl font-bold'>7</p>
            <p className='text-xs opacity-75'>Review</p>
          </div>

          <div className='rounded-xl bg-white/10 p-3 text-center'>
            <p className='text-xl font-bold'>42</p>
            <p className='text-xs opacity-75'>Done</p>
          </div>
        </div>
      </div>
    </DashboardTile>
  );
}
