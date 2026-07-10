import { Outlet } from 'react-router-dom';
import { useState, useContext } from 'react';
import AdminSidebar from '@/layouts/admin/AdminSidebar';
import AdminTopbar from '@/layouts/admin/AdminTopbar';
import Footer from '@/components/shared/Footer';
import ThemeContext from '@/core/store/ThemeContext';

export default function AdminLayout() {
  const { theme } = useContext(ThemeContext);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className='flex h-screen overflow-hidden'>
      {/* SIDEBAR */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64
          transform transition-transform duration-300
          ${theme === 'dark' ? 'bg-black' : 'bg-[color:var(--brand-primary)]'}
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <AdminSidebar
          onClose={() => setSidebarOpen(false)}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
      </aside>

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div
          className={`fixed inset-0 z-40 lg:hidden ${
            theme === 'dark' ? 'bg-black' : 'bg-black/40'
          }`}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* MAIN COLUMN */}
      <div className='flex flex-col flex-1 min-h-screen'>
        <AdminTopbar onMenuClick={() => setSidebarOpen(true)} />

        {/* SCROLLABLE CONTENT */}
        <main
          className={`flex-1 flex flex-col ${
            theme === 'dark'
              ? 'bg-[color:var(--background-dark)] text-white'
              : 'bg-[color:var(--background-light)] text-[color:var(--text-primary)]'
          }`}
          style={{
            overflowY: 'auto',
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none', // IE/Edge
          }}
        >
          {/* CONTENT */}
          <div className='flex-1 p-0'>
            <Outlet />
          </div>

          <Footer />
        </main>
      </div>

      {/* HIDE SCROLLBAR FOR WEBKIT */}
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
