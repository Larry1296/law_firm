import { Outlet } from "react-router-dom";
import { useState, useContext } from "react";

import ClientSidebar from "@/layouts/client/ClientSidebar";
import ClientTopbar from "@/layouts/client/ClientTopbar";

import Footer from "@/components/shared/Footer";
import ThemeContext from "@/core/store/ThemeContext";

export default function ClientLayout() {
  const { theme } = useContext(ThemeContext);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* SIDEBAR */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 w-64
          transform transition-transform duration-300
          ${theme === "dark" ? "bg-black" : "bg-[#222222]"}
          ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }
        `}
      >
        <ClientSidebar
          onClose={() => setSidebarOpen(false)}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
      </aside>

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div
          className={`fixed inset-0 z-40 lg:hidden ${
            theme === "dark" ? "bg-black/70" : "bg-black/40"
          }`}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* MAIN COLUMN */}
      <div className="flex flex-col flex-1 min-h-screen overflow-hidden">
        {/* TOPBAR */}
        <ClientTopbar onMenuClick={() => setSidebarOpen(true)} />

        {/* MAIN CONTENT */}
        <main
          className={`
            flex-1 flex flex-col overflow-y-auto
            ${
              theme === "dark"
                ? "bg-[color:var(--background-dark)] text-white"
                : "bg-[color:var(--background-light)] text-[color:var(--text-primary)]"
            }
          `}
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {/* PAGE CONTENT */}
          <div className="flex-1 p-0">
            <Outlet />
          </div>

          {/* FOOTER */}
          <Footer />
        </main>
      </div>

      {/* HIDE WEBKIT SCROLLBAR */}
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
