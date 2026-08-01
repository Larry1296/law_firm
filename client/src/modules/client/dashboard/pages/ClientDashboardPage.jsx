import {
  ArrowUpRight,
  Briefcase,
  CalendarDays,
  ChevronDown,
  FileText,
  LifeBuoy,
  MessageSquareText,
  ReceiptText,
  Settings,
  UserRound,
} from 'lucide-react';
import { useState } from 'react';

import DashboardHero from '@/components/dashboard/DashboardHero';
import DashboardGrid from '@/components/dashboard/DashboardGrid';
import DashboardTile from '@/components/dashboard/DashboardTile';
import CourtroomTodayPanel from '@/modules/courtroom/components/CourtroomTodayPanel';
import { getFirstName } from '@/core/utils/personName';
import useClientDashboard from '@/modules/client/dashboard/hooks/useClientDashboard';
import { useNavigate } from 'react-router-dom';

const clientTiles = [
  {
    key: 'cases',
    title: 'My Matters',
    subtitle: 'Your active legal matters',
    icon: Briefcase,
    variant: 'cases',
    size: 'large',
    path: '/client/cases',
  },
  {
    key: 'hearings',
    title: 'Upcoming Hearings',
    subtitle: 'Court dates from your cases',
    icon: CalendarDays,
    variant: 'calendar',
    size: 'wide',
    path: '/client/calendar',
  },
  {
    key: 'documents',
    title: 'Documents',
    subtitle: 'Secure case files and evidence',
    icon: FileText,
    variant: 'documents',
    size: 'wide',
    path: '/client/documents',
  },
  {
    key: 'billing',
    title: 'Trust & Billing',
    subtitle: 'Invoices, payments, and balances',
    icon: ReceiptText,
    variant: 'billing',
    size: 'wide',
  },
  {
    key: 'messages',
    title: 'Messages',
    subtitle: 'Case-attached firm communication',
    icon: MessageSquareText,
    variant: 'messages',
    size: 'wide',
    path: '/client/cases',
  },
  {
    key: 'firm',
    title: 'My Firm',
    subtitle: 'Contact the firm handling your matter',
    icon: UserRound,
    variant: 'lawyerContacts',
    size: 'wide',
    path: '/client/profile',
  },
  {
    key: 'notifications',
    title: 'Case Timeline',
    subtitle: 'Unread status and case updates',
    icon: CalendarDays,
    variant: 'notifications',
    size: 'wide',
    path: '/client/notifications',
  },
  {
    key: 'support',
    title: 'Support',
    subtitle: 'Get help whenever you need it',
    icon: LifeBuoy,
    variant: 'settings',
    size: 'wide',
  },
  {
    key: 'profile',
    title: 'Profile',
    subtitle: 'Preferences, contacts, and firm details',
    icon: Settings,
    variant: 'settings',
    size: 'wide',
    path: '/client/profile',
  },
];

