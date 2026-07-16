import {
  Activity,
  Bell,
  Briefcase,
  CalendarDays,
  CheckSquare,
  FileText,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import DashboardHero from '@/components/dashboard/DashboardHero';
import DashboardGrid from '@/components/dashboard/DashboardGrid';
import DashboardTile from '@/components/dashboard/DashboardTile';
import useSecretaryDashboard from '@/modules/staff/secretary/dashboard/hooks/useSecretaryDashboard';
import { formatDateTime } from '@/core/utils/dateFormatter';

const secretaryTiles = [
  {
    title: 'Clients',
    subtitle: 'View and create firm clients',
    icon: Users,
    variant: 'clients',
    size: 'wide',
    path: '/secretary/clients',
    permission: 'MANAGE_CLIENTS',
  },
  {
    title: 'Cases',
    subtitle: 'View and create firm cases',
    icon: Briefcase,
    variant: 'cases',
    size: 'wide',
    path: '/secretary/cases',
    permission: 'MANAGE_CASES',
  },
  {
    title: 'Notifications',
    subtitle: 'Recent alerts and administrative updates',
    icon: Bell,
    variant: 'notifications',
    size: 'wide',
    path: '/secretary/notifications',
  },
  {
    title: 'Calendar',
    subtitle: 'Manage schedules and appointments',
    icon: CalendarDays,
    variant: 'hearings',
    size: 'wide',
    path: '/secretary/calendar',
  },
  {
    title: 'Tasks',
    subtitle: 'Daily assignments and pending actions',
    icon: CheckSquare,
    variant: 'tasks',
    size: 'wide',
    path: '/secretary/tasks',
  },
  {
    title: 'Workload',
    subtitle: 'Track team schedules and responsibilities',
    icon: Activity,
    variant: 'staff',
    size: 'wide',
    path: '/secretary/profile',
  },
  {
    title: 'Documents',
    subtitle: 'Manage files, forms, and records',
    icon: FileText,
    variant: 'documents',
    size: 'full',
    path: '/secretary/documents',
  },
];

const hasPermission = (permissions, permission) => {
  if (!permission) return true;
  const normalized = permissions.map((item) => String(item).toUpperCase());
  return normalized.includes(permission);
};

const getTileValue = (tile, summary) => {
  if (tile.title === 'Notifications') return summary.unread_notifications ?? 0;
  if (tile.title === 'Clients') return summary.clients ?? 0;
  if (tile.title === 'Cases') return summary.active_cases ?? summary.cases ?? 0;
  if (tile.title === 'Calendar') return summary.appointments_today ?? 0;
  if (tile.title === 'Tasks') return summary.pending_tasks ?? 0;
  if (tile.title === 'Documents') return summary.documents_to_prepare ?? 0;
  if (tile.title === 'Workload') return summary.assigned_lawyers ?? 0;
  return null;
};

const getNotificationTarget = (notification) => {
  if (notification?.case) return `/secretary/cases/${notification.case}`;
  return '/secretary/notifications';
};

export default function SecretaryDashboard() {
  const navigate = useNavigate();
  const { data } = useSecretaryDashboard();
  const profile = data?.profile || {};
  const summary = data?.summary || {};
  const permissions = data?.permissions || [];
  const recentNotifications = data?.recent_notifications || data?.recent_activity || [];
  const latestNotification = recentNotifications[0];
  const visibleTiles = secretaryTiles.filter((tile) =>
    hasPermission(permissions, tile.permission),
  );

  return (
    <>
      <DashboardHero
        badge='Secretary'
        title={`Welcome back${profile.full_name ? `, ${profile.full_name}` : ''}`}
        description='Manage client communications, schedules, documents, and daily administrative operations.'
        statusTitle='Operations Running Smoothly'
        statusDescription={`${summary.pending_tasks ?? 0} pending tasks, ${summary.appointments_today ?? 0} appointments today.`}
      />

      <section className='mt-0'>
        <DashboardGrid>
          {visibleTiles.map((tile) => {
            const Icon = tile.icon;
            const value = getTileValue(tile, summary);
            const isNotificationsTile = tile.title === 'Notifications';
            const targetPath = isNotificationsTile
              ? getNotificationTarget(latestNotification)
              : tile.path;

            return (
              <DashboardTile
                key={tile.title}
                size={tile.size}
                variant={tile.variant}
                rounded='none'
                shadow
                onClick={() => navigate(targetPath)}
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

                  {isNotificationsTile && (
                    <div className='mt-4 rounded-xl border border-white/15 bg-white/10 p-3 text-sm text-white/85'>
                      {latestNotification ? (
                        <>
                          <p className='font-semibold text-white'>
                            {latestNotification.title || 'Latest Notification'}
                          </p>
                          <p className='mt-1 line-clamp-2'>
                            {latestNotification.description ||
                              latestNotification.message ||
                              'Open notifications for details.'}
                          </p>
                          <p className='mt-2 text-xs text-white/65'>
                            {formatDateTime(latestNotification.created_at)}
                          </p>
                        </>
                      ) : (
                        <p>No recent notifications.</p>
                      )}
                    </div>
                  )}

                  <div className='mt-4 flex flex-col gap-2 text-sm text-white/80 sm:flex-row sm:items-center sm:justify-between'>
                    <span className='min-w-0 break-words'>
                      {tile.title === 'Notifications'
                        ? `${summary.unread_notifications ?? 0} unread`
                        : 'Open workspace'}
                    </span>

                    <span className='w-fit shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold'>
                      Quick access
                    </span>
                  </div>
                </div>
              </DashboardTile>
            );
          })}
        </DashboardGrid>
      </section>
    </>
  );
}
