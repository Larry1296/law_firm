import {
  Briefcase,
  CalendarClock,
  FileText,
  Landmark,
  MonitorPlay,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';

import SectionIntro from '@/modules/public/sections/SectionIntro';

const FEATURES = [
  { icon: UserCheck, title: 'Intake and conflict checks', text: 'Walk-in intake, conflict searches, KYC and beneficial ownership records before you accept instructions.' },
  { icon: Briefcase, title: 'Matters from opening to archive', text: 'Engagement letters, retainers, filings with Civil Procedure Rules deadlines, closure and retention review.' },
  { icon: CalendarClock, title: 'Court diary', text: 'Every mention and hearing across your advocates, with reminders before a matter is called.' },
  { icon: MonitorPlay, title: 'Virtual courts from one screen', text: 'Judiciary virtual court links in one console, so one advocate can follow several courts at once.' },
  { icon: Landmark, title: 'Accounts that follow the rules', text: 'Client and office ledgers, VAT invoices and reconciliation under the Advocates (Accounts) Rules.' },
  { icon: FileText, title: 'Documents and templates', text: 'Matter documents, client document requests and generated pleadings and letters.' },
  { icon: Users, title: 'Staff roles and client portal', text: 'Advocates, secretaries, accountants, HR and IT each see what their role needs. Clients follow their matters online.' },
  { icon: ShieldCheck, title: 'Private to your firm', text: 'Your records are separate from every other firm, with an audit log and Data Protection Act, 2019 notices.' },
];

export default function FeaturesSection() {
  return (
    <section id='features' className='scroll-mt-28 bg-background-light py-20 dark:bg-background-dark sm:py-24'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <SectionIntro
          eyebrow='What your firm gets'
          title='Everything a Kenyan practice runs on'
          text='Designed around how firms here actually work: from the first walk-in consultation to the judgment and the final fee note.'
        />
        <div className='mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4'>
          {FEATURES.map((feature) => (
            <article key={feature.title} className='rounded-2xl border border-border-light bg-surface-light p-6 dark:border-border-dark dark:bg-surface-dark'>
              <span className='flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary dark:bg-sky-400/10 dark:text-sky-300'>
                <feature.icon size={20} aria-hidden='true' />
              </span>
              <h3 className='mt-4 font-semibold text-text-primary-light dark:text-text-primary-dark'>{feature.title}</h3>
              <p className='mt-2 text-sm leading-relaxed text-text-muted-light dark:text-text-muted-dark'>{feature.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
