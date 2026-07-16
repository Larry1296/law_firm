import { X } from 'lucide-react';
import { useContext } from 'react';
import AuthContext from '@/core/store/AuthContext';

import LogoutButton from '@/components/ui/LogoutButton';
import SidebarNavLink from '@/components/ui/SidebarNavlink';
import Brand from '@/components/ui/Brand';

import {
  LayoutDashboard,
  Briefcase,
  Calendar,
  FileText,
  MessageSquare,
  Bell,
  Brain,
  Search,
  Gavel,
  BookOpen,
  ListTodo,
  CheckCircle,
  User,
  Shield,
  FolderOpen,
} from 'lucide-react';

//* ================= LAWYER NAVIGATION ================= */
const links = [
  {
    name: 'Cases',
    path: '/lawyer/cases',
    icon: Briefcase,
    section: 'Cases',
  },

  {
    name: 'Calendar',
    path: '/lawyer/calendar',
    icon: Calendar,
    section: 'Cases',
  },

  {
    name: 'Hearings',
    path: '/lawyer/hearings',
    icon: Gavel,
    section: 'Cases',
  },

  {
    name: 'Tasks',
    path: '/lawyer/tasks',
    icon: ListTodo,
    section: 'Work Management',
  },
  {
    name: 'Approvals',
    path: '/lawyer/approvals',
    icon: CheckCircle,
    section: 'Work Management',
  },

  {
    name: 'Documents',
    path: '/lawyer/documents',
    icon: FileText,
    section: 'Documents',
  },

  // COMMUNICATION
  {
    name: 'Staff Chat',
    path: '/lawyer/chat',
    icon: MessageSquare,
    section: 'Communication',
  },
  {
    name: 'Notifications',
    path: '/lawyer/notifications',
    icon: Bell,
    section: 'Communication',
  },

  {
    name: 'AI Assistant',
    path: '/lawyer/ai',
    icon: Brain,
    section: 'Research & AI',
  },
  {
    name: 'Research AI',
    path: '/lawyer/research-ai',
    icon: Search,
    section: 'Research & AI',
  },
  {
    name: 'Legal Research',
    path: '/lawyer/research',
    icon: BookOpen,
    section: 'Research & AI',
  },
  {
    name: 'Authorities',
    path: '/lawyer/authorities',
    icon: FolderOpen,
    section: 'Research & AI',
  },

  {
    name: 'Dashboard',
    path: '/lawyer/dashboard',
    icon: LayoutDashboard,
    end: true,
    section: 'Overview',
  },

  {
    name: 'Profile',
    path: '/lawyer/profile',
    icon: User,
    section: 'Account',
  },
  {
    name: 'Security',
    path: '/lawyer/security',
    icon: Shield,
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

export default function LawyerSidebar({ onClose }) {
  const { user } = useContext(AuthContext);
  const displayName = user?.full_name || user?.profile?.full_name || user?.email || 'User';
  const systemRole = user?.role || 'User';

  const bgSidebar = 'shell-surface';
  const sidebarGroups = groupLinks(links);

  return (
    <aside className={`w-64 h-full ${bgSidebar} flex flex-col`}>
      {/* HEADER */}
      <div className='relative py-4 px-5 border-b border-white/10'>
        <div className='flex items-center justify-center'>
          <Brand size='h-14 w-14' showText />
        </div>

        <button
          onClick={() => window.innerWidth < 1024 && onClose?.()}
          className='lg:hidden absolute top-3 right-4 p-2 rounded hover:bg-white/10'
        >
          <X size={20} />
        </button>
      </div>

      {/* NAV */}
      <nav className='sidebar-scrollbar h-full flex-1 p-3 overflow-y-auto'>
        <div className='space-y-5'>
          {sidebarGroups.map((group) => (
            <div key={group.section}>
              <p className='px-3 mb-2 text-xs uppercase tracking-widest text-white/50 font-semibold'>
                {group.section}
              </p>
              <div className='space-y-1'>
                {group.items.map((link) => {
                  const Icon = link.icon;

                  return (
                    <SidebarNavLink
                      key={link.name}
                      to={link.path}
                      end={link.end}
                      icon={<Icon size={18} />}
                      onClick={onClose}
                    >
                      {link.name}
                    </SidebarNavLink>
                  );
                })}
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
