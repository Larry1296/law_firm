import { BookOpen, MessageCircle } from 'lucide-react';

import { openLegalAssistant } from '@/components/ai/assistantEvents';

const EXAMPLES = [
  'How do I get started with Sheria Master?',
  'What are my rights if I am arrested?',
  'What are the steps in a court case?',
];

export default function LegalAssistantSection() {
  return (
    <section id='legal-assistant' className='scroll-mt-28 bg-[#0b1a2e] py-20 text-white sm:py-24'>
      <div className='mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8'>
        <div>
          <p className='font-sans text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent'>Free for everyone</p>
          <h2 className='mt-3 font-heading text-4xl font-bold leading-tight tracking-tight sm:text-5xl'>Have a question? Just ask</h2>
          <span aria-hidden='true' className='mt-5 block h-1 w-16 rounded-full bg-brand-accent' />
          <p className='mt-5 text-lg leading-relaxed text-slate-300'>
            Our assistant answers questions about Sheria Master (plans, getting started, signing in, security) and
            general legal questions, drawing on official sources such as the Constitution and Acts of Parliament and
            showing you the provisions it relied on. Legal answers are general information, not legal advice.
          </p>
          <button
            type='button'
            onClick={openLegalAssistant}
            className='mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-[#0b1a2e] transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1a2e]'
          >
            <MessageCircle size={18} aria-hidden='true' /> Ask a question
          </button>
        </div>
        <div className='rounded-3xl border border-white/10 bg-white/5 p-6'>
          <p className='flex items-center gap-2 text-sm font-semibold text-slate-200'>
            <BookOpen size={16} aria-hidden='true' /> People ask things like
          </p>
          <ul className='mt-4 space-y-3'>
            {EXAMPLES.map((example) => (
              <li key={example} className='rounded-2xl rounded-bl-sm bg-white/10 px-4 py-3 text-sm'>{example}</li>
            ))}
          </ul>
          <p className='mt-4 text-xs text-slate-400'>Please do not share confidential details in the chat.</p>
        </div>
      </div>
    </section>
  );
}
