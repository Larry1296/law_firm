import PublicNavbar from "@/layouts/public/PublicNavbar";
import { Outlet, useLocation } from "react-router-dom";

export default function AuthLayout() {
  const location = useLocation();
  const isRegisterPage = location.pathname === "/register";

  return (
    <div
      className={`auth-layout ${
        isRegisterPage ? "auth-register" : "auth-compact"
      } min-h-screen flex flex-col bg-[color:var(--bg)] text-[color:var(--text-primary)] dark:bg-[#050816] dark:text-white`}
    >
      {/* Navbar */}
      <PublicNavbar variant="auth" />

      {/* AUTH CONTENT AREA */}
      <main className="auth-main flex-1 flex items-center justify-center px-4 py-10">
        <Outlet />
      </main>
    </div>
  );
}
