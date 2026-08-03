import { useState } from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import SectionHeading from '@/components/ui/SectionHeading';
import { useLawyerAIPriorities } from '../hooks/useLawyerAI';

const priorityStyle = { CRITICAL: 'bg-red-100 text-red-800', HIGH: 'bg-orange-100 text-orange-800', MEDIUM: 'bg-amber-100 text-amber-800', LOW: 'bg-green-100 text-green-800' };

export default function LawyerAIPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ priority: '', sort: 'priority', freshness: '', immediate: '' });
  const { data, isLoading, error } = useLawyerAIPriorities(filters);
  const matters = data?.matters ?? [];
  const update = (key) => (event) => setFilters((current) => ({ ...current, [key]: event.target.value }));

  return (
    <main className='space-y-6 p-4 md:p-6'>
      <SectionHeading title='My AI Matters' subtitle='AI Matter Intelligence for matters assigned to you' size='compact' />
      <div className='rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950' role='note'>
        This is an AI-assisted preparedness, risk and matter-outlook assessment. It is not legal advice, a judicial decision, or a guarantee of the court’s outcome. The responsible advocate must independently verify the facts, documents, deadlines, authorities and recommendations.
      </div>
      <section aria-label='Priority controls' className='grid gap-3 rounded-xl border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark sm:grid-cols-2 lg:grid-cols-4'>
        <label className='text-sm'>Priority<select aria-label='Overall priority' value={filters.priority} onChange={update('priority')} className='mt-1 w-full rounded-lg border p-2 dark:bg-background-dark'><option value=''>All priorities</option>{['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className='text-sm'>Sort by<select aria-label='Sort matters' value={filters.sort} onChange={update('sort')} className='mt-1 w-full rounded-lg border p-2 dark:bg-background-dark'><option value='priority'>Critical and time-sensitive first</option><option value='deadline'>Next deadline</option><option value='severity'>Consequence severity</option><option value='preparedness'>Lowest preparedness</option></select></label>
        <label className='text-sm'>Analysis freshness<select aria-label='Analysis freshness' value={filters.freshness} onChange={update('freshness')} className='mt-1 w-full rounded-lg border p-2 dark:bg-background-dark'><option value=''>All</option><option value='stale'>Requires reassessment</option></select></label>
        <label className='text-sm'>Action needed<select aria-label='Immediate action' value={filters.immediate} onChange={update('immediate')} className='mt-1 w-full rounded-lg border p-2 dark:bg-background-dark'><option value=''>All matters</option><option value='true'>Immediate action</option></select></label>
      </section>
      <p className='text-sm text-text-muted-light dark:text-text-muted-dark'><strong>Ordering:</strong> {data?.methodology?.default_order || 'Critical and time-sensitive matters first'}. Component scores are shown separately and do not estimate the court’s decision.</p>
      {isLoading && <div role='status' className='p-8 text-center'>Assessing verified matter records…</div>}
      {error && <div role='alert' className='rounded-xl bg-red-50 p-4 text-red-800'>{error.response?.status === 403 ? 'You do not have permission to use AI Matter Intelligence.' : 'Matter intelligence could not be loaded.'}</div>}
      {!isLoading && !error && matters.length === 0 && <div className='rounded-xl border p-8 text-center'>No authorized matters match these filters.</div>}
      <div className='grid gap-4 xl:grid-cols-2'>
        {matters.map((matter) => (
          <article key={matter.id} className='rounded-xl border border-border-light bg-surface-light p-5 shadow-soft dark:border-border-dark dark:bg-surface-dark'>
            <div className='flex flex-wrap items-start justify-between gap-3'><div><p className='text-xs text-text-muted-light dark:text-text-muted-dark'>{matter.case_number} · {matter.client}</p><h2 className='mt-1 text-lg font-bold'>{matter.title}</h2><p className='text-sm'>{matter.court_stage} · {matter.practice_area}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${priorityStyle[matter.priority]}`}>{matter.priority} priority</span></div>
            {matter.requires_reassessment && <p className='mt-3 flex items-center gap-2 text-sm font-semibold text-amber-700'><AlertTriangle size={16} />New information requires reassessment</p>}
            <dl className='mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3'>
              <div><dt className='text-xs text-text-muted-light'>Next event</dt><dd>{matter.next_event?.type || 'None recorded'}</dd></div>
              <div><dt className='text-xs text-text-muted-light'>Days remaining</dt><dd>{matter.days_remaining ?? '—'}</dd></div>
              <div><dt className='text-xs text-text-muted-light'>Urgency</dt><dd>{matter.scores.time_urgency}/100</dd></div>
              <div><dt className='text-xs text-text-muted-light'>Severity</dt><dd>{matter.scores.consequence_severity}/100</dd></div>
              <div><dt className='text-xs text-text-muted-light'>Procedural risk</dt><dd>{matter.scores.procedural_risk}/100</dd></div>
              <div><dt className='text-xs text-text-muted-light'>Preparedness</dt><dd>{matter.scores.overall_preparedness}/100</dd></div>
            </dl>
            <ul className='mt-4 list-disc space-y-1 pl-5 text-sm'>{matter.priority_reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
            <button type='button' onClick={() => navigate(`/lawyer/cases/${matter.id}/ai-analysis`)} className='mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success'>Open matter workspace <ArrowRight size={16} /></button>
          </article>
        ))}
      </div>
    </main>
  );
}
