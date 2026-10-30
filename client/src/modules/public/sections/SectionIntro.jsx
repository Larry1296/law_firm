export default function SectionIntro({ eyebrow, title, text, align = 'center' }) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow && <p className='font-sans text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent'>{eyebrow}</p>}
      <h2 className='mt-3 font-heading text-4xl font-bold leading-tight tracking-tight sm:text-5xl text-text-primary-light dark:text-text-primary-dark'>{title}</h2>
      <span aria-hidden='true' className={`mt-5 block h-1 w-16 rounded-full bg-brand-accent ${align === 'center' ? 'mx-auto' : ''}`} />
      {text && <p className='mt-5 text-lg leading-relaxed text-text-muted-light dark:text-text-muted-dark'>{text}</p>}
    </div>
  );
}
