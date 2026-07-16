import {
  Activity,
  BarChart3,
  Bell,
  Briefcase,
  Brain,
  CalendarDays,
  CheckSquare,
  FileText,
  Gavel,
  Users,
  UserCog,
  Wallet,
} from 'lucide-react';

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import useAuth from '@/core/hooks/useAuth';
import DashboardHero from '@/components/dashboard/DashboardHero';
import DashboardGrid from '@/components/dashboard/DashboardGrid';
import DashboardTile from '@/components/dashboard/DashboardTile';
import useAdminDashboard from '@/modules/admin/dashboard/hooks/useAdminDashboard';

const adminTiles = [
  {
    key: 'courtroom',
    title: 'Courtroom Access',
    subtitle: 'Manage courtroom schedules and permissions',
    icon: Gavel,
    variant: 'courtroom',
    size: 'large',
    path: '/admin/cases',
  },
  {
    key: 'clients',
    title: 'Clients',
    subtitle: 'Manage all client records and accounts',
    icon: Users,
    variant: 'clients',
    size: 'wide',
    path: '/admin/clients',
  },
  {
    key: 'staff',
    title: 'Staff',
    subtitle: 'Lawyers, experts, and support personnel',
    icon: UserCog,
    variant: 'staff',
    size: 'wide',
    path: '/admin/staff',
  },
  {
    key: 'revenue',
    title: 'Revenue',
    subtitle: 'Track payments, invoices, and firm earnings',
    icon: Wallet,
    variant: 'revenue',
    size: 'wide',
    path: '/admin/billing',
  },
  {
    key: 'cases',
    title: 'Cases Overview',
    subtitle: 'Monitor all active and archived matters',
    icon: Briefcase,
    variant: 'cases',
    size: 'wide',
    path: '/admin/cases',
  },
  {
    key: 'ai',
    title: 'AI Insights',
    subtitle: 'Legal intelligence and recommendations',
    icon: Brain,
    variant: 'ai',
    size: 'wide',
    path: '/admin/ai',
  },
  {
    key: 'hearings',
    title: 'Hearings',
    subtitle: 'Upcoming court appearances and schedules',
    icon: CalendarDays,
    variant: 'hearings',
    size: 'wide',
    path: '/admin/hearings',
  },
  {
    key: 'notifications',
    title: 'Notifications',
    subtitle: 'Firm-wide alerts and updates',
    icon: Bell,
    variant: 'notifications',
    size: 'wide',
    path: '/admin/communication/notifications',
  },
  {
    key: 'tasks',
    title: 'Tasks',
    subtitle: 'Administrative actions requiring attention',
    icon: CheckSquare,
    variant: 'tasks',
    size: 'wide',
    path: '/admin/cases',
  },
  {
    key: 'workload',
    title: 'Workload',
    subtitle: 'Monitor assignments and team capacity',
    icon: Activity,
    variant: 'staff',
    size: 'wide',
    path: '/admin/staff',
  },
  {
    key: 'documents',
    title: 'Documents',
    subtitle: 'Firm files, evidence, and legal records',
    icon: FileText,
    variant: 'documents',
    size: 'wide',
    path: '/admin/documents',
  },
  {
    key: 'activities',
    title: 'Activities',
    subtitle: 'Recent activity across the platform',
    icon: Activity,
    variant: 'activities',
    size: 'wide',
    path: '/admin/reports',
  },
  {
    key: 'analytics',
    title: 'Analytics',
    subtitle: 'Performance reports and business metrics',
    icon: BarChart3,
    variant: 'analytics',
    size: 'wide',
    path: '/admin/reports',
  },
];

const formatNumber = (value) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number.toLocaleString() : '0';
};

