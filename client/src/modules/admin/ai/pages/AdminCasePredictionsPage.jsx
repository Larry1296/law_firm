import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '@/core/api/axios';
import SectionHeading from '@/components/ui/SectionHeading';

const priorityStyle = { CRITICAL: 'bg-red-100 text-red-800', HIGH: 'bg-orange-100 text-orange-800', MEDIUM: 'bg-amber-100 text-amber-800', LOW: 'bg-green-100 text-green-800' };

export default function AdminCasePredictionsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ search: '', priority: '', freshness: '', sort: 'priority', page: 1 });
  const { data, isLoading, error } = useQuery({ queryKey: ['firm-ai-matters', filters], queryFn: async () => (await axiosInstance.get('/admin/ai/matters/', { params: filters })).data });
  const matters = data?.results || [];
  const update = (key) => (event) => setFilters((value) => ({ ...value, [key]: event.target.value, page: 1 }));
  return <main className='space-y-6 p-4 md:p-6'>
    <SectionHeading title='AI Matter Intelligence' subtitle='Firm-wide, explainable preparedness, risk and assessed-outlook oversight' size='compact' />
    <div role='note' className='rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950'>{data?.disclaimer || 'This is an AI-assisted preparedness, risk and matter-outlook assessment. It is not legal advice, a judicial decision, or a guarantee of the court’s outcome. The responsible advocate must independently verify the facts, documents, deadlines, authorities and recommendations.'}</div>
    <section aria-label='Matter intelligence filters' className='grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-4'>
      <label className='text-sm'>Search<input value={filters.search} onChange={update('search')} className='mt-1 w-full rounded-lg border p-2 dark:bg-background-dark' placeholder='Matter, client or advocate' /></label>
      <label className='text-sm'>Priority<select value={filters.priority} onChange={update('priority')} className='mt-1 w-full rounded-lg border p-2 dark:bg-background-dark'><option value=''>All</option>{['CRITICAL','HIGH','MEDIUM','LOW'].map(x => <option key={x}>{x}</option>)}</select></label>
      <label className='text-sm'>Assessment state<select value={filters.freshness} onChange={update('freshness')} className='mt-1 w-full rounded-lg border p-2 dark:bg-background-dark'><option value=''>All</option><option value='stale'>Requires reassessment</option></select></label>
      <label className='text-sm'>Sort<select value={filters.sort} onChange={update('sort')} className='mt-1 w-full rounded-lg border p-2 dark:bg-background-dark'><option value='priority'>Priority</option><option value='deadline'>Next event</option><option value='preparedness'>Preparedness</option><option value='severity'>Consequence</option></select></label>
    </section>
    {isLoading && <p role='status' className='p-8 text-center'>Loading firm matter intelligence…</p>}
    {error && <div role='alert' className='rounded-xl bg-red-50 p-4 text-red-800'>{error.response?.status === 403 ? 'You do not have firm-wide AI oversight permission.' : 'Matter intelligence could not be loaded.'}</div>}
    {!isLoading && !error && !matters.length && <div className='rounded-xl border p-8 text-center'>No authorized active matters match these filters.</div>}
    <div className='overflow-x-auto rounded-xl border'><table className='min-w-[1100px] w-full text-left text-sm'><thead className='bg-black/5'><tr>{['Matter','Client / advocate','Stage / next event','Priority','Preparedness','Procedural risk','Evidence readiness','Outlook direction','Confidence','Alerts','Assessment'].map(x => <th key={x} className='p-3'>{x}</th>)}</tr></thead><tbody>{matters.map(m => <tr key={m.id} className='border-t align-top'><td className='p-3'><strong>{m.title}</strong><br/><span>{m.case_number}{m.official_case_number ? ` · ${m.official_case_number}` : ''}</span><br/><small>{m.practice_area} · {m.matter_nature}</small></td><td className='p-3'>{m.client}<br/><small>{m.assigned_advocate || 'Unassigned'}</small></td><td className='p-3'>{m.court_stage}<br/><small>{m.next_event?.type || 'No event'} {m.days_remaining != null ? `(${m.days_remaining} days)` : ''}</small></td><td className='p-3'><span className={`rounded-full px-2 py-1 font-semibold ${priorityStyle[m.priority]}`}>{m.priority}</span></td><td className='p-3'>{m.scores.overall_preparedness}/100</td><td className='p-3'>{m.scores.procedural_risk}/100</td><td className='p-3'>{m.scores.evidence_readiness}/100</td><td className='p-3'>{m.outlook?.direction === 'INSUFFICIENT_DATA' ? 'Insufficient data' : m.outlook?.direction}</td><td className='p-3'>{m.confidence}</td><td className='p-3'>{m.critical_alerts || 0} critical<br/><small>{m.unresolved_recommendations} open actions</small></td><td className='p-3'>{m.requires_reassessment && <span className='flex gap-1 text-amber-700'><AlertTriangle size={15}/>Requires reassessment</span>}<button onClick={() => navigate(`/admin/cases/${m.id}/ai`)} className='mt-2 inline-flex items-center gap-1 font-semibold text-brand-primary'>Open workspace <ArrowRight size={15}/></button></td></tr>)}</tbody></table></div>
    <div className='flex justify-between'><button disabled={!data?.previous} onClick={() => setFilters(v => ({...v,page:v.page-1}))} className='rounded border px-3 py-2 disabled:opacity-40'>Previous</button><span>Page {filters.page} · {data?.count || 0} matters</span><button disabled={!data?.next} onClick={() => setFilters(v => ({...v,page:v.page+1}))} className='rounded border px-3 py-2 disabled:opacity-40'>Next</button></div>
  </main>;
}
