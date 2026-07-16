import { useContext } from 'react';
import AuthContext from '@/core/store/AuthContext';
import {
  X,
  LayoutDashboard,
  User,
  Users,
  FileText,
  Calendar,
  Briefcase,
  Bell,
} from 'lucide-react';
import LogoutButton from '@/components/ui/LogoutButton';
import SidebarNavLink from '@/components/ui/SidebarNavlink';
import Brand from '@/components/ui/Brand';
import useUnreadNotifications from '@/modules/notifications/hooks/useUnreadNotifications';

const links = [
  {
    name: 'Cases',
    path: '/client/cases',
    icon: <Briefcase size={18} />,
    section: 'Cases',
  },
  {
    name: 'Calendar',
    path: '/client/calendar',
    icon: <Calendar size={18} />,
    section: 'Cases',
  },
  {
    name: 'Documents',
    path: '/client/documents',
    icon: <FileText size={18} />,
    section: 'Documents',
  },
  {
    name: 'Notifications',
    path: '/client/notifications',
    icon: <Bell size={18} />,
    section: 'Communication',
  },
  {
    name: 'Dashboard',
    path: '/client/dashboard',
    icon: <LayoutDashboard size={18} />,
    end: true,
    section: 'Overview',
  },
  {
    name: 'Profile',
    path: '/client/profile',
    icon: <Users size={18} />,
    section: 'Account',
  },
];

const groupLinks = (items) =>
  items.reduce((groups, link) => {
    const section = link.section || 'Main';
    const existing = groups.find((group) => group.section === section);
    if (existing) {
      existing.items.push(link);
    } else {
      groups.push({ section, items: [link] });
    }
    return groups;
  }, []);

export default function ClientSidebar({ onClose }) {
  const { user } = useContext(AuthContext);
  const { data: notificationData } = useUnreadNotifications();
  const unreadCount = notificationData?.unread_count ?? 0;
  const displayName = user?.full_name || user?.profile?.full_name || user?.email || 'User';
  const systemRole = user?.role || 'User';

  const bgSidebar = 'shell-surface';
  const sidebarGroups = groupLinks(links);

  const handleClose = () => {
    if (window.innerWidth < 1024) {
      onClose?.();
    }
  };

  return (
    <aside className={`w-64 h-full flex flex-col ${bgSidebar}`}>
      {/* HEADER */}
      <div className='relative py-3 px-5 border-b border-white/10'>
        <div className='flex items-center justify-center'>
          <Brand size='h-14 w-14' showText />
        </div>

        <button
          onClick={handleClose}
          className='lg:hidden absolute top-3 right-4 p-2 rounded hover:bg-white/10'
        >
          <X size={20} />
        </button>
      </div>

      {/* NAVIGATION */}
      <nav className='sidebar-scrollbar flex-1 p-3 overflow-y-auto'>
        <div className='space-y-5'>
          {sidebarGroups.map((group) => (
            <div key={group.section}>
              <p className='px-3 mb-2 text-xs uppercase tracking-widest text-white/50 font-semibold'>
                {group.section}
              </p>
              <div className='space-y-1'>
                {group.items.map((link) => (
                  <SidebarNavLink
                    key={link.name}
                    to={link.path}
                    end={link.end}
                    icon={link.icon}
                    onClick={handleClose}
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

      {/* FOOTER */}
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
