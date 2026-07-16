const sizes = {
  small: 'col-span-1 row-span-1',

  medium: 'col-span-1 row-span-1 md:row-span-2',

  // Same width as medium but twice the height
  tall: 'col-span-1 row-span-1 md:row-span-4',

  wide: 'col-span-1 md:col-span-2 row-span-1',

  large: 'col-span-1 md:col-span-2 row-span-1 md:row-span-2',

  full: 'col-span-full row-span-1',
};

const variants = {
  light:
    'bg-surface-light text-text-primary-light dark:bg-surface-dark dark:text-text-primary-dark border-border-light dark:border-border-dark',

  cases:
    'bg-gradient-to-br from-blue-700 via-sky-600 to-cyan-600 dark:from-slate-950 dark:via-blue-900 dark:to-slate-900 text-white',

  clients:
    'bg-gradient-to-br from-emerald-700 via-teal-600 to-cyan-600 dark:from-slate-950 dark:via-emerald-900 dark:to-slate-900 text-white',

  finance:
    'bg-gradient-to-br from-green-700 via-emerald-600 to-teal-600 dark:from-slate-950 dark:via-green-900 dark:to-slate-900 text-white',

  activities:
    'bg-gradient-to-br from-slate-700 via-slate-600 to-zinc-600 dark:from-slate-950 dark:via-slate-800 dark:to-slate-900 text-white',

  messages:
    'bg-gradient-to-br from-indigo-700 via-violet-600 to-blue-600 dark:from-slate-950 dark:via-indigo-900 dark:to-slate-900 text-white',

  billing:
    'bg-gradient-to-br from-teal-700 via-cyan-600 to-sky-600 dark:from-slate-950 dark:via-teal-900 dark:to-slate-900 text-white',

  lawyerContacts:
    'bg-gradient-to-br from-blue-700 via-indigo-600 to-violet-600 dark:from-slate-950 dark:via-blue-900 dark:to-slate-900 text-white',

  staff:
    'bg-gradient-to-br from-violet-700 via-purple-600 to-fuchsia-600 dark:from-slate-950 dark:via-violet-900 dark:to-slate-900 text-white',

  revenue:
    'bg-gradient-to-br from-amber-700 via-orange-600 to-rose-600 dark:from-slate-950 dark:via-amber-800 dark:to-slate-900 text-white',

  hearings:
    'bg-gradient-to-br from-cyan-700 via-sky-600 to-blue-600 dark:from-slate-950 dark:via-cyan-900 dark:to-slate-900 text-white',

  notifications:
    'bg-gradient-to-br from-slate-700 via-indigo-600 to-violet-600 dark:from-slate-950 dark:via-slate-800 dark:to-slate-900 text-white',

  tasks:
    'bg-gradient-to-br from-sky-700 via-blue-600 to-indigo-600 dark:from-slate-950 dark:via-sky-900 dark:to-slate-900 text-white',

  documents:
    'bg-gradient-to-br from-blue-700 via-sky-600 to-indigo-600 dark:from-slate-950 dark:via-blue-950 dark:to-slate-900 text-white',

  ai:
    'bg-gradient-to-br from-fuchsia-700 via-purple-600 to-indigo-600 dark:from-slate-950 dark:via-fuchsia-950 dark:to-slate-900 text-white',

  analytics:
    'bg-gradient-to-br from-indigo-700 via-blue-600 to-cyan-600 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-900 text-white',

  courtroom:
    'bg-gradient-to-br from-sky-700 via-cyan-600 to-teal-600 dark:from-slate-950 dark:via-sky-900 dark:to-slate-900 text-white',

  reports:
    'bg-gradient-to-br from-emerald-700 via-green-600 to-lime-600 dark:from-slate-950 dark:via-emerald-900 dark:to-slate-900 text-white',

  calendar:
    'bg-gradient-to-br from-blue-700 via-sky-600 to-indigo-600 dark:from-slate-950 dark:via-blue-900 dark:to-slate-900 text-white',

  communication:
    'bg-gradient-to-br from-cyan-700 via-teal-600 to-emerald-600 dark:from-slate-950 dark:via-cyan-900 dark:to-slate-900 text-white',

  compliance:
    'bg-gradient-to-br from-red-700 via-rose-600 to-orange-600 dark:from-slate-950 dark:via-red-950 dark:to-slate-900 text-white',

  settings:
    'bg-gradient-to-br from-slate-700 via-zinc-600 to-stone-600 dark:from-slate-950 dark:via-slate-800 dark:to-slate-900 text-white',

  glass:
    'bg-white/70 text-text-primary-light backdrop-blur-lg dark:bg-white/10 dark:text-white',
};

const DashboardTile = ({
  children,
  size = 'small',
  variant = 'light',
  className = '',
  rounded = 'lg',
  shadow = true,
  onClick,
}) => {
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
  };
  const roundedClass = roundedClasses[rounded] || roundedClasses.lg;

  const shadowClass = shadow
    ? 'shadow-[0_10px_24px_rgba(31,41,51,0.12)] hover:shadow-[0_14px_30px_rgba(31,41,51,0.18)] dark:shadow-[0_14px_34px_rgba(0,0,0,0.34)] dark:hover:shadow-[0_18px_38px_rgba(0,0,0,0.42)]'
    : 'shadow-none hover:shadow-none';

  const clickableClass = onClick ? 'cursor-pointer' : '';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`
        ${sizes[size] || sizes.small}
        ${variants[variant] || variants.light}

        ${clickableClass}

        relative
        min-w-0
        overflow-hidden

        ${roundedClass}
        ${shadowClass}

        border border-black/10 dark:border-white/10

        hover:-translate-y-0.5
        transition-all
        duration-300

        p-4 sm:p-5 lg:p-6

        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default DashboardTile;
