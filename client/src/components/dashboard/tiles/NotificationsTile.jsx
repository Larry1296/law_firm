import { Bell, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import DashboardTile from '@/components/dashboard/DashboardTile';

export default function NotificationsTile({
  size = 'medium',
  className = '',
  rounded = 'none',
  shadow = false,
}) {
  const notifications = [
    {
      id: 1,
      type: 'warning',
      title: 'Document Approval Pending',
      description: '4 legal documents require review.',
      time: '5 mins ago',
      icon: AlertTriangle,
    },
    {
      id: 2,
      type: 'info',
      title: 'Court Session Reminder',
      description: 'Virtual hearing scheduled for tomorrow.',
      time: '20 mins ago',
      icon: Clock,
    },
    {
      id: 3,
      type: 'success',
      title: 'Client Onboarded',
      description: 'New client account successfully activated.',
      time: '1 hour ago',
      icon: CheckCircle2,
    },
  ];

  const typeStyles = {
    warning: 'bg-warning/10 text-warning border-warning/20',
    info: 'bg-info/10 text-info border-info/20',
    success: 'bg-success/10 text-success border-success/20',
  };

  return (
    <DashboardTile
      size={size}
      variant='notifications'
      className={`h-full min-h-[180px] ${className}`}
      rounded={rounded}
      shadow={shadow}
    >
      <div className='h-full flex flex-col'>
        <div className='flex items-center gap-3 mb-5'>
          <div className='p-3 rounded-xl bg-white/10'>
            <Bell size={22} />
          </div>

          <div>
            <h3 className='font-semibold text-lg'>Notifications</h3>

            <p className='text-sm opacity-80'>Recent alerts & updates</p>
          </div>
        </div>

        <div className='space-y-3 flex-1'>
          {notifications.map((notification) => {
            const Icon = notification.icon;

            return (
              <div
                key={notification.id}
                className='p-3 rounded-xl bg-white/5 border border-white/10'
              >
                <div className='flex items-start gap-3'>
                  <div
                    className={`p-2 rounded-lg border ${typeStyles[notification.type]}`}
                  >
                    <Icon size={16} />
                  </div>

                  <div className='flex-1'>
                    <h4 className='font-medium text-sm'>
                      {notification.title}
                    </h4>

                    <p className='text-xs opacity-75 mt-1'>
                      {notification.description}
                    </p>

                    <span className='text-xs opacity-60 mt-2 block'>
                      {notification.time}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button className='mt-4 w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 transition'>
          View All Notifications
        </button>
      </div>
    </DashboardTile>
  );
}
