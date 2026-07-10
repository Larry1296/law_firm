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

const portalTiles = [
  {
    title: 'Book Consultation',
    subtitle: 'Schedule legal consultations with the firm',
    icon: CalendarDays,
    variant: 'calendar',
    size: 'large',
    path: '/portal/consultations',
  },
  {
    title: 'My Documents',
    subtitle: 'Upload, review, and manage legal documents',
    icon: FileText,
    variant: 'documents',
    size: 'wide',
    path: '/portal/documents',
  },
  {
    title: 'Notifications',
    subtitle: 'Stay informed about updates and actions',
    icon: Bell,
    variant: 'notifications',
    size: 'wide',
    path: '/portal/notifications',
  },
  {
    title: 'Messages',
    subtitle: 'Securely communicate with the legal team',
    icon: MessageSquare,
    variant: 'messages',
    size: 'wide',
    path: '/portal/messages',
  },
  {
    title: 'Legal Requests',
    subtitle: 'Submit and track your legal service requests',
    icon: Briefcase,
    variant: 'cases',
    size: 'wide',
    path: '/portal/requests',
  },
  {
    title: 'Upload Documents',
    subtitle: 'Send files and supporting evidence securely',
    icon: Upload,
    variant: 'documents',
    size: 'wide',
    path: '/portal/upload',
  },
  {
    title: 'Membership Status',
    subtitle: 'Track onboarding, verification, and approvals',
    icon: ShieldCheck,
    variant: 'compliance',
    size: 'wide',
    path: '/portal/membership',
  },
];

export default function PortalDashboard() {
  const navigate = useNavigate();

  return (
    <>
      <DashboardHero
        badge='Client Portal'
        title='Welcome Back 👋'
        description='Manage consultations, upload documents, track onboarding progress, and communicate securely with the legal team.'
        statusTitle='Pending Review'
        statusDescription='Your onboarding request is currently under review by the firm.'
      />

      <section className='mt-4'>
        <DashboardGrid>
          {portalTiles.map((tile) => {
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
