import { Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import DashboardGrid from '@/components/dashboard/DashboardGrid';
import DashboardHero from '@/components/dashboard/DashboardHero';
import DashboardTile from '@/components/dashboard/DashboardTile';
import SystemHealthReport from '@/components/it/SystemHealthReport';
import { useStaffDashboard } from '@/modules/staff/common/hooks/useStaffWorkspace';

export default function StaffDashboardPage({ config }) {
  const navigate = useNavigate();
  const { data } = useStaffDashboard(config);
  const profile = data?.profile || {};
  const summary = data?.summary || {};
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

      <section className='mt-4'>
        <DashboardGrid>
          {config.tiles.map((tile) => {
            const TileIcon = tile.icon;

            return (
              <DashboardTile
                key={tile.title}
                size={tile.size}
                variant={tile.variant}
                rounded='none'
                shadow
                onClick={() => navigate(tile.path)}
                className='group min-h-[180px] p-5'
              >
                <div className='relative z-10 flex h-full flex-col justify-between'>
                  <div className='flex items-start justify-between gap-4'>
                    <div>
                      <p className='text-xs uppercase tracking-[0.25em] text-white/80'>
                        {tile.title}
                      </p>

                      <h3 className='mt-2 text-xl font-semibold'>
                        {tile.subtitle}
                      </h3>
                    </div>

                    <div className='rounded-2xl bg-white/15 p-3 shadow-inner backdrop-blur-sm transition group-hover:scale-110'>
                      <TileIcon size={22} />
                    </div>
                  </div>

                  <div className='mt-4 flex items-center justify-between text-sm text-white/80'>
                    <span>Open workspace</span>

                    <span className='rounded-full bg-white/15 px-3 py-1 text-xs font-semibold'>
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
    </>
  );
}
