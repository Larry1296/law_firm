import {
  X,
  LayoutDashboard,
  Calendar,
  FileText,
  MessageSquare,
  Bell,
  User,
  ClipboardList,
  Upload,
  LifeBuoy,
  Briefcase,
  ShieldCheck,
} from 'lucide-react';

import { useContext } from 'react';
import AuthContext from '@/core/store/AuthContext';

import LogoutButton from '@/components/ui/LogoutButton';
import SidebarNavLink from '@/components/ui/SidebarNavlink';
import Brand from '@/components/ui/Brand';
import useUnreadNotifications from '@/modules/notifications/hooks/useUnreadNotifications';

/* =========================================================
   PROSPECT NAVIGATION
========================================================= */

const links = [
  {
    section: 'Onboarding',
    items: [
      {
        name: 'Become a Client',
        path: '/portal/become-client',
        icon: <Briefcase size={18} />,
      },
      {
        name: 'Membership Status',
        path: '/portal/membership-status',
        icon: <ShieldCheck size={18} />,
      },
    ],
  },

  {
    section: 'Main',
    items: [
      {
        name: 'Dashboard',
        path: '/portal/dashboard',
        icon: <LayoutDashboard size={18} />,
        end: true,
      },
      {
        name: 'Consultations',
        path: '/portal/consultations',
        icon: <Calendar size={18} />,
      },
      {
        name: 'Legal Requests',
        path: '/portal/intake',
        icon: <ClipboardList size={18} />,
      },
    ],
  },

  {
    section: 'Documents',
    items: [
      {
        name: 'My Documents',
        path: '/portal/documents',
        icon: <FileText size={18} />,
      },
      {
        name: 'Upload Documents',
        path: '/portal/documents/upload',
        icon: <Upload size={18} />,
      },
    ],
  },

  {
    section: 'Communication',
    items: [
      {
        name: 'Messages',
        path: '/portal/messages',
        icon: <MessageSquare size={18} />,
      },
      {
        name: 'Notifications',
        path: '/portal/notifications',
        icon: <Bell size={18} />,
      },
      {
        name: 'Support',
        path: '/portal/support',
        icon: <LifeBuoy size={18} />,
      },
    ],
  },

  {
    section: 'Account',
    items: [
      {
        name: 'Profile',
        path: '/portal/profile',
        icon: <User size={18} />,
      },
    ],
  },
];

export default function ClientSidebar({ onClose }) {
  const { user } = useContext(AuthContext);
  const { data: notificationData } = useUnreadNotifications();
  const unreadCount = notificationData?.unread_count ?? 0;
  const displayName = user?.full_name || user?.profile?.full_name || user?.email || 'User';
  const systemRole = user?.role || 'User';

  const bgSidebar = 'shell-surface';

  return (
    <aside className={`w-64 h-full ${bgSidebar} flex flex-col`}>
      {/* =========================================================
          HEADER
      ========================================================= */}
      <div className='relative py-3 px-5 border-b border-white/10'>
        <div className='flex items-center justify-center'>
          <Brand size='h-14 w-14' showText />
        </div>

        {/* MOBILE CLOSE */}
        <button
          onClick={() => window.innerWidth < 1024 && onClose?.()}
          className='lg:hidden absolute top-3 right-4 p-2 rounded hover:bg-white/10'
        >
          <X size={20} />
        </button>
      </div>

      {/* =========================================================
          NAVIGATION
      ========================================================= */}
      <nav className='sidebar-scrollbar h-full flex-1 p-3 overflow-y-auto'>
        <div className='space-y-6'>
          {links.map((group) => (
            <div key={group.section}>
              {/* SECTION TITLE */}
              <p className='px-3 mb-2 text-xs uppercase tracking-widest text-white/50 font-semibold'>
                {group.section}
              </p>

              {/* SECTION LINKS */}
              <div className='space-y-1'>
                {group.items.map((link) => (
                  <SidebarNavLink
                    key={link.name}
                    to={link.path}
                    end={link.end}
                    icon={link.icon}
                    onClick={onClose}
                  >
                    <span className='flex w-full items-center justify-between gap-3'>
                      <span>{link.name}</span>
                      {link.name === 'Notifications' && unreadCount > 0 && (
                        <span className='rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white'>
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </span>
                  </SidebarNavLink>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* =========================================================
          FOOTER
      ========================================================= */}
      <div className='p-4 mt-auto border-t border-white/10'>
        {/* USER INFO (ALL SCREENS) */}
        <div className='flex items-center gap-3 mb-4'>
          <div className='w-9 h-9 rounded-full bg-white/10 flex items-center justify-center'>
            <User size={18} />
          </div>

          <div className='text-sm leading-tight'>
            <p className='font-medium'>{displayName}</p>
            <p className='text-xs text-white/70'>{systemRole}</p>
          </div>
        </div>

        {/* LOGOUT */}
        <LogoutButton variant='warning' />
      </div>
    </aside>
  );
}
