import { useContext, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Moon, Sun, X } from 'lucide-react';

import logo from '@/assets/images/logo.png';
import ThemeContext from '@/core/store/ThemeContext';

const LINKS = [
  { id: 'features', label: 'Features' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'plans', label: 'Plans' },
  { id: 'legal-assistant', label: 'Ask a question' },
];

const AUTH_PATHS = ['/login', '/forgot-password', '/reset-password', '/recover-account', '/register-firm'];

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

  const linkClass = 'whitespace-nowrap rounded-lg px-3 py-2.5 text-base font-semibold text-white/90 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50';

  return (
    <>
      <nav aria-label='Main navigation' className='fixed left-1/2 top-3 z-50 w-[96%] max-w-[1600px] -translate-x-1/2 rounded-2xl border border-white/15 bg-[#07101e]/85 shadow-lg backdrop-blur-xl md:top-5'>
        <div className='flex items-center justify-between gap-3 px-4 py-3 md:px-8 md:py-4'>
          <Link to='/' className='flex shrink-0 items-center gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50'>
            <img src={logo} alt='' className='h-12 w-12 object-contain md:h-16 md:w-16' />
            <span className='text-xl font-extrabold tracking-wide text-white md:text-2xl'>Sheria Master</span>
          </Link>

          {!isAuthPage && (
            <div className='hidden items-center gap-2 xl:flex'>
              {LINKS.map((link) => (
                <button key={link.id} type='button' onClick={() => goTo(link.id)} className={linkClass}>{link.label}</button>
              ))}
            </div>
          )}

          <div className='flex shrink-0 items-center gap-3'>
            <button
              type='button'
              onClick={toggleTheme}
              className='inline-flex h-12 w-12 items-center justify-center rounded-xl text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50'
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
            </button>
            {location.pathname !== '/login' && (
              <Link to='/login' className={`${linkClass} hidden sm:inline-flex`}>Sign in</Link>
            )}
            {location.pathname !== '/register-firm' && (
              <Link
                to='/register-firm'
                className='hidden whitespace-nowrap rounded-xl bg-brand-accent px-6 py-3 text-base font-bold text-[#1a1203] transition hover:bg-[#cf9d35] focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:inline-flex'
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
              className='inline-flex h-12 w-12 items-center justify-center rounded-xl text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 xl:hidden'
            >
              {menuOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div id='public-mobile-menu' className='border-t border-white/10 px-4 pb-4 pt-2 xl:hidden'>
            <div className='flex flex-col gap-1'>
              {!isAuthPage && LINKS.map((link) => (
                <button key={link.id} type='button' onClick={() => goTo(link.id)} className={`${linkClass} text-left`}>{link.label}</button>
              ))}
              <Link to='/login' onClick={() => setMenuOpen(false)} className={linkClass}>Sign in</Link>
              <Link to='/register-firm' onClick={() => setMenuOpen(false)} className='mt-2 rounded-xl bg-brand-accent px-4 py-3 text-center text-base font-bold text-[#1a1203]'>
                Register your firm
              </Link>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
