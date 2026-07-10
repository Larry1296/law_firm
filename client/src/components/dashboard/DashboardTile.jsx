const sizes = {
  small: 'col-span-1 row-span-1',

  medium: 'col-span-1 row-span-2',

  // Same width as medium but twice the height
  tall: 'col-span-1 row-span-4',

  wide: 'col-span-2 row-span-1',

  large: 'col-span-2 row-span-2',

  full: 'col-span-full row-span-1',
};

const variants = {
  light:
    'bg-white text-gray-900 dark:bg-slate-900 dark:text-white border-border-light dark:border-white/10',

  cases:
    'bg-gradient-to-br from-slate-950 via-blue-900 to-slate-900 text-white',

  clients: 'bg-gradient-to-br from-slate-950 via-emerald-900 to-slate-900 text-white',

  finance:
    'bg-gradient-to-br from-slate-950 via-green-900 to-slate-900 text-white',

  activities:
    'bg-gradient-to-br from-slate-950 via-slate-800 to-slate-900 text-white',

  messages:
    'bg-gradient-to-br from-slate-950 via-indigo-900 to-slate-900 text-white',

  billing:
    'bg-gradient-to-br from-slate-950 via-teal-900 to-slate-900 text-white',

  lawyerContacts:
    'bg-gradient-to-br from-slate-950 via-blue-900 to-slate-900 text-white',

  staff: 'bg-gradient-to-br from-slate-950 via-violet-900 to-slate-900 text-white',

  revenue: 'bg-gradient-to-br from-slate-950 via-amber-800 to-slate-900 text-white',

  hearings:
    'bg-gradient-to-br from-slate-950 via-cyan-900 to-slate-900 text-white',

  notifications: 'bg-gradient-to-br from-slate-950 via-slate-800 to-slate-900 text-white',

  tasks: 'bg-gradient-to-br from-slate-950 via-sky-900 to-slate-900 text-white',

  documents:
    'bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white',

  ai: 'bg-gradient-to-br from-slate-950 via-fuchsia-950 to-slate-900 text-white',

  analytics: 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white',

  courtroom:
    'bg-gradient-to-br from-slate-950 via-sky-900 to-slate-900 text-white',

  reports: 'bg-gradient-to-br from-slate-950 via-emerald-900 to-slate-900 text-white',

  calendar: 'bg-gradient-to-br from-slate-950 via-blue-900 to-slate-900 text-white',

  communication: 'bg-gradient-to-br from-slate-950 via-cyan-900 to-slate-900 text-white',

  compliance: 'bg-gradient-to-br from-slate-950 via-red-950 to-slate-900 text-white',

  settings: 'bg-gradient-to-br from-slate-950 via-slate-800 to-slate-900 text-white',

  glass: 'bg-white/10 backdrop-blur-lg text-white',
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
  const roundedClass =
    rounded === 'none' ? 'rounded-lg' : `rounded-${rounded}`;

  const shadowClass = shadow
    ? 'shadow-[0_14px_34px_rgba(15,23,42,0.14)] hover:shadow-[0_18px_38px_rgba(15,23,42,0.2)]'
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
        overflow-hidden

        ${roundedClass}
        ${shadowClass}

        border border-white/10

        hover:-translate-y-0.5
        transition-all
        duration-300

        p-6

        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default DashboardTile;
