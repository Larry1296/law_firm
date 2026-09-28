import { useContext, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Moon, Sun, X } from 'lucide-react';

import logo from '@/assets/images/logo.png';
import ThemeContext from '@/core/store/ThemeContext';

const LINKS = [
  { id: 'features', label: 'Features' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'plans', label: 'Plans' },
  { id: 'legal-assistant', label: 'Legal assistant' },
];

const AUTH_PATHS = ['/login', '/forgot-password', '/reset-password', '/recover-account'];

export default function PublicNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const isHome = location.pathname === '/';
  const isAuthPage = AUTH_PATHS.some((path) => location.pathname.startsWith(path));

  // Arriving at /#plans from another page scrolls to that section.
  useEffect(() => {
    if (!isHome || !location.hash) return undefined;
    const timer = window.setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 50);
    return () => window.clearTimeout(timer);
  }, [isHome, location.hash]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (event) => event.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const goTo = (id) => {
    setMenuOpen(false);
    if (isHome) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    else navigate(`/#${id}`);
  };

  const linkClass = 'rounded-lg px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50';

  return (
    <>
      <nav aria-label='Main navigation' className='fixed left-1/2 top-3 z-50 w-[95%] max-w-7xl -translate-x-1/2 rounded-2xl border border-white/15 bg-[#07101e]/85 shadow-lg backdrop-blur-xl md:top-5'>
        <div className='flex items-center justify-between gap-3 px-4 py-3 md:px-5'>
          <Link to='/' className='flex shrink-0 items-center gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50'>
            <img src={logo} alt='' className='h-10 w-10 rounded-xl object-cover md:h-11 md:w-11' />
            <span className='text-lg font-extrabold tracking-wide text-white'>Sheria Master</span>
          </Link>

          {!isAuthPage && (
            <div className='hidden items-center gap-1 lg:flex'>
              {LINKS.map((link) => (
                <button key={link.id} type='button' onClick={() => goTo(link.id)} className={linkClass}>{link.label}</button>
              ))}
            </div>
          )}

          <div className='flex shrink-0 items-center gap-2'>
            <button
              type='button'
              onClick={toggleTheme}
              className='inline-flex h-10 w-10 items-center justify-center rounded-xl text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50'
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {location.pathname !== '/login' && (
              <Link to='/login' className={`${linkClass} hidden sm:inline-flex`}>Sign in</Link>
            )}
            {location.pathname !== '/register-firm' && (
              <Link
                to='/register-firm'
                className='hidden rounded-xl bg-brand-accent px-4 py-2 text-sm font-bold text-[#1a1203] transition hover:bg-[#cf9d35] focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:inline-flex'
              >
                Register your firm
              </Link>
            )}
            <button
              type='button'
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls='public-mobile-menu'
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              className='inline-flex h-10 w-10 items-center justify-center rounded-xl text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 lg:hidden'
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div id='public-mobile-menu' className='border-t border-white/10 px-4 pb-4 pt-2 lg:hidden'>
            <div className='flex flex-col gap-1'>
              {!isAuthPage && LINKS.map((link) => (
                <button key={link.id} type='button' onClick={() => goTo(link.id)} className={`${linkClass} text-left`}>{link.label}</button>
              ))}
              <Link to='/login' onClick={() => setMenuOpen(false)} className={linkClass}>Sign in</Link>
              <Link to='/register-firm' onClick={() => setMenuOpen(false)} className='mt-2 rounded-xl bg-brand-accent px-4 py-2.5 text-center text-sm font-bold text-[#1a1203]'>
                Register your firm
              </Link>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
