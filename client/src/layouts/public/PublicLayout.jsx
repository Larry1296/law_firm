import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import PublicNavbar from '@/layouts/public/PublicNavbar';
import Footer from '@/components/shared/Footer';

const PublicLayout = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div className='min-h-screen bg-[color:var(--bg)] text-[color:var(--text-primary)] flex flex-col'>
      {/* Navbar */}
      <PublicNavbar />

      {/* Page content */}
      <main className={`${isHomePage ? 'pt-0' : 'pt-20'} flex-1`}>
        <Outlet />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default PublicLayout;
