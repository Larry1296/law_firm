import { useContext, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Building2,
  CreditCard,
  Inbox,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  Moon,
  PlusCircle,
  Sun,
  Users,
  X,
} from 'lucide-react';

import logo from '@/assets/images/logo.png';
import AuthContext from '@/core/store/AuthContext';
import ThemeContext from '@/core/store/ThemeContext';

const NAV = [
  { section: 'Monitor', items: [
    { to: '/platform/overview', label: 'Overview', icon: LayoutDashboard },
    { to: '/platform/users', label: 'Users', icon: Users },
  ] },
  { section: 'Firms', items: [
    { to: '/platform/firms', label: 'Law firms', icon: Building2, end: true },
    { to: '/platform/firms/register', label: 'Register a firm', icon: PlusCircle },
    { to: '/platform/requests', label: 'Onboarding requests', icon: Inbox },
  ] },
  { section: 'Billing', items: [
    { to: '/platform/plans', label: 'Plans', icon: Layers },
    { to: '/platform/payments', label: 'Payments', icon: CreditCard },
  ] },
];

function Sidebar({ onNavigate }) {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className='flex h-full flex-col bg-slate-950 text-slate-100'>
      <div className='flex items-center gap-3 border-b border-white/10 px-5 py-5'>
        <img src={logo} alt='' className='h-10 w-10 rounded-xl object-cover' />
        <div className='min-w-0'>
          <p className='truncate font-bold'>Sheria Master</p>
          <p className='text-xs font-semibold uppercase tracking-wider text-emerald-300'>Platform console</p>
        </div>
      </div>

      <nav aria-label='Platform navigation' className='flex-1 space-y-6 overflow-y-auto px-3 py-5'>
        {NAV.map((group) => (
          <div key={group.section}>
            <p className='px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400'>{group.section}</p>
            <ul className='space-y-1'>
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                  >
                    <item.icon size={17} aria-hidden='true' />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className='border-t border-white/10 p-4'>
        <p className='truncate text-sm font-semibold'>{user?.full_name}</p>
        <p className='truncate text-xs text-slate-400'>{user?.email}</p>
        <button
          type='button'
          onClick={() => logout()}
          className='mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400'
        >
          <LogOut size={16} aria-hidden='true' /> Sign out
        </button>
      </div>
    </div>
  );
}

export default function PlatformLayout() {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <div className='flex h-screen overflow-hidden bg-background-light text-text-primary-light dark:bg-background-dark dark:text-text-primary-dark'>
      <aside className='hidden w-64 shrink-0 lg:block'>
        <Sidebar />
      </aside>

      {open && (
        <div className='fixed inset-0 z-50 lg:hidden' role='dialog' aria-modal='true' aria-label='Navigation'>
          <div className='absolute inset-0 bg-black/50' onClick={() => setOpen(false)} />
          <div className='absolute inset-y-0 left-0 w-64'>
            <Sidebar onNavigate={() => setOpen(false)} />
            <button type='button' onClick={() => setOpen(false)} aria-label='Close navigation' className='absolute right-3 top-5 rounded-lg p-1.5 text-slate-200 hover:bg-white/10'>
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <div className='flex min-w-0 flex-1 flex-col'>
        <header className='flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border-light bg-surface-light px-4 dark:border-border-dark dark:bg-surface-dark sm:px-6'>
          <button type='button' onClick={() => setOpen(true)} aria-label='Open navigation' className='rounded-lg p-2 hover:bg-background-light dark:hover:bg-background-dark lg:hidden'>
            <Menu size={20} />
          </button>
          <p className='text-sm font-semibold text-text-muted-light dark:text-text-muted-dark'>
            Platform administration
          </p>
          <button
            type='button'
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className='rounded-lg p-2 hover:bg-background-light dark:hover:bg-background-dark'
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>
        <main key={location.pathname} className='min-h-0 flex-1 overflow-y-auto'>
          <div className='mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8'>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
