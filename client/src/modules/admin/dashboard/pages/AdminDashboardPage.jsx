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

import { useNavigate } from 'react-router-dom';

import useAuth from '@/core/hooks/useAuth';
import DashboardHero from '@/components/dashboard/DashboardHero';
import DashboardGrid from '@/components/dashboard/DashboardGrid';
import DashboardTile from '@/components/dashboard/DashboardTile';

const adminTiles = [
  {
    title: 'Courtroom Access',
    subtitle: 'Manage courtroom schedules and permissions',
    icon: Gavel,
    variant: 'courtroom',
    size: 'large',
    path: '/admin/courtrooms',
  },
  {
    title: 'Clients',
    subtitle: 'Manage all client records and accounts',
    icon: Users,
    variant: 'clients',
    size: 'wide',
    path: '/admin/clients',
  },
  {
    title: 'Staff',
    subtitle: 'Lawyers, experts, and support personnel',
    icon: UserCog,
    variant: 'staff',
    size: 'wide',
    path: '/admin/staff',
  },
  {
    title: 'Revenue',
    subtitle: 'Track payments, invoices, and firm earnings',
    icon: Wallet,
    variant: 'revenue',
    size: 'wide',
    path: '/admin/revenue',
  },
  {
    title: 'Cases Overview',
    subtitle: 'Monitor all active and archived matters',
    icon: Briefcase,
    variant: 'cases',
    size: 'wide',
    path: '/admin/cases',
  },
  {
    title: 'AI Insights',
    subtitle: 'Legal intelligence and recommendations',
    icon: Brain,
    variant: 'ai',
    size: 'wide',
    path: '/admin/ai-insights',
  },
  {
    title: 'Hearings',
    subtitle: 'Upcoming court appearances and schedules',
    icon: CalendarDays,
    variant: 'hearings',
    size: 'wide',
    path: '/admin/hearings',
  },
  {
    title: 'Notifications',
    subtitle: 'Firm-wide alerts and updates',
    icon: Bell,
    variant: 'notifications',
    size: 'wide',
    path: '/admin/notifications',
  },
  {
    title: 'Tasks',
    subtitle: 'Administrative actions requiring attention',
    icon: CheckSquare,
    variant: 'tasks',
    size: 'wide',
    path: '/admin/tasks',
  },
  {
    title: 'Workload',
    subtitle: 'Monitor assignments and team capacity',
    icon: Activity,
    variant: 'staff',
    size: 'wide',
    path: '/admin/workload',
  },
  {
    title: 'Documents',
    subtitle: 'Firm files, evidence, and legal records',
    icon: FileText,
    variant: 'documents',
    size: 'wide',
    path: '/admin/documents',
  },
  {
    title: 'Activities',
    subtitle: 'Recent activity across the platform',
    icon: Activity,
    variant: 'activities',
    size: 'wide',
    path: '/admin/activities',
  },
  {
    title: 'Analytics',
    subtitle: 'Performance reports and business metrics',
    icon: BarChart3,
    variant: 'analytics',
    size: 'wide',
    path: '/admin/analytics',
  },
];

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const displayName =
    user?.full_name?.trim() ||
    user?.profile?.full_name?.trim() ||
    user?.email ||
    '';

  return (
    <>
      <DashboardHero
        badge='Administrator'
        title={`Welcome back${displayName ? `, ${displayName}` : ''} 👋`}
        description='Monitor firm performance, manage staff, oversee client matters, and track legal operations from a single dashboard.'
        statusTitle='Firm Operational'
        statusDescription='All systems are running normally.'
      />

      <section className='mt-4'>
        <DashboardGrid>
          {adminTiles.map((tile) => {
            const Icon = tile.icon;

            return (
              <DashboardTile
                key={tile.title}
                size={tile.size}
                variant={tile.variant}
                rounded='none'
                shadow
                onClick={() => navigate(tile.path)}
                className='group min-h-[180px] cursor-pointer p-5'
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
