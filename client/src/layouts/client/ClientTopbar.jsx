import { Bell, Menu, User, Sun, Moon } from 'lucide-react';
import { useContext } from 'react';
import ThemeContext from '@/core/store/ThemeContext';

export default function ClientTopbar({ onMenuClick }) {
  const { theme, toggleTheme } = useContext(ThemeContext);

  // Topbar background matches sidebar
  const bgTopbar =
    theme === 'dark'
      ? 'bg-[color:var(--surface-dark)] text-white'
      : 'bg-[color:var(--brand-primary)] text-white';

  // Hover effect for buttons
  const hoverEffect =
    theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-blue-700/20';

  return (
    <header
      className={`h-16 ${bgTopbar} shadow flex items-center justify-between px-4 sm:px-6`}
    >
      {/* HAMBURGER (mobile only) */}
      <button
        onClick={onMenuClick}
        className={`lg:hidden p-2 rounded ${hoverEffect}`}
      >
        <Menu size={22} />
      </button>

      <h1 className='font-semibold text-base sm:text-lg'>Client Dashboard</h1>

      <div className='flex items-center gap-3 sm:gap-4'>
        {/* THEME TOGGLE */}
        <button
          onClick={toggleTheme}
          className={`p-2 rounded ${hoverEffect}`}
          title='Toggle Theme'
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* NOTIFICATIONS */}
        <button className={`relative p-2 rounded ${hoverEffect}`}>
          <Bell size={20} />
          <span className='absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full'></span>
        </button>
      </div>
    </header>
  );
}
