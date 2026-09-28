import SectionIntro from '@/modules/public/sections/SectionIntro';

const STEPS = [
  { title: 'Register your firm', text: 'Tell us about your firm and choose Basic or Pro. We register it with its full details: BRS number, KRA PIN, offices, practice areas and owner.' },
  { title: 'The owner signs in', text: 'The managing partner gets a secure link to set a password, then signs in to the firm’s own dashboard as its administrator.' },
  { title: 'Add your people', text: 'The owner adds advocates and staff with the right role for each, and registers clients as instructions come in.' },
  { title: 'Everyone signs in here', text: 'Staff and clients use the same sign-in on this page and land straight in their own firm’s workspace.' },
];

export default function HowItWorksSection() {
  return (
    <section id='how-it-works' className='scroll-mt-28 bg-surface-light py-20 dark:bg-surface-dark sm:py-24'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <SectionIntro eyebrow='Getting started' title='From registration to your first matter' />
        <ol className='mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
          {STEPS.map((step, index) => (
            <li key={step.title} className='relative rounded-2xl border border-border-light p-6 dark:border-border-dark'>
              <span className='flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary text-sm font-bold text-white dark:bg-sky-600' aria-hidden='true'>
                {index + 1}
              </span>
              <h3 className='mt-4 font-semibold text-text-primary-light dark:text-text-primary-dark'>{step.title}</h3>
              <p className='mt-2 text-sm leading-relaxed text-text-muted-light dark:text-text-muted-dark'>{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
