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
    size: 'wide',
    path: '/secretary/documents',
  },
];

const hasPermission = (permissions, permission) => {
  if (!permission) return true;
  const normalized = permissions.map((item) => String(item).toUpperCase());
  return normalized.includes(permission);
};

export default function SecretaryDashboard() {
  const navigate = useNavigate();
  const { data } = useSecretaryDashboard();
  const profile = data?.profile || {};
  const summary = data?.summary || {};
  const permissions = data?.permissions || [];
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

      <section className='mt-4'>
        <DashboardGrid>
          {visibleTiles.map((tile) => {
            const Icon = tile.icon;

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
                  <div className='flex items-start justify-between'>
                    <div>
                      <p className='text-xs uppercase tracking-[0.25em] text-white/80'>
                        {tile.title}
                      </p>

                      <h3 className='mt-2 text-xl font-semibold'>
                        {tile.subtitle}
                      </h3>
                    </div>

                    <div className='rounded-2xl bg-white/15 p-3 shadow-inner backdrop-blur-sm transition group-hover:scale-110'>
                      <Icon size={22} />
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
    </>
  );
}
