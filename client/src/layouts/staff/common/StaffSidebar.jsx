import { useContext } from 'react';
import { X, User } from 'lucide-react';

import AuthContext from '@/core/store/AuthContext';
import Brand from '@/components/ui/Brand';
import LogoutButton from '@/components/ui/LogoutButton';
import SidebarNavLink from '@/components/ui/SidebarNavlink';

const groupLinks = (items = []) =>
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

export default function StaffSidebar({ config, onClose }) {
  const { user } = useContext(AuthContext);

  const displayName =
    user?.full_name || user?.profile?.full_name || user?.email || 'User';
  const systemRole = config?.label || user?.firm_role || 'Staff';
  const bgSidebar = 'shell-surface';
  const sidebarGroups = groupLinks(config.navLinks);

  return (
    <aside className={`w-64 h-full ${bgSidebar} flex flex-col`}>
      <div className='relative py-4 px-5 border-b border-white/10'>
        <div className='flex items-center justify-center'>
          <Brand size='h-14 w-14' showText />
        </div>

        <button
          onClick={() => window.innerWidth < 1024 && onClose?.()}
          className='lg:hidden absolute top-3 right-4 p-2 rounded hover:bg-white/10'
          aria-label='Close sidebar'
        >
          <X size={20} />
        </button>
      </div>

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

      <div className='p-4 mt-auto border-t border-white/10'>
        <div className='flex items-center gap-3 mb-4'>
          <div className='w-9 h-9 rounded-full bg-white/10 flex items-center justify-center'>
            <User size={18} />
          </div>

          <div className='text-sm leading-tight min-w-0'>
            <p className='font-medium truncate'>{displayName}</p>
            <p className='text-xs text-white/70'>{systemRole}</p>
          </div>
        </div>

        <LogoutButton variant='warning' />
      </div>
    </aside>
  );
}
