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
    path: '/lawyer/clients',
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
    path: '/lawyer/workload',
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
    path: '/lawyer/ai-insights',
  },
  {
    title: 'Recent Activity',
    subtitle: 'Latest case and client activity',
    icon: Activity,
    variant: 'activities',
    size: 'wide',
    path: '/lawyer/activity',
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

  return (
    <>
      <DashboardHero
        badge='Advocate'
        title='Welcome back, John 👋'
        description='Manage assigned matters, prepare hearings, track deadlines, and collaborate with clients.'
        statusTitle='Practice Active'
        statusDescription='You have 3 upcoming deadlines this week.'
      />

      <section className='mt-4'>
        <DashboardGrid>
          {lawyerTiles.map((tile) => {
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
