import { Bell, Menu, User, Sun, Moon } from 'lucide-react';
import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeContext from '@/core/store/ThemeContext';
import useUnreadNotifications from '@/modules/notifications/hooks/useUnreadNotifications';

export default function LawyerTopbar({ onMenuClick }) {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const { data } = useUnreadNotifications();
  const unreadCount = data?.unread_count ?? 0;

  const bgTopbar = 'shell-surface';
  const hoverEffect = 'shell-hover';

  return (
    <header
      className={`h-16 ${bgTopbar} flex items-center justify-between px-4 sm:px-6`}
    >
      {/* HAMBURGER (mobile only) */}
      <button
        onClick={onMenuClick}
        className={`lg:hidden p-2 rounded ${hoverEffect}`}
      >
        <Menu size={22} />
      </button>

      <h1 className='font-semibold text-base sm:text-lg'>Lawyer Dashboard</h1>

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
        <button
          onClick={() => navigate('/lawyer/notifications')}
          className={`relative p-2 rounded ${hoverEffect}`}
          aria-label='Notifications'
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className='absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-[10px] font-semibold text-white flex items-center justify-center'>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
