import { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import logo from '@/assets/images/logo.png';
import NavLink from '@/components/ui/Navlink';
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
    '/register',
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
      <div className='fixed top-3 md:top-5 left-1/2 -translate-x-1/2 z-50 w-[95%] md:w-[92%]'>
        <div
          className='
            public-navbar-shell
            flex items-center justify-between
            gap-3
            px-4 md:px-6 py-4
            rounded-2xl
            bg-[color:var(--brand-primary)]
            border border-[color:var(--border-light)]
            shadow-[0_12px_36px_rgba(0,0,0,0.25)]
            backdrop-blur-xl
          '
        >
          {/* Logo */}
          <div className='flex shrink-0 items-center gap-3'>
            <img
              src={logo}
              alt='Sheria Desk Logo'
              className='h-14 w-14 md:h-16 md:w-16 rounded-2xl object-cover border border-white/20'
            />

            <span className='hidden xl:inline whitespace-nowrap text-yellow-600 font-extrabold text-lg tracking-wide'>
              kulecho & Co Advocates
            </span>
          </div>

          {/* Desktop Navigation */}
          {!isAuthPage && (
            <div className='hidden lg:flex items-center gap-4'>
              {links.map((link) => (
                <div key={link.id} className='relative group'>
                  <NavLink
                    label={link.label}
                    onClick={() => handleScrollTo(link.id)}
                    className='
                      relative
                      text-white
                      font-extrabold
                      tracking-wide
                      text-sm
                      transition-all duration-300
                      hover:text-[color:var(--brand-accent)]
                    '
                  />

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

          <div className='flex items-center gap-3'>
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
                onClick={() => setMenuOpen(!menuOpen)}
                className='lg:hidden flex flex-col gap-1.5 p-2'
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
      </div>

      {/* Mobile Menu */}
      {!isAuthPage && menuOpen && (
        <div className='fixed inset-0 z-40 flex flex-col items-center justify-center bg-[color:var(--brand-primary)] text-white'>
          {/* Close */}
          <button
            onClick={() => setMenuOpen(false)}
            className='absolute top-6 right-6 text-4xl font-bold hover:text-[color:var(--brand-accent)]'
          >
            ✕
          </button>

          {/* Links */}
          <div className='flex flex-col items-center gap-8 w-full max-w-md px-6'>
            {links.map((link) => (
              <div key={link.id} className='relative'>
                <NavLink
                  label={link.label}
                  onClick={() => handleScrollTo(link.id)}
                  className='
                    text-white
                    text-2xl
                    font-extrabold
                    uppercase
                    tracking-widest
                    hover:text-[color:var(--brand-accent)]
                  '
                />

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

            <div className='w-full pt-4'></div>
          </div>
        </div>
      )}
    </>
  );
}
