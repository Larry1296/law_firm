// Every variant shares the form button shape (.btn in index.css); only colour changes.
const VARIANTS = {
  primary: 'btn-primary',
  outlineLight: 'btn-secondary',
  success: 'bg-success text-white hover:bg-green-600',
  accent: 'bg-brand-accent text-[#1a1203] hover:bg-yellow-500',
  darkAccent: 'bg-purple-700 text-white hover:bg-purple-800 dark:bg-purple-800 dark:hover:bg-purple-900',
  warning: 'bg-yellow-600 text-black hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  aiGlow: `
    border-2 border-emerald-900/70 bg-gradient-to-r from-amber-300 via-emerald-300 to-sky-300 text-slate-950
    shadow-[0_14px_42px_rgba(15,118,110,0.38)] hover:shadow-[0_18px_56px_rgba(37,99,235,0.45)]
    dark:border-teal-200/90 dark:from-emerald-400 dark:via-teal-400 dark:to-blue-500
    dark:shadow-[0_14px_48px_rgba(45,212,191,0.38)] dark:hover:shadow-[0_18px_60px_rgba(16,185,129,0.48)]
  `,
};

const SIZES = {
  sm: 'px-3 py-2 text-sm',
  md: 'text-[0.9375rem]',
  lg: 'px-6 py-3.5 text-base',
};

export default function Button3D({
  children,
  onClick,
  type = 'button',
  className = '',
  variant = 'primary',
  size = 'md',
  disabled = false,
  ...buttonProps
}) {
  const variantClass = VARIANTS[variant] || VARIANTS.primary;
  // Colour utilities outrank .btn:disabled, so those variants fade instead.
  const disabledClass = variantClass.startsWith('btn-') ? '' : 'disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <button
      {...buttonProps}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn ${variantClass} ${disabledClass} ${SIZES[size] || SIZES.md} ${className}`}
    >
      {children}
    </button>
  );
}
