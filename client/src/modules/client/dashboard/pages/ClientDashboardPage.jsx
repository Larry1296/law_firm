import {
  Briefcase,
  CalendarDays,
  FileText,
  LifeBuoy,
  MessageSquareText,
  ReceiptText,
  Settings,
  UserRound,
} from 'lucide-react';

import DashboardHero from '@/components/dashboard/DashboardHero';
import DashboardGrid from '@/components/dashboard/DashboardGrid';
import DashboardTile from '@/components/dashboard/DashboardTile';
import CourtroomTodayPanel from '@/modules/courtroom/components/CourtroomTodayPanel';
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
  const { data, isLoading, isFetching } = useClientDashboard();
  const summary = data?.summary || {};
  const client = data?.client || {};
  const firm = data?.firm || {};

  const tileValue = (tile) => {
    if (tile.key === 'cases') return summary.active_cases ?? 0;
    if (tile.key === 'hearings') return summary.upcoming_hearings ?? 0;
    if (tile.key === 'documents') return summary.documents ?? 0;
    if (tile.key === 'notifications') return summary.unread_notifications ?? 0;
    if (tile.key === 'firm') return firm.name || 'Firm';
    if (tile.key === 'messages') return summary.total_cases ?? 0;
    return null;
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
        badge='Law Firm Home'
        title={`Welcome back${client.full_name ? `, ${client.full_name}` : ''}`}
        description='Track your cases, documents, notifications, and firm communication from one place.'
        statusTitle={client.is_verified ? 'Verified Client' : 'Profile Under Review'}
        statusDescription={
          isFetching
            ? 'Refreshing your dashboard.'
            : `${summary.active_cases ?? 0} active matters are available.`
        }
      />

      <section className='mt-0'>
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
                      <h3 className='mt-2 break-words text-lg font-semibold leading-tight sm:text-xl'>
                        {isLoading
                          ? '...'
                          : value === null
                            ? tile.subtitle
                            : typeof value === 'number'
                              ? value.toLocaleString()
                              : value}
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
      />
    </>
  );
}
