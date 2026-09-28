import { ChevronDown, ChevronUp } from 'lucide-react';

import { formatDateTime } from '@/core/utils/dateFormatter';

export default function SittingCard({ sitting, open, onToggle, actions = null, showReadiness = true, children }) {
  const { event, case: matter, brief } = sitting;
  const tone = brief.readiness >= 80 ? 'bg-emerald-100 text-emerald-900' : brief.readiness >= 50 ? 'bg-amber-100 text-amber-900' : 'bg-red-100 text-red-900';
  return (
    <article id={`sitting-${event.id}`} className={`rounded-xl border p-4 ${open ? 'border-brand-primary' : 'border-border-light dark:border-border-dark'}`}>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0'>
          <p className='text-xs font-bold uppercase text-brand-primary'>{event.type}</p>
          <h3 className='font-bold'>{matter.case_number}{matter.official_court_case_number ? ` · ${matter.official_court_case_number}` : ''}</h3>
          <p className='text-sm'>{matter.title}</p>
          <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>
            {formatDateTime(event.starts_at)} · {event.court || 'Court not recorded'} · {event.hearing_mode}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          {showReadiness && <span className={`rounded-full px-3 py-1 text-xs font-bold ${tone}`}>{brief.readiness}% ready</span>}
          {actions}
          <button type='button' onClick={onToggle} aria-expanded={open} className='inline-flex min-h-11 items-center gap-1 rounded-lg border border-border-light px-3 text-sm font-semibold dark:border-border-dark'>
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {open ? 'Hide' : 'Prepare'}
          </button>
        </div>
      </div>
      {open && <div className='mt-4 border-t border-border-light pt-4 dark:border-border-dark'>{children}</div>}
    </article>
  );
}
