import { AlertTriangle, CheckCircle2, Clock, PauseCircle, XCircle } from 'lucide-react';

export function PageHeader({ title, description, actions }) {
  return (
    <div className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
      <div className='min-w-0'>
        <h1 className='text-2xl font-bold tracking-tight text-text-primary-light dark:text-text-primary-dark'>{title}</h1>
        {description && <p className='mt-1 max-w-3xl text-sm text-text-muted-light dark:text-text-muted-dark'>{description}</p>}
      </div>
      {actions && <div className='flex flex-wrap gap-2'>{actions}</div>}
    </div>
  );
}

export function Panel({ title, description, actions, children, className = '', bodyClassName = 'p-5' }) {
  return (
    <section className={`rounded-2xl border border-border-light bg-surface-light shadow-soft dark:border-border-dark dark:bg-surface-dark ${className}`}>
      {(title || actions) && (
        <header className='flex flex-wrap items-start justify-between gap-3 border-b border-border-light px-5 py-4 dark:border-border-dark'>
          <div className='min-w-0'>
            {title && <h2 className='text-base font-semibold text-text-primary-light dark:text-text-primary-dark'>{title}</h2>}
            {description && <p className='mt-0.5 text-xs text-text-muted-light dark:text-text-muted-dark'>{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function StatTile({ label, value, hint, icon: Icon, tone = 'default' }) {
  const tones = {
    default: 'text-brand-primary dark:text-sky-300',
    attention: 'text-warning dark:text-amber-300',
  };
  return (
    <div className='rounded-2xl border border-border-light bg-surface-light p-5 shadow-soft dark:border-border-dark dark:bg-surface-dark'>
      <div className='flex items-center justify-between gap-3'>
        <p className='text-sm font-medium text-text-muted-light dark:text-text-muted-dark'>{label}</p>
        {Icon && <Icon size={18} className={tones[tone]} aria-hidden='true' />}
      </div>
      <p className='mt-2 text-3xl font-bold tabular-nums text-text-primary-light dark:text-text-primary-dark'>{value}</p>
      {hint && <p className='mt-1 text-xs text-text-muted-light dark:text-text-muted-dark'>{hint}</p>}
    </div>
  );
}

export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'bg-error text-white hover:bg-red-700 disabled:opacity-50',
    ghost: 'bg-transparent text-text-primary-light hover:bg-background-light disabled:opacity-50 dark:text-text-primary-dark dark:hover:bg-background-dark',
  };
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'text-sm' };
  return (
    <button
      type='button'
      {...props}
      className={`btn ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, error, required, children, className = '' }) {
  return (
    <label className={`form-label ${className}`}>
      <span>
        {label}
        {required && <span className='text-[color:var(--form-danger)]' aria-hidden='true'> *</span>}
      </span>
      {children}
      {hint && !error && <span className='form-hint'>{hint}</span>}
      {error && <span role='alert' className='form-error text-xs'>{error}</span>}
    </label>
  );
}

const STATUS_STYLES = {
  TRIALING: { label: 'Trial', icon: Clock, className: 'bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-200 dark:ring-sky-800' },
  ACTIVE: { label: 'Active', icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:ring-emerald-800' },
  GRACE: { label: 'Grace period', icon: AlertTriangle, className: 'bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:ring-amber-800' },
  EXPIRED: { label: 'Lapsed', icon: XCircle, className: 'bg-red-50 text-red-800 ring-red-200 dark:bg-red-950/60 dark:text-red-200 dark:ring-red-800' },
  SUSPENDED: { label: 'Suspended', icon: PauseCircle, className: 'bg-red-50 text-red-800 ring-red-200 dark:bg-red-950/60 dark:text-red-200 dark:ring-red-800' },
  CANCELLED: { label: 'Cancelled', icon: XCircle, className: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700' },
};

export function StatusBadge({ status, label }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.CANCELLED;
  const Icon = style.icon;
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${style.className}`}>
      <Icon size={12} aria-hidden='true' />
      {label || style.label}
    </span>
  );
}

export function FirmAccessBadge({ isActive }) {
  return isActive
    ? <StatusBadge status='ACTIVE' label='Access on' />
    : <StatusBadge status='SUSPENDED' label='Suspended' />;
}

export function EmptyState({ children }) {
  return <p className='py-8 text-center text-sm text-text-muted-light dark:text-text-muted-dark'>{children}</p>;
}

export function ErrorNotice({ error, children }) {
  if (!error && !children) return null;
  return (
    <p role='alert' className='rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-950/60 dark:text-red-100'>
      {children || error?.userMessage || error?.response?.data?.message || error?.message || 'Something went wrong.'}
    </p>
  );
}

export function Pagination({ page, pageSize, count, onPage }) {
  const pages = Math.max(Math.ceil(count / pageSize), 1);
  if (pages <= 1) return null;
  return (
    <nav aria-label='Pagination' className='flex items-center justify-between gap-3 border-t border-border-light px-5 py-3 text-sm dark:border-border-dark'>
      <span className='text-text-muted-light dark:text-text-muted-dark'>Page {page} of {pages} · {count} total</span>
      <div className='flex gap-2'>
        <Button variant='secondary' size='sm' disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
        <Button variant='secondary' size='sm' disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </nav>
  );
}

export function Table({ columns, children, caption }) {
  return (
    <div className='overflow-x-auto'>
      <table className='min-w-full text-left'>
        {caption && <caption className='sr-only'>{caption}</caption>}
        <thead className='border-b border-border-light bg-background-light/60 dark:border-border-dark dark:bg-background-dark/40'>
          <tr>
            {columns.map((column) => (
              <th key={column} scope='col' className='whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted-light dark:text-text-muted-dark'>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className='divide-y divide-border-light dark:divide-border-dark'>{children}</tbody>
      </table>
    </div>
  );
}
