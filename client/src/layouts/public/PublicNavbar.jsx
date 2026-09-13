import { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import logo from '@/assets/images/logo.png';
import ThemeContext from '@/core/store/ThemeContext';

const links = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'services', label: 'Services' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'features', label: 'Features' },
  { id: 'testimonials', label: 'Reviews' },
  { id: 'contact', label: 'Contact' },
];

export default function PublicNavbar() {
  const location = useLocation();
  const { theme, toggleTheme } = useContext(ThemeContext);

  const isAuthPage = [
    '/login',
    '/forgot-password',
    '/reset-password',
  ].includes(location.pathname);

  const [active, setActive] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);

  // Track active section while scrolling
  useEffect(() => {
    const handleScroll = () => {
      let current = 'home';

      links.forEach((section) => {
        const el = document.getElementById(section.id);
        if (!el) return;

        const rect = el.getBoundingClientRect();

        if (rect.top <= 200 && rect.bottom >= 200) {
          current = section.id;
        }
      });

      setActive(current);

      if (menuOpen) setMenuOpen(false);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [menuOpen]);

  const handleScrollTo = (id) => {
    const el = document.getElementById(id);

    if (el) {
      window.scrollTo({
        top: el.offsetTop - 120,
        behavior: 'smooth',
      });
    }

    setMenuOpen(false);
  };

  return (
    <>
      {/* Navbar */}
      <nav aria-label='Main navigation' className='fixed top-3 md:top-5 left-1/2 -translate-x-1/2 z-50 w-[95%] md:w-[92%] rounded-2xl shell-surface border border-white/20 backdrop-blur-xl public-navbar-shell'>
        <div
          className='
            flex items-center justify-between
            gap-3
            px-4 md:px-6 py-4
            rounded-2xl
          '
        >
          {/* Logo */}
          <div className='flex shrink-0 items-center gap-3'>
            <img
              src={logo}
              alt='Sheria Desk Logo'
              className='h-14 w-14 md:h-16 md:w-16 rounded-2xl object-cover border border-white/20'
            />

            <span className='hidden sm:inline xl:hidden 2xl:inline whitespace-nowrap text-white font-extrabold text-lg tracking-wide'>
              Sheria Master
            </span>
          </div>

          {/* Desktop Navigation */}
          {!isAuthPage && (
            <div className='hidden xl:flex min-w-0 items-center gap-2 2xl:gap-3'>
              {links.map((link) => (
                <div key={link.id} className='relative group'>
                  <button
                    type='button'
                    onClick={() => handleScrollTo(link.id)}
                    aria-current={active === link.id ? 'location' : undefined}
                    className='whitespace-nowrap rounded-xl px-3 py-2 text-sm 2xl:text-base text-white font-bold transition-colors hover:bg-white/10 hover:text-[color:var(--brand-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40'
                  >
                    {link.label}
                  </button>

                  {/* Active underline */}
                  <span
                    className={`
                      absolute left-0 -bottom-1 h-[2px] w-full
                      bg-[color:var(--brand-accent)]
                      transition-transform duration-300
                      ${active === link.id ? 'scale-x-100' : 'scale-x-0'}
                    `}
                  />
                </div>
              ))}
            </div>
          )}

          <div className='flex shrink-0 items-center gap-2 sm:gap-3'>
            <button
              type='button'
              onClick={toggleTheme}
              className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white shadow-sm transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40'
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
            >
              {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </button>

            {/* Hamburger Menu */}
            {!isAuthPage && (
              <button
                type='button'
                onClick={() => setMenuOpen(!menuOpen)}
                aria-expanded={menuOpen}
                aria-controls='public-mobile-menu'
                className='xl:hidden flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40'
                aria-label='Toggle menu'
              >
                <span
                  className={`w-7 h-0.5 bg-white rounded-full transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`}
                />
                <span
                  className={`w-7 h-0.5 bg-white rounded-full transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`}
                />
                <span
                  className={`w-7 h-0.5 bg-white rounded-full transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`}
                />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Full-screen navigation, with room for the fixed navbar above it. */}
      {!isAuthPage && menuOpen && (
        <div
          id='public-mobile-menu'
          className='fixed inset-0 z-40 xl:hidden overflow-y-auto shell-surface'
          onKeyDown={(event) => {
            if (event.key === 'Escape') setMenuOpen(false);
          }}
        >
          <div className='flex min-h-[100dvh] flex-col items-center justify-center px-6 pb-10 pt-36 md:pt-40'>
            <nav aria-label='Expanded navigation' className='flex w-full max-w-md flex-col items-center gap-3 sm:gap-4'>
              {links.map((link) => (
                <button
                  key={link.id}
                  type='button'
                  onClick={() => handleScrollTo(link.id)}
                  aria-current={active === link.id ? 'location' : undefined}
                  className={`w-full rounded-xl px-4 py-3 text-center text-xl sm:text-2xl font-bold tracking-wide transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${active === link.id ? 'bg-white/10 text-[color:var(--brand-accent)]' : 'text-white'}`}
                >
                  {link.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
