import { X } from 'lucide-react';
import { useContext } from 'react';

import AuthContext from '@/core/store/AuthContext';
import { User } from 'lucide-react';

import LogoutButton from '@/components/ui/LogoutButton';
import SidebarNavLink from '@/components/ui/SidebarNavlink';
import Brand from '@/components/ui/Brand';

import { adminSidebarLinks } from '@/modules/admin/config/adminSidebarLink';

const groupLinks = (links) =>
  links.reduce((groups, link) => {
    const section = link.section || 'Main';
    const existing = groups.find((group) => group.section === section);
    if (existing) {
      existing.items.push(link);
    } else {
      groups.push({ section, items: [link] });
    }
    return groups;
  }, []);

export default function AdminSidebar({ onClose }) {
  const { user } = useContext(AuthContext);
  const displayName = user?.full_name || user?.profile?.full_name || user?.email || 'User';
  const systemRole = user?.role || 'User';

  const bgSidebar = 'shell-surface';

  const handleClose = () => {
    if (window.innerWidth < 1024) onClose?.();
  };
  const isFirmOwner = Boolean(user?.is_firm_owner);
  const visibleLinks = adminSidebarLinks.filter(
    (link) => !link.ownerOnly || isFirmOwner,
  );
  const sidebarGroups = groupLinks(visibleLinks);

  return (
    <aside className={`w-64 h-full ${bgSidebar} flex flex-col`}>
      {/* HEADER */}
      <div className='relative py-4 px-5 border-b border-white/10'>
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

      {/* NAV */}
      <nav className='sidebar-scrollbar h-full flex-1 p-3 overflow-y-auto'>
        <div className='space-y-5'>
          {sidebarGroups.map((group) => (
            <div key={group.section}>
              <p className='px-3 mb-2 text-xs uppercase tracking-widest text-white/50 font-semibold'>
                {group.section}
              </p>
              <div className='space-y-1'>
                {group.items.map(({ name, path, icon: Icon, end }) => (
                  <SidebarNavLink
                    key={name}
                    to={path}
                    end={end}
                    icon={<Icon size={18} />}
                    onClick={handleClose}
                  >
                    {name}
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
