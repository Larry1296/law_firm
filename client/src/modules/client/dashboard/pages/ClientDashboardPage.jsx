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

const clientTiles = [
  {
    title: 'My Matters',
    subtitle: '12 active cases and 4 urgent matters',
    icon: Briefcase,
    variant: 'cases',
    size: 'large',
  },
  {
    title: 'Upcoming Hearings',
    subtitle: '3 sessions this week',
    icon: CalendarDays,
    variant: 'calendar',
    size: 'wide',
  },
  {
    title: 'Documents',
    subtitle: 'Secure case files and evidence',
    icon: FileText,
    variant: 'documents',
    size: 'wide',
  },
  {
    title: 'Trust & Billing',
    subtitle: 'Invoices, payments, and balances',
    icon: ReceiptText,
    variant: 'billing',
    size: 'wide',
  },
  {
    title: 'Messages',
    subtitle: 'Updates from your lawyer and staff',
    icon: MessageSquareText,
    variant: 'messages',
    size: 'wide',
  },
  {
    title: 'My Lawyer',
    subtitle: 'Contact your assigned legal team',
    icon: UserRound,
    variant: 'lawyerContacts',
    size: 'wide',
  },
  {
    title: 'Case Timeline',
    subtitle: 'Milestones, deadlines, and next steps',
    icon: CalendarDays,
    variant: 'notifications',
    size: 'wide',
  },
  {
    title: 'Support',
    subtitle: 'Get help whenever you need it',
    icon: LifeBuoy,
    variant: 'settings',
    size: 'wide',
  },
  {
    title: 'Profile',
    subtitle: 'Preferences, contacts, and firm details',
    icon: Settings,
    variant: 'settings',
    size: 'wide',
  },
];

export default function ClientDashboardPage() {
  return (
    <>
      <DashboardHero
        badge='Law Firm Home'
        title='Welcome back, John 👋'
        description='A bright, tile-based home screen for your legal workspace—quick access to files, cases, billing, and team updates.'
        statusTitle='Cases Active'
        statusDescription='Your legal matters are being actively managed and reviewed in real time.'
      />

      <section className='mt-4'>
        <DashboardGrid>
          {clientTiles.map((tile) => {
            const Icon = tile.icon;

            return (
              <DashboardTile
                key={tile.title}
                size={tile.size}
                variant={tile.variant}
                rounded='none'
                shadow={true}
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
