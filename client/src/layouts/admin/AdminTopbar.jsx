import { Bell, Menu, User, Sun, Moon } from 'lucide-react';
import { useContext } from 'react';
import ThemeContext from '@/core/store/ThemeContext';

export default function AdminTopbar({ onMenuClick }) {
  const { theme, toggleTheme } = useContext(ThemeContext);

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
      <h1 className='font-semibold text-base sm:text-lg'>Admin Dashboard</h1>
      <div className='flex items-center gap-3 sm:gap-4'>
        {/* THEME */}
        <button onClick={toggleTheme} className={`p-2 rounded ${hoverEffect}`}>
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
