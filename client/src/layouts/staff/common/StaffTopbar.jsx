import { Bell, Menu, Moon, Sun } from 'lucide-react';
import { useContext } from 'react';

import ThemeContext from '@/core/store/ThemeContext';

export default function StaffTopbar({ config, onMenuClick }) {
  const { theme, toggleTheme } = useContext(ThemeContext);

  const bgTopbar =
    theme === 'dark'
      ? 'bg-[color:var(--surface-dark)] text-white'
      : 'bg-[color:var(--brand-primary)] text-white';

  const hoverEffect =
    theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-blue-700/20';

  return (
    <header
      className={`h-16 ${bgTopbar} shadow flex items-center justify-between px-4 sm:px-6`}
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

        <button className={`relative p-2 rounded ${hoverEffect}`} aria-label='Notifications'>
          <Bell size={20} />
          <span className='absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full' />
        </button>
      </div>
    </header>
  );
}
