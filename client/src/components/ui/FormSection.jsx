export default function FormSection({
  title,
  description,
  children,
  className = '',
}) {
  return (
    <section
      className={`rounded-xl border border-border-light bg-surface-light p-5 shadow-soft dark:border-border-dark dark:bg-surface-dark md:p-6 ${className}`}
    >
      <header className='mb-5 border-b border-border-light pb-3 dark:border-border-dark'>
        <h3 className='text-base font-bold tracking-tight text-text-primary-light dark:text-text-primary-dark'>
          {title}
        </h3>
        {description && (
          <p className='mt-1 max-w-3xl text-sm leading-6 text-[color:var(--text-secondary)]'>
            {description}
          </p>
        )}
      </header>
      <div className='space-y-4'>{children}</div>
    </section>
  );
}
