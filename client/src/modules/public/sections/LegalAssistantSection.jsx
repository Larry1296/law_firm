import { BookOpen, MessageCircle } from 'lucide-react';

import { openLegalAssistant } from '@/components/ai/assistantEvents';

const EXAMPLES = [
  'What are my rights if I am arrested?',
  'How much notice must an employer give?',
  'What are the steps in a court case?',
];

export default function LegalAssistantSection() {
  return (
    <section id='legal-assistant' className='scroll-mt-28 bg-[#0b1a2e] py-20 text-white sm:py-24'>
      <div className='mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8'>
        <div>
          <p className='text-sm font-semibold uppercase tracking-wider text-brand-accent'>Free for everyone</p>
          <h2 className='mt-2 text-3xl font-bold tracking-tight sm:text-4xl'>Questions about Kenyan law?</h2>
          <p className='mt-4 leading-relaxed text-slate-300'>
            Our assistant answers general questions about the law of Kenya from official sources, such as the
            Constitution and Acts of Parliament published by Kenya Law, and shows you the provisions it relied on.
            It is general information, not legal advice.
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
