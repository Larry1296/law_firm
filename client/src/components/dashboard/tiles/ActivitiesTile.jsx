import { Activity, FileText, UserPlus, Briefcase, Gavel } from 'lucide-react';
import DashboardTile from '@/components/dashboard/DashboardTile';

export default function ActivitiesTile({
  size = 'large',
  variant = 'activities',
  className = '',
  rounded = 'none',
  shadow = false,
}) {
  const activities = [
    {
      id: 1,
      title: 'New Case Created',
      description: 'Boundary Dispute case added.',
      time: '10 mins ago',
      icon: Briefcase,
    },
    {
      id: 2,
      title: 'Client Registered',
      description: 'Sarah Wanjiru joined the firm.',
      time: '35 mins ago',
      icon: UserPlus,
    },
    {
      id: 3,
      title: 'Document Uploaded',
      description: 'Affidavit document attached.',
      time: '1 hour ago',
      icon: FileText,
    },
    {
      id: 4,
      title: 'Court Hearing Scheduled',
      description: 'ELC/2026/0143 hearing added.',
      time: '2 hours ago',
      icon: Gavel,
    },
    {
      id: 5,
      title: 'Case Updated',
      description: 'Employment dispute moved to review.',
      time: '3 hours ago',
      icon: Briefcase,
    },
  ];

  return (
    <DashboardTile
      size={size}
      variant={variant}
      className={`h-full min-h-[180px] ${className}`}
      rounded={rounded}
      shadow={shadow}
    >
      <div className='h-full flex flex-col'>
        <div className='flex items-center gap-3 mb-6'>
          <div className='p-3 rounded-xl bg-white/10'>
            <Activity size={22} />
          </div>

          <div>
            <h3 className='font-semibold text-lg'>Recent Activities</h3>
            <p className='text-sm opacity-80'>
              Latest activity across the firm
            </p>
          </div>
        </div>

        <div className='flex-1 space-y-4 overflow-hidden'>
          {activities.map((activity) => {
            const Icon = activity.icon;

            return (
              <div
                key={activity.id}
                className='flex items-start gap-4 p-3 rounded-xl bg-white/5 border border-white/10'
              >
                <div className='p-2 rounded-lg bg-brand-primary/20'>
                  <Icon size={16} />
                </div>

                <div className='flex-1'>
                  <h4 className='font-medium'>{activity.title}</h4>
                  <p className='text-sm opacity-75'>{activity.description}</p>
                </div>

                <span className='text-xs opacity-60 whitespace-nowrap'>
                  {activity.time}
                </span>
              </div>
            );
          })}
        </div>

        <button className='mt-4 w-full rounded-xl py-2 bg-white/10 hover:bg-white/20 transition'>
          View Activity Log
        </button>
      </div>
    </DashboardTile>
  );
}
