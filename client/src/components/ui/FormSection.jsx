export default function FormSection({
  title,
  description,
  children,
  className = '',
}) {
  return (
    <section
      className={`rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-raised)]/35 p-5 shadow-sm md:p-6 ${className}`}
    >
      <header className='mb-6 border-b border-[color:var(--border)] pb-4'>
        <h3 className='text-lg font-semibold tracking-tight text-[color:var(--text-primary)]'>
          {title}
        </h3>
        {description && (
          <p className='mt-1 max-w-3xl text-sm leading-6 text-[color:var(--text-secondary)]'>
            {description}
          </p>
        )}
      </header>
      <div className='space-y-5'>{children}</div>
    </section>
  );
}
