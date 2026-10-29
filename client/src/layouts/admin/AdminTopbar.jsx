import { Menu, Sun, Moon } from 'lucide-react';
import { useContext } from 'react';
import ThemeContext from '@/core/store/ThemeContext';
import AuthContext from '@/core/store/AuthContext';
import LockWorkspaceButton from '@/components/ui/LockWorkspaceButton';
import NotificationBellDropdown from '@/modules/notifications/components/NotificationBellDropdown';

export default function AdminTopbar({ onMenuClick }) {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { user } = useContext(AuthContext);
  const firmName = user?.firm?.name;

  const bgTopbar = 'shell-surface';
  const hoverEffect = 'shell-hover';

  return (
    <header
      className={`h-16 ${bgTopbar} flex items-center justify-between px-4 sm:px-6`}
    >
      {/* HAMBURGER */}
      <button
        onClick={onMenuClick}
        className={`lg:hidden p-2 rounded ${hoverEffect}`}
      >
        <Menu size={22} />
      </button>
      <h1 className='min-w-0 truncate font-semibold text-base sm:text-lg'>
        {firmName ? `${firmName} · Administration` : 'Admin Dashboard'}
      </h1>
      <div className='flex items-center gap-3 sm:gap-4'>
        {/* THEME */}
        <button onClick={toggleTheme} className={`p-2 rounded ${hoverEffect}`}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <LockWorkspaceButton className={`px-3 py-2 rounded ${hoverEffect}`} />
        <NotificationBellDropdown
          className={hoverEffect}
          fallbackPath='/admin/communication/notifications'
        />
      </div>
    </header>
  );
}
