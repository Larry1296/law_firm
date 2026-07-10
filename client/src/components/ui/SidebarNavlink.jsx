import { NavLink } from "react-router-dom";
import { useContext } from "react";
import ThemeContext from "@/core/store/ThemeContext";

export default function SidebarNavLink({
  to,
  end = false,
  icon,
  children,
  onClick,
}) {
  const { theme } = useContext(ThemeContext);

  const base =
    "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200";

  const activeClasses =
    theme === "dark"
      ? "bg-white/15 text-white shadow-lg"
      : "bg-white/20 text-white shadow-md";

  const inactiveClasses =
    theme === "dark"
      ? "text-white/90 hover:bg-white/10"
      : "text-white/80 hover:bg-white/20";

  return (
    <NavLink to={to} end={end} onClick={onClick}>
      {({ isActive }) => (
        <div
          className={`${base} ${isActive ? activeClasses : inactiveClasses}`}
        >
          {icon}
          <span>{children}</span>
        </div>
      )}
    </NavLink>
  );
}
