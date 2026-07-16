import {
  Bell,
  Briefcase,
  CalendarDays,
  FileText,
  MessageSquare,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import DashboardHero from '@/components/dashboard/DashboardHero';
import DashboardGrid from '@/components/dashboard/DashboardGrid';
import DashboardTile from '@/components/dashboard/DashboardTile';
import useClientDashboard from '@/modules/client/dashboard/hooks/useClientDashboard';

const portalTiles = [
  {
    key: 'consultations',
    title: 'Book Consultation',
    subtitle: 'Schedule legal consultations with the firm',
    icon: CalendarDays,
    variant: 'calendar',
    size: 'large',
    path: '/portal/consultations',
  },
  {
    key: 'documents',
    title: 'My Documents',
    subtitle: 'Upload, review, and manage legal documents',
    icon: FileText,
    variant: 'documents',
    size: 'wide',
    path: '/portal/documents',
  },
  {
    key: 'notifications',
    title: 'Notifications',
    subtitle: 'Stay informed about updates and actions',
    icon: Bell,
    variant: 'notifications',
    size: 'wide',
    path: '/portal/notifications',
  },
  {
    key: 'messages',
    title: 'Messages',
    subtitle: 'Securely communicate with the legal team',
    icon: MessageSquare,
    variant: 'messages',
    size: 'wide',
    path: '/portal/messages',
  },
  {
    key: 'requests',
    title: 'Legal Requests',
    subtitle: 'Submit and track your legal service requests',
    icon: Briefcase,
    variant: 'cases',
    size: 'wide',
    path: '/portal/intake/status',
  },
  {
    key: 'upload',
    title: 'Upload Documents',
    subtitle: 'Send files and supporting evidence securely',
    icon: Upload,
    variant: 'documents',
    size: 'wide',
    path: '/portal/documents/upload',
  },
  {
    key: 'membership',
    title: 'Membership Status',
    subtitle: 'Track onboarding, verification, and approvals',
    icon: ShieldCheck,
    variant: 'compliance',
    size: 'wide',
    path: '/portal/membership-status',
  },
];

export default function PortalDashboard() {
  const navigate = useNavigate();
  const { data, isLoading, isFetching } = useClientDashboard();
  const summary = data?.summary || {};
  const client = data?.client || {};

  const tileValue = (tile) => {
    if (tile.key === 'documents') return summary.documents ?? 0;
    if (tile.key === 'notifications') return summary.unread_notifications ?? 0;
    if (tile.key === 'membership') {
      return client.is_verified ? 'Verified' : 'Pending';
    }
    return null;
  };

  return (
    <>
      <DashboardHero
        badge='Client Portal'
        title={`Welcome back${client.full_name ? `, ${client.full_name}` : ''}`}
        description='Manage consultations, upload documents, track onboarding progress, and communicate securely with the legal team.'
        statusTitle={client.is_verified ? 'Verified' : 'Pending Review'}
        statusDescription={
          isFetching
            ? 'Refreshing your portal dashboard.'
            : 'Your onboarding and legal requests are tracked here.'
        }
      />

      <section className='mt-0'>
        <DashboardGrid>
          {portalTiles.map((tile) => {
            const Icon = tile.icon;
            const value = tileValue(tile);

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
                    <span className='min-w-0 break-words'>
                      {tile.key === 'notifications'
                        ? `${summary.unread_notifications ?? 0} unread`
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
    </>
  );
}
