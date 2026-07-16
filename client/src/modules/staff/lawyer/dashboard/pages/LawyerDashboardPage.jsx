import {
  Activity,
  Bell,
  Briefcase,
  Brain,
  CalendarDays,
  CheckSquare,
  FileText,
  Users,
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';

import DashboardHero from '@/components/dashboard/DashboardHero';
import DashboardGrid from '@/components/dashboard/DashboardGrid';
import DashboardTile from '@/components/dashboard/DashboardTile';
import DashboardNotifications from '@/components/dashboard/DashboardNotifications';
import useLawyerDashboard from '@/modules/staff/lawyer/dashboard/hooks/useLawyerDashboard';

const lawyerTiles = [
  {
    title: 'My Cases',
    subtitle: 'Manage assigned matters and legal work',
    icon: Briefcase,
    variant: 'cases',
    size: 'large',
    path: '/lawyer/cases',
  },
  {
    title: 'Clients',
    subtitle: 'View and communicate with clients',
    icon: Users,
    variant: 'clients',
    size: 'wide',
  },
  {
    title: 'Hearings',
    subtitle: 'Upcoming court appearances and schedules',
    icon: CalendarDays,
    variant: 'hearings',
    size: 'wide',
    path: '/lawyer/hearings',
  },
  {
    title: 'Notifications',
    subtitle: 'Recent updates and important alerts',
    icon: Bell,
    variant: 'notifications',
    size: 'wide',
    path: '/lawyer/notifications',
  },
  {
    title: 'Workload',
    subtitle: 'Track assignments and deadlines',
    icon: Activity,
    variant: 'staff',
    size: 'wide',
    path: '/lawyer/cases',
  },
  {
    title: 'Tasks',
    subtitle: 'Pending work requiring attention',
    icon: CheckSquare,
    variant: 'tasks',
    size: 'wide',
    path: '/lawyer/tasks',
  },
  {
    title: 'AI Insights',
    subtitle: 'Legal recommendations and analysis',
    icon: Brain,
    variant: 'ai',
    size: 'wide',
    path: '/lawyer/ai',
  },
  {
    title: 'Recent Activity',
    subtitle: 'Latest case and client activity',
    icon: Activity,
    variant: 'activities',
    size: 'wide',
    path: '/lawyer/cases',
  },
  {
    title: 'Documents',
    subtitle: 'Case files, evidence, and legal records',
    icon: FileText,
    variant: 'documents',
    size: 'wide',
    path: '/lawyer/documents',
  },
];

export default function LawyerDashboardPage() {
  const navigate = useNavigate();
  const { data } = useLawyerDashboard();
  const summary = data?.summary || {};
  const profile = data?.lawyer || {};
  const recentNotifications = data?.recent_notifications || data?.recent_activity || [];

  const tileValue = (tile) => {
    if (tile.title === 'Notifications') return summary.unread_notifications ?? 0;
    if (tile.title === 'My Cases') return summary.active_cases ?? 0;
    if (tile.title === 'Clients') return summary.clients ?? 0;
    if (tile.title === 'Hearings') return summary.hearings ?? 0;
    if (tile.title === 'Workload') return summary.total_cases ?? 0;
    if (tile.title === 'Tasks') return summary.tasks_due ?? 0;
    if (tile.title === 'Documents') return summary.documents ?? 0;
    return null;
  };

  return (
    <>
      <DashboardHero
        badge='Advocate'
        title={`Welcome back${profile.full_name ? `, ${profile.full_name}` : ''}`}
        description='Manage assigned matters, prepare hearings, track deadlines, and collaborate with clients.'
        statusTitle='Practice Active'
        statusDescription={`${summary.tasks_due ?? 0} pending tasks, ${summary.unread_notifications ?? 0} unread notifications.`}
      />

      <section className='mt-0'>
        <DashboardGrid>
          {lawyerTiles.map((tile) => {
            const Icon = tile.icon;
            const value = tileValue(tile);

            return (
              <DashboardTile
                key={tile.title}
                size={tile.size}
                variant={tile.variant}
                rounded='none'
                shadow
                onClick={tile.path ? () => navigate(tile.path) : undefined}
                className='group min-h-[160px] p-4 sm:min-h-[180px] sm:p-5'
              >
                <div className='relative z-10 flex h-full flex-col justify-between'>
                  <div className='flex items-start justify-between gap-3 sm:gap-4'>
                    <div className='min-w-0'>
                      <p className='text-[11px] uppercase tracking-[0.16em] text-white/80 sm:text-xs sm:tracking-[0.25em]'>
                        {tile.title}
                      </p>

                      <h3 className='mt-2 break-words text-lg font-semibold leading-tight sm:text-xl'>
                        {value === null ? tile.subtitle : value.toLocaleString()}
                      </h3>
                      {value !== null && (
                        <p className='mt-2 text-sm text-white/80'>{tile.subtitle}</p>
                      )}
                    </div>

                    <div className='shrink-0 rounded-2xl bg-white/15 p-3 shadow-inner backdrop-blur-sm transition group-hover:scale-110'>
                      <Icon size={22} />
                    </div>
                  </div>

                  <div className='mt-4 flex flex-col gap-2 text-sm text-white/80 sm:flex-row sm:items-center sm:justify-between'>
                    <span className='min-w-0 break-words'>
                      {tile.title === 'Notifications'
                        ? `${summary.unread_notifications ?? 0} unread`
                        : tile.path
                          ? 'Open workspace'
                          : 'API ready'}
                    </span>

                    <span className='w-fit shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold'>
                      {tile.path ? 'Quick access' : 'Metric only'}
                    </span>
                  </div>
                </div>
              </DashboardTile>
            );
          })}
        </DashboardGrid>
      </section>

      <DashboardNotifications
        notifications={recentNotifications}
        onOpen={(notification) => {
          if (notification.case) {
            navigate(`/lawyer/cases/${notification.case}`);
          } else {
            navigate('/lawyer/notifications');
          }
        }}
      />
    </>
  );
}
