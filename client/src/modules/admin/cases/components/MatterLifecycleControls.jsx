import { useEffect, useState } from 'react';
import Swal from '@/core/utils/themedSwal';
import adminCasesService from '../services/adminCasesService';

const WORKSTREAMS = ['LITIGATION','TRANSACTIONAL','CRIMINAL','PROBATE','FAMILY','EMPLOYMENT','TRIBUNAL','ADR','REGULATORY','ADVISORY'];
const START_STAGE = { LITIGATION: 'PRE_ACTION', TRANSACTIONAL: 'INITIAL_INSTRUCTIONS', CRIMINAL: 'POLICE_STATION', PROBATE: 'DECEASED_DETAILS', FAMILY: 'INTERIM_PROTECTION', EMPLOYMENT: 'DISCIPLINARY_REVIEW', TRIBUNAL: 'PRE_ACTION', ADR: 'AGREEMENT_TO_MEDIATE_ARBITRATE', REGULATORY: 'INSTRUCTIONS', ADVISORY: 'INSTRUCTIONS' };
const input = 'rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm dark:border-border-dark';

export default function MatterLifecycleControls({ matter }) {
  const [deadlines, setDeadlines] = useState([]);
  const [closures, setClosures] = useState([]);
  const [workstream, setWorkstream] = useState(matter.matter_nature === 'TRANSACTIONAL' ? 'TRANSACTIONAL' : 'LITIGATION');
  const [deadline, setDeadline] = useState({ deadline_type: 'CLIENT_FOLLOW_UP', due_at: '', timezone: 'Africa/Nairobi', responsible_staff: matter.created_by?.id || matter.created_by, priority: 'MEDIUM', source: '', description: '', reminder_schedule: [] });
  const load = async () => { const [d, c] = await Promise.all([adminCasesService.getDeadlines(matter.id), adminCasesService.getClosures(matter.id)]); setDeadlines(d.deadlines || []); setClosures(c.closures || []); };
  useEffect(() => { load().catch(() => {}); }, [matter.id]);
  const fail = (error) => Swal.fire('Control rejected', JSON.stringify(error.response?.data || {}), 'error');
  const saveWorkstream = async () => { try { await adminCasesService.setWorkstream(matter.id, { workstream_type: workstream, current_stage: START_STAGE[workstream], stage_data: {} }); Swal.fire('Workstream saved', 'Specialised stages now apply to this matter.', 'success'); } catch (error) { fail(error); } };
  const saveDeadline = async (event) => { event.preventDefault(); try { await adminCasesService.createDeadline(matter.id, deadline); await load(); } catch (error) { fail(error); } };
  const closure = closures[0];
  return <section id='lifecycle-controls' className='space-y-5 rounded-xl border border-border-light p-5 dark:border-border-dark'>
    <div><p className='text-xs font-semibold uppercase tracking-widest text-brand-primary'>Controlled lifecycle</p><h2 className='text-lg font-semibold'>Workstream, Deadlines, Financial Clearance and Closing Review</h2></div>
    <div className='grid gap-4 lg:grid-cols-3'>
      <div className='space-y-3 rounded-lg border p-4 dark:border-border-dark'><h3 className='font-semibold'>Specialised workstream</h3><select className={`${input} w-full`} value={workstream} onChange={(e) => setWorkstream(e.target.value)}>{WORKSTREAMS.map((x) => <option key={x}>{x}</option>)}</select><button className='text-sm font-semibold text-brand-primary' onClick={saveWorkstream}>Apply {START_STAGE[workstream].replaceAll('_', ' ').toLowerCase()} stage</button></div>
      <form onSubmit={saveDeadline} className='space-y-3 rounded-lg border p-4 dark:border-border-dark'><h3 className='font-semibold'>Critical deadline</h3><input className={`${input} w-full`} type='datetime-local' value={deadline.due_at} onChange={(e) => setDeadline({ ...deadline, due_at: e.target.value })} required/><input className={`${input} w-full`} placeholder='Source: order, statute, client instruction' value={deadline.source} onChange={(e) => setDeadline({ ...deadline, source: e.target.value })} required/><input className={`${input} w-full`} placeholder='Description' value={deadline.description} onChange={(e) => setDeadline({ ...deadline, description: e.target.value })} required/><button className='text-sm font-semibold text-brand-primary'>Record deadline</button></form>
      <div className='space-y-2 rounded-lg border p-4 dark:border-border-dark'><h3 className='font-semibold'>Closing Review</h3><p className='text-sm'>Status: {closure?.status || 'Not requested'}</p>{closure?.blocking_reasons?.length ? <ul className='list-disc pl-5 text-sm text-amber-700'>{closure.blocking_reasons.map((x) => <li key={x}>{x}</li>)}</ul> : <p className='text-sm text-text-muted-light'>Closure requires legal, deadline, original-document, invoice, client-money, advocate, finance and administrative clearance.</p>}</div>
    </div>
    <div><h3 className='font-semibold'>Upcoming and overdue critical deadlines</h3><div className='mt-2 grid gap-2 md:grid-cols-2'>{deadlines.map((item) => <div className={`rounded-lg border p-3 text-sm dark:border-border-dark ${new Date(item.due_at) < new Date() && item.status === 'OPEN' ? 'border-red-500 text-red-700' : ''}`} key={item.id}><b>{item.deadline_type.replaceAll('_', ' ')}</b><br/>{new Date(item.due_at).toLocaleString()} · {item.priority}<br/><span className='text-xs'>{item.source}</span></div>)}</div></div>
  </section>;
}