const buildTileMetrics = (dashboard = {}) => {
  const clients = dashboard.clients || {};
  const cases = dashboard.cases || {};
  const staff = dashboard.staff || {};
  const communication = dashboard.communication || {};

  return {
    courtroom: {
      value: cases.courtroom_cases,
      detail: `${formatNumber(cases.total_cases)} total cases`,
    },
    clients: {
      value: clients.total_clients,
      detail: `${formatNumber(clients.official_clients)} official · ${formatNumber(clients.prospects)} prospects`,
    },
    staff: {
      value: staff.total_staff,
      detail: `${formatNumber(staff.active_staff)} active · ${formatNumber(staff.inactive_staff)} inactive`,
    },
    revenue: {
      value: 'Open',
      detail: 'Billing workspace',
    },
    cases: {
      value: cases.total_cases,
      detail: `${formatNumber(cases.active_cases)} active · ${formatNumber(cases.closed_cases)} closed`,
    },
    ai: {
      value: 'Ready',
      detail: 'Insights workspace',
    },
    hearings: {
      value: cases.courtroom_cases,
      detail: 'Cases with court details',
    },
    notifications: {
      value: communication.announcements,
      detail: `${formatNumber(communication.threads)} active chat threads`,
    },
    tasks: {
      value: cases.pending_cases,
      detail: 'Pending case actions',
    },
    workload: {
      value: staff.active_staff,
      detail: `${formatNumber(cases.active_cases)} active cases`,
    },
    documents: {
      value: 'Open',
      detail: 'Document workspace',
    },
    activities: {
      value: cases.recent_activity,
      detail: 'Cases updated this week',
    },
    analytics: {
      value: 'Open',
      detail: 'Reports workspace',
    },
  };
};

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: dashboard, isLoading, isFetching } = useAdminDashboard();

  const displayName =
    user?.full_name?.trim() ||
    user?.profile?.full_name?.trim() ||
    user?.email ||
    '';
  const tileMetrics = useMemo(() => buildTileMetrics(dashboard), [dashboard]);

  return (
    <>
      <DashboardHero
        badge='Administrator'
        title={`Welcome back${displayName ? `, ${displayName}` : ''} 👋`}
        description='Monitor firm performance, manage staff, oversee client matters, and track legal operations from a single dashboard.'
        statusTitle='Firm Operational'
        statusDescription={isFetching ? 'Refreshing dashboard metrics.' : 'Dashboard metrics are synced with firm data.'}
      />

      <section className='mt-0'>
        <DashboardGrid>
          {adminTiles.map((tile) => {
            const Icon = tile.icon;
            const metric = tileMetrics[tile.key] || {};
            const metricValue =
              typeof metric.value === 'string'
                ? metric.value
                : formatNumber(metric.value);

            return (
              <DashboardTile
                key={tile.title}
                size={tile.size}
                variant={tile.variant}
                rounded='none'
                shadow
                onClick={() => navigate(tile.path)}
                className='group min-h-[160px] cursor-pointer p-4 sm:min-h-[180px] sm:p-5'
              >
                <div className='relative z-10 flex h-full flex-col justify-between'>
                  <div className='flex items-start justify-between gap-3 sm:gap-4'>
                    <div className='min-w-0'>
                      <p className='text-[11px] uppercase tracking-[0.16em] text-white/80 sm:text-xs sm:tracking-[0.25em]'>
                        {tile.title}
                      </p>

                      <h3 className='mt-2 break-words text-2xl font-semibold leading-tight sm:text-3xl'>
                        {isLoading ? '...' : metricValue}
                      </h3>

                      <p className='mt-2 text-sm leading-relaxed text-white/80'>
                        {tile.subtitle}
                      </p>
                    </div>

                    <div className='shrink-0 rounded-2xl bg-white/15 p-3 shadow-inner backdrop-blur-sm transition group-hover:scale-110'>
                      <Icon size={22} />
                    </div>
                  </div>

                  <div className='mt-4 flex flex-col gap-2 text-sm text-white/80 sm:flex-row sm:items-center sm:justify-between'>
                    <span className='min-w-0 break-words'>{isLoading ? 'Loading data' : metric.detail}</span>

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
