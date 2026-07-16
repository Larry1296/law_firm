import { Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import DashboardGrid from '@/components/dashboard/DashboardGrid';
import DashboardHero from '@/components/dashboard/DashboardHero';
import DashboardNotifications from '@/components/dashboard/DashboardNotifications';
import DashboardTile from '@/components/dashboard/DashboardTile';
import SystemHealthReport from '@/components/it/SystemHealthReport';
import { useStaffDashboard } from '@/modules/staff/common/hooks/useStaffWorkspace';

export default function StaffDashboardPage({ config }) {
  const navigate = useNavigate();
  const { data } = useStaffDashboard(config);
  const profile = data?.profile || {};
  const summary = data?.summary || {};
  const recentNotifications = data?.recent_notifications || data?.recent_activity || [];
  const itManagement = summary.it_management;
  const systemHealth = data?.system_health;
  const Icon = config.primaryIcon || Activity;

  return (
    <>
      <DashboardHero
        badge={config.badge}
        title={`Welcome back${profile.full_name ? `, ${profile.full_name}` : ''}`}
        description={config.description}
        statusTitle={config.statusTitle}
        statusDescription={`${summary.pending_tasks ?? 0} pending tasks, ${summary.notifications ?? 0} notifications.`}
        icon={Icon}
      />

      {config.firmRole === 'IT' && itManagement && (
        <div className='mt-4 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-900 dark:text-cyan-100'>
          {itManagement.message}
        </div>
      )}

      <section className='mt-0'>
        <DashboardGrid>
          {config.tiles.map((tile) => {
            const TileIcon = tile.icon;
            const value =
              tile.title === 'Notifications'
                ? summary.unread_notifications ?? summary.notifications ?? 0
                : null;

            return (
              <DashboardTile
                key={tile.title}
                size={tile.size}
                variant={tile.variant}
                rounded='none'
                shadow
                onClick={() => navigate(tile.path)}
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
                      <TileIcon size={22} />
                    </div>
                  </div>

                  <div className='mt-4 flex flex-col gap-2 text-sm text-white/80 sm:flex-row sm:items-center sm:justify-between'>
                    <span className='min-w-0 break-words'>
                      {tile.title === 'Notifications'
                        ? `${value ?? 0} unread`
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

      {config.firmRole === 'IT' && systemHealth && (
        <section className='mt-6'>
          <SystemHealthReport report={systemHealth} showTasks={false} />
        </section>
      )}

      <DashboardNotifications
        notifications={recentNotifications}
        onOpen={() => navigate(config.notificationsPath || `${config.basePath}/notifications`)}
      />
    </>
  );
}
