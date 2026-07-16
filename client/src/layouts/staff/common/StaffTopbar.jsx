import { Menu, Moon, Sun } from 'lucide-react';
import { useContext } from 'react';

import ThemeContext from '@/core/store/ThemeContext';
import NotificationBellDropdown from '@/modules/notifications/components/NotificationBellDropdown';

export default function StaffTopbar({ config, onMenuClick }) {
  const { theme, toggleTheme } = useContext(ThemeContext);

  const bgTopbar = 'shell-surface';
  const hoverEffect = 'shell-hover';

  return (
    <header
      className={`h-16 ${bgTopbar} flex items-center justify-between px-4 sm:px-6`}
    >
      <button
        onClick={onMenuClick}
        className={`lg:hidden p-2 rounded ${hoverEffect}`}
        aria-label='Open sidebar'
      >
        <Menu size={22} />
      </button>

      <h1 className='font-semibold text-base sm:text-lg'>{config.title}</h1>

      <div className='flex items-center gap-3 sm:gap-4'>
        <button
          onClick={toggleTheme}
          className={`p-2 rounded ${hoverEffect}`}
          title='Toggle Theme'
          aria-label='Toggle theme'
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <NotificationBellDropdown
          className={hoverEffect}
          fallbackPath={`${config.basePath}/notifications`}
        />
      </div>
    </header>
  );
}
