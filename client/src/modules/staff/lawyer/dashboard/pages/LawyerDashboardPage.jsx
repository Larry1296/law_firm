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
import { getFirstName } from '@/core/utils/personName';
import { displayEnum } from '@/core/utils/textFormatter';
import CourtroomTodayPanel from '@/modules/courtroom/components/CourtroomTodayPanel';
import useLawyerDashboard from '@/modules/staff/lawyer/dashboard/hooks/useLawyerDashboard';
import { useLawyerAIPriorities } from '@/modules/staff/lawyer/ai/hooks/useLawyerAI';

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
    title: 'Courtroom',
    subtitle: 'Upcoming court appearances and schedules',
    icon: CalendarDays,
    variant: 'courtroom',
    size: 'wide',
    path: '/lawyer/courtroom',
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
  const aiPriorities = useLawyerAIPriorities({ sort: 'priority' });
  const summary = data?.summary || {};
  const profile = data?.lawyer || {};
  const firstName = getFirstName(profile.first_name, profile.full_name, profile.email);
  const firmRole = displayEnum(profile.firm_role || 'LAWYER');

  const tileValue = (tile) => {
    if (tile.title === 'Notifications') return summary.unread_notifications ?? 0;
    if (tile.title === 'My Cases') return summary.active_cases ?? 0;
    if (tile.title === 'Clients') return summary.clients ?? 0;
    if (tile.title === 'Courtroom') return summary.hearings ?? 0;
    if (tile.title === 'Workload') return summary.total_cases ?? 0;
    if (tile.title === 'Tasks') return summary.tasks_due ?? 0;
    if (tile.title === 'Documents') return summary.documents ?? 0;
    return null;
  };

  return (
    <>
      <DashboardHero
        badge='Advocate'
        title={`Welcome ${firmRole}${firstName ? `, ${firstName}` : ''}`}
        description='Manage assigned matters, prepare court appearances, track deadlines, and collaborate with clients.'
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

      <section aria-labelledby='ai-priorities-title' className='border-y border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark sm:p-6'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div><h2 id='ai-priorities-title' className='text-xl font-bold'>AI case priorities</h2><p className='text-sm text-text-muted-light dark:text-text-muted-dark'>Your authorized matters, ordered by explainable urgency and risk—not predicted outcome.</p></div>
          <button type='button' onClick={() => navigate('/lawyer/ai')} className='rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white'>View and filter all</button>
        </div>
        {aiPriorities.isLoading && <p role='status' className='mt-4'>Loading case priorities…</p>}
        {aiPriorities.error && <p role='alert' className='mt-4 text-red-700'>AI case priorities are unavailable or not enabled for this account.</p>}
        <div className='mt-4 grid gap-3 lg:grid-cols-3'>
          {(aiPriorities.data?.matters || []).slice(0, 3).map((matter) => <button key={matter.id} type='button' onClick={() => navigate(`/lawyer/cases/${matter.id}/ai-analysis`)} className='rounded-xl border border-border-light p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success dark:border-border-dark'><span className='text-xs font-bold'>{matter.priority} · {matter.case_number}</span><strong className='mt-1 block'>{matter.title}</strong><span className='mt-2 block text-sm'>Urgency {matter.scores.time_urgency}/100 · Preparedness {matter.scores.overall_preparedness}/100</span><span className='mt-1 block text-xs'>{matter.priority_reasons[0]}</span></button>)}
        </div>
      </section>

      <CourtroomTodayPanel className='mt-0' />

    </>
  );
}