export default function ClientDashboardPage() {
  const navigate = useNavigate();
  const [expandedTile, setExpandedTile] = useState('cases');
  const { data, isLoading, isFetching } = useClientDashboard();
  const summary = data?.summary || {};
  const client = data?.client || {};
  const firm = data?.firm || {};
  const firstName = getFirstName(client.first_name, client.full_name, client.email);

  const tileValue = (tile) => {
    if (tile.key === 'cases') return summary.active_cases ?? 0;
    if (tile.key === 'hearings') return summary.upcoming_hearings ?? 0;
    if (tile.key === 'documents') return summary.documents ?? 0;
    if (tile.key === 'notifications') return summary.unread_notifications ?? 0;
    if (tile.key === 'firm') return firm.name || 'Firm';
    if (tile.key === 'messages') return summary.total_cases ?? 0;
    return tile.path ? 'Open' : 'Soon';
  };

  const tileDetail = (tile) => {
    if (tile.key === 'cases') {
      return `${summary.total_cases ?? 0} total · ${summary.urgent_cases ?? 0} urgent`;
    }
    if (tile.key === 'notifications') {
      return `${summary.unread_notifications ?? 0} unread`;
    }
    if (tile.key === 'messages') return 'Open a case to message the firm';
    if (!tile.path) return 'Coming soon';
    return 'Open workspace';
  };

  return (
    <>
      <DashboardHero
        compactMobile
        badge='Law Firm Home'
        title={`Welcome${firstName ? `, ${firstName}` : ''}`}
        description='Track your cases, documents, notifications, and firm communication from one place.'
        statusTitle={client.is_verified ? 'Verified Client' : 'Profile Under Review'}
        statusDescription={
          isFetching
            ? 'Refreshing your dashboard.'
            : `${summary.active_cases ?? 0} active matters are available.`
        }
      />

      <section className='px-3 pb-2 sm:px-4 lg:hidden'>
        <div className='grid grid-cols-3 gap-2 sm:gap-3'>
          {[
            { label: 'Active matters', value: summary.active_cases ?? 0 },
            { label: 'Hearings', value: summary.upcoming_hearings ?? 0 },
            { label: 'Unread', value: summary.unread_notifications ?? 0 },
          ].map((item) => (
            <div
              key={item.label}
              className='min-w-0 rounded-2xl border border-border-light bg-white/85 px-2 py-3 text-center shadow-[0_10px_30px_rgba(31,41,51,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.07] sm:px-4 sm:py-4'
            >
              <p className='text-xl font-extrabold leading-none text-[color:var(--text-primary)] sm:text-2xl'>
                {isLoading ? '…' : Number(item.value).toLocaleString()}
              </p>
              <p className='mt-2 truncate text-[10px] font-bold uppercase tracking-[0.06em] text-[color:var(--text-muted)] sm:text-xs'>
                {item.label}
              </p>
            </div>
          ))}
        </div>

        <div className='mt-4 overflow-hidden rounded-3xl border border-border-light bg-white/85 shadow-[0_18px_55px_rgba(31,41,51,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.07]'>
          <div className='border-b border-border-light px-4 py-4 dark:border-white/10'>
            <p className='text-xs font-extrabold uppercase tracking-[0.14em] text-[color:var(--brand-primary)] dark:text-blue-300'>
              Your legal workspace
            </p>
            <h2 className='mt-1 text-xl font-extrabold text-[color:var(--text-primary)]'>
              What would you like to view?
            </h2>
          </div>

          <div className='divide-y divide-border-light dark:divide-white/10'>
            {clientTiles.map((tile) => {
              const Icon = tile.icon;
              const value = tileValue(tile);
              const expanded = expandedTile === tile.key;

              return (
                <div key={tile.key}>
                  <button
                    type='button'
                    onClick={() => setExpandedTile(expanded ? null : tile.key)}
                    className='flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-brand-primary/5 focus:outline-none focus-visible:bg-brand-primary/10'
                    aria-expanded={expanded}
                    aria-controls={`client-mobile-${tile.key}`}
                  >
                    <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-primary to-blue-700 text-white shadow-md'>
                      <Icon size={20} />
                    </span>
                    <span className='min-w-0 flex-1'>
                      <span className='block truncate text-sm font-bold text-[color:var(--text-primary)] sm:text-base'>
                        {tile.title}
                      </span>
                      <span className='mt-0.5 block truncate text-xs text-[color:var(--text-muted)]'>
                        {typeof value === 'number' ? `${value.toLocaleString()} available` : value}
                      </span>
                    </span>
                    <ChevronDown
                      size={19}
                      className={`shrink-0 text-[color:var(--text-muted)] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {expanded && (
                    <div
                      id={`client-mobile-${tile.key}`}
                      className='bg-brand-primary/[0.04] px-4 pb-4 pt-1 dark:bg-white/[0.03]'
                    >
                      <div className='ml-14'>
                        <p className='text-sm leading-6 text-[color:var(--text-muted)]'>
                          {tile.subtitle}. {tileDetail(tile)}.
                        </p>
                        {tile.path ? (
                          <button
                            type='button'
                            onClick={() => navigate(tile.path)}
                            className='mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-bold text-white shadow-md transition active:scale-[0.98] sm:w-auto'
                          >
                            View {tile.title}
                            <ArrowUpRight size={16} />
                          </button>
                        ) : (
                          <span className='mt-3 inline-flex rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900 dark:bg-amber-400/15 dark:text-amber-200'>
                            This service is being prepared
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className='mt-0 hidden lg:block'>
        <DashboardGrid>
          {clientTiles.map((tile) => {
            const Icon = tile.icon;
            const value = tileValue(tile);

            return (
              <DashboardTile
                key={tile.title}
                size={tile.size}
                variant={tile.variant}
                rounded='none'
                shadow={true}
                onClick={tile.path ? () => navigate(tile.path) : undefined}
                className='group min-h-[160px] p-4 sm:min-h-[180px] sm:p-5'
              >
                <div className='relative z-10 flex h-full flex-col justify-between'>
                  <div className='flex items-start justify-between gap-3 sm:gap-4'>
                    <div className='min-w-0'>
                      <p className='text-[11px] uppercase tracking-[0.16em] text-white/80 sm:text-xs sm:tracking-[0.25em]'>
                        {tile.title}
                      </p>
                      <h3 className='mt-2 break-words text-2xl font-semibold leading-tight sm:text-3xl'>
                        {isLoading
                          ? '...'
                          : typeof value === 'number'
                            ? value.toLocaleString()
                            : value}
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
                    <span className='min-w-0 break-words'>{tileDetail(tile)}</span>
                    <span className='w-fit shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold'>
                      {tile.path ? 'Quick access' : 'Not ready'}
                    </span>
                  </div>
                </div>
              </DashboardTile>
            );
          })}
        </DashboardGrid>
      </section>

      <CourtroomTodayPanel
        title="Today's Court Access"
        emptyMessage='No courtroom link is available for your matters today.'
        className='mx-3 mb-4 mt-3 sm:mx-4 lg:mx-6 lg:mt-0'
      />
    </>
  );
}
