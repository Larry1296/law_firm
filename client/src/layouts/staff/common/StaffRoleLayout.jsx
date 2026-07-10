import { Outlet } from 'react-router-dom';
import { useContext, useState } from 'react';

import Footer from '@/components/shared/Footer';
import ThemeContext from '@/core/store/ThemeContext';
import StaffSidebar from '@/layouts/staff/common/StaffSidebar';
import StaffTopbar from '@/layouts/staff/common/StaffTopbar';

export default function StaffRoleLayout({ config }) {
  const { theme } = useContext(ThemeContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className='flex h-screen overflow-hidden'>
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64
          transform transition-transform duration-300
          ${theme === 'dark' ? 'bg-black' : 'bg-[color:var(--brand-primary)]'}
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <StaffSidebar
          config={config}
          onClose={() => setSidebarOpen(false)}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
      </aside>

      {sidebarOpen && (
        <div
          className={`fixed inset-0 z-40 lg:hidden ${
            theme === 'dark' ? 'bg-black' : 'bg-black/40'
          }`}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className='flex flex-col flex-1 min-h-screen'>
        <StaffTopbar config={config} onMenuClick={() => setSidebarOpen(true)} />

        <main
          className={`flex-1 flex flex-col ${
            theme === 'dark'
              ? 'bg-[color:var(--background-dark)] text-white'
              : 'bg-[color:var(--background-light)] text-[color:var(--text-primary)]'
          }`}
          style={{
            overflowY: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <div className='flex-1 p-0'>
            <Outlet />
          </div>

          <Footer />
        </main>
      </div>

      <style>
        {`
          main::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
    </div>
  );
}
