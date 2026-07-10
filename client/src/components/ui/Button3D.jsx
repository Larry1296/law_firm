import React, { useContext } from "react";
import ThemeContext from "@/core/store/ThemeContext";

export default function Button3D({
  children,
  onClick,
  type = "button",
  className = "",
  variant = "primary", // primary, success, accent, outlineLight, darkAccent, aiGlow
  size = "md", // sm, md, lg
  disabled = false,
}) {
  const { theme } = useContext(ThemeContext); // get current theme

  const base = `
    rounded-xl font-semibold shadow-[0_6px_0_rgba(0,0,0,0.2)]
    active:shadow-[0_2px_0_rgba(0,0,0,0.15)]
    active:translate-y-1 transition-all duration-200
    flex items-center justify-center
    disabled:opacity-60 disabled:cursor-not-allowed disabled:active:translate-y-0
  `;

  // Size styles
  let sizeClass = "";
  if (size === "sm") sizeClass = "px-4 py-2 text-sm";
  else if (size === "md") sizeClass = "px-6 py-3 text-base";
  else if (size === "lg") sizeClass = "px-8 py-4 text-lg";

  // Variant styles with theme awareness
  let variantClass = "";
  if (variant === "primary")
    variantClass =
      theme === "dark"
        ? "bg-brand-primary text-text-primary-dark hover:bg-blue-700"
        : "bg-brand-primary text-white hover:bg-blue-600";
  else if (variant === "success")
    variantClass =
      theme === "dark"
        ? "bg-success text-text-primary-dark hover:bg-green-600"
        : "bg-success text-white hover:bg-green-500";
  else if (variant === "accent")
    variantClass =
      theme === "dark"
        ? "bg-brand-accent text-text-primary-dark hover:bg-yellow-500"
        : "bg-brand-accent text-white hover:bg-yellow-400";
  else if (variant === "outlineLight")
    variantClass =
      theme === "dark"
        ? "bg-transparent border-2 border-brand-primary text-text-primary-dark hover:bg-blue-900"
        : "bg-transparent border-2 border-brand-primary text-blue-600 hover:bg-blue-50";
  else if (variant === "darkAccent")
    // ✅ NEW VARIANT
    variantClass =
      theme === "dark"
        ? "bg-purple-800 text-white hover:bg-purple-900"
        : "bg-purple-700 text-white hover:bg-purple-800";
  else if (variant === "warning")
    variantClass =
      theme === "dark"
        ? "bg-yellow-500 text-black hover:bg-yellow-600"
        : "bg-yellow-600 text-black hover:bg-yellow-700";
  else if (variant === "aiGlow")
    variantClass =
      theme === "dark"
        ? `
          border-2 border-teal-200/90
          bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-500
          text-slate-950
          shadow-[0_8px_0_rgba(4,47,46,0.55),0_14px_48px_rgba(45,212,191,0.38)]
          hover:shadow-[0_6px_0_rgba(4,47,46,0.55),0_18px_60px_rgba(16,185,129,0.48)]
        `
        : `
          border-2 border-emerald-900/70
          bg-gradient-to-r from-amber-300 via-emerald-300 to-sky-300
          text-slate-950
          shadow-[0_8px_0_rgba(15,118,110,0.45),0_14px_42px_rgba(15,118,110,0.38)]
          hover:shadow-[0_6px_0_rgba(15,118,110,0.45),0_18px_56px_rgba(37,99,235,0.45)]
        `;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizeClass} ${variantClass} ${className}`}
    >
      {children}
    </button>
  );
}
