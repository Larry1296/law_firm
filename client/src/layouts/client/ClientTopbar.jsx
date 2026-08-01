import { Menu, Sun, Moon } from 'lucide-react';
import { useContext } from 'react';
import ThemeContext from '@/core/store/ThemeContext';
import NotificationBellDropdown from '@/modules/notifications/components/NotificationBellDropdown';

export default function ClientTopbar({ onMenuClick }) {
  const { theme, toggleTheme } = useContext(ThemeContext);

  const bgTopbar = 'shell-surface';
  const hoverEffect = 'shell-hover';

  return (
    <header
      className={`h-14 shrink-0 ${bgTopbar} flex items-center justify-between gap-2 px-2 sm:h-16 sm:px-6`}
    >
      {/* HAMBURGER (mobile only) */}
      <button
        onClick={onMenuClick}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl lg:hidden ${hoverEffect}`}
        aria-label='Open navigation menu'
      >
        <Menu size={22} />
      </button>

      <h1 className='min-w-0 flex-1 truncate px-1 text-sm font-bold sm:text-lg'>Client Dashboard</h1>

      <div className='flex shrink-0 items-center gap-1 sm:gap-3'>
        {/* THEME TOGGLE */}
        <button
          onClick={toggleTheme}
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${hoverEffect}`}
          title='Toggle Theme'
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <NotificationBellDropdown
          className={hoverEffect}
          fallbackPath='/client/notifications'
        />
      </div>
    </header>
  );
}
