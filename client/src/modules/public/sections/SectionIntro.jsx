export default function SectionIntro({ eyebrow, title, text, align = 'center' }) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow && <p className='text-sm font-semibold uppercase tracking-wider text-brand-accent'>{eyebrow}</p>}
      <h2 className='mt-2 text-3xl font-bold tracking-tight text-text-primary-light dark:text-text-primary-dark sm:text-4xl'>{title}</h2>
      {text && <p className='mt-4 text-base leading-relaxed text-text-muted-light dark:text-text-muted-dark'>{text}</p>}
    </div>
  );
}
