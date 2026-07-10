import { X } from 'lucide-react';
import { useContext } from 'react';
import AuthContext from '@/core/store/AuthContext';

import ThemeContext from '@/core/store/ThemeContext';
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
    name: 'Dashboard',
    path: '/lawyer/dashboard',
    icon: LayoutDashboard,
    end: true,
  },

  // CASE MANAGEMENT
  {
    name: 'Cases',
    path: '/lawyer/cases',
    icon: Briefcase,
  },

  // CALENDAR
  {
    name: 'Calendar',
    path: '/lawyer/calendar',
    icon: Calendar,
  },

  // AI TOOLS
  {
    name: 'AI Assistant',
    path: '/lawyer/ai',
    icon: Brain,
  },
  {
    name: 'Research AI',
    path: '/lawyer/research-ai',
    icon: Search,
  },

  // DOCUMENTS
  {
    name: 'Documents',
    path: '/lawyer/documents',
    icon: FileText,
  },

  // COMMUNICATION
  {
    name: 'Staff Chat',
    path: '/lawyer/chat',
    icon: MessageSquare,
  },
  {
    name: 'Notifications',
    path: '/lawyer/notifications',
    icon: Bell,
  },

  // HEARINGS
  {
    name: 'Hearings',
    path: '/lawyer/hearings',
    icon: Gavel,
  },

  // RESEARCH & LEGAL REFERENCES
  {
    name: 'Legal Research',
    path: '/lawyer/research',
    icon: BookOpen,
  },
  {
    name: 'Authorities',
    path: '/lawyer/authorities',
    icon: FolderOpen,
  },

  // TASK MANAGEMENT
  {
    name: 'Tasks',
    path: '/lawyer/tasks',
    icon: ListTodo,
  },
  {
    name: 'Approvals',
    path: '/lawyer/approvals',
    icon: CheckCircle,
  },

  // PROFILE & SECURITY
  {
    name: 'Profile',
    path: '/lawyer/profile',
    icon: User,
  },
  {
    name: 'Security',
    path: '/lawyer/security',
    icon: Shield,
  },
];

export default function LawyerSidebar({ onClose }) {
  const { theme } = useContext(ThemeContext);
  const { user } = useContext(AuthContext);
  const displayName = user?.full_name || user?.profile?.full_name || user?.email || 'User';
  const systemRole = user?.role || 'User';

  const isDark = theme === 'dark';

  const bgSidebar = isDark
    ? 'bg-[color:var(--surface-dark)] text-white'
    : 'bg-[color:var(--brand-primary)] text-white';

  return (
    <aside className={`w-64 h-full ${bgSidebar} flex flex-col shadow-2xl`}>
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
      <nav className='sidebar-scrollbar h-full flex-1 p-3 space-y-2 overflow-y-auto'>
        {links.map((link) => {
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
