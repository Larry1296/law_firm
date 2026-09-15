import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import service from './preliminaryReviewService';
import PreliminaryFields from './PreliminaryFields';
import { inputClass, reviewLabels } from './preliminaryForm';

const outcomes = ['PROCEED_TO_CONFLICT_SCREENING', 'REQUEST_MINIMUM_INFORMATION', 'REFER_ELSEWHERE', 'DECLINE_AT_PRELIMINARY_STAGE', 'URGENT_REVIEW_REQUIRED'];
const identityFields = ['prospective_name', 'entity_kind', 'visitor_capacity', 'adverse_parties', 'related_parties'];
const dateText = (value) => value ? new Intl.DateTimeFormat('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not recorded';
const warning = 'Record only information required to decide whether the enquiry should proceed to conflict screening. Do not record detailed merits, evidence or legal strategy before conflict review.';

export default function PreliminaryEnquiriesPage({ workspace = 'admin' }) {
  const [queue, setQueue] = useState({ enquiries: [], lawyers: [], secretaries: [] });
  const [selected, setSelected] = useState(null);
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lawyer, setLawyer] = useState('');
  const [reason, setReason] = useState('');
  const [outcome, setOutcome] = useState('');
  const [execution, setExecution] = useState('CREATE_NOW_BY_LAWYER');
  const [secretary, setSecretary] = useState('');
  const [missing, setMissing] = useState([]);
  const [existing, setExisting] = useState('');
  const [verified, setVerified] = useState(false);
  const [verificationReason, setVerificationReason] = useState('');
  const [file, setFile] = useState({ reference: '', opened_date: '', location: '', custody_holder_id: '', reason: '' });
  const [showFile, setShowFile] = useState(false);
  const review = selected?.review;
  const load = () => service.list(workspace).then(setQueue);
  useEffect(() => {
    let active = true;
    service.list(workspace).then(data => { if (active) setQueue(data); }).catch(() => { if (active) setError('Unable to load preliminary enquiries. Check your intake role.'); });
    return () => { active = false; };
  }, [workspace]);
  const select = async (row) => {
    setBusy(true); setError(''); setSuccess('');
    try {
      const detail = await service.detail(workspace, row.id); setSelected(detail); setValues(detail.review || {});
      setReason(''); setOutcome(''); setLawyer(''); setMissing([]); setSecretary(''); setExisting(''); setVerified(false); setVerificationReason(''); setShowFile(false);
      setFile(detail.physical_file ? { reference: detail.physical_file.reference, opened_date: detail.physical_file.opened_date, location: detail.physical_file.location, custody_holder_id: detail.physical_file.custody_holder, reason: '' } : { reference: '', opened_date: '', location: '', custody_holder_id: '', reason: '' });
    } catch (err) { setError(err.response?.data?.message || 'Unable to load this enquiry.'); }
    finally { setBusy(false); }
  };
  const act = async (action, data) => {
    setBusy(true); setError(''); setSuccess('');
    try {
      const next = await service.act(workspace, selected.id, action, data); setSelected(next); setValues(next.review || {});
      setReason(''); setOutcome(''); setShowFile(false); setSuccess('Recorded. ' + next.status_label); await load();
    } catch (err) { setError(err.response?.data?.message || 'Unable to save. Your changes have not been confirmed. Reload before retrying.'); }
    finally { setBusy(false); }
  };
  const decide = (event) => {
    event.preventDefault();
    if (!reason.trim()) { setError('Every disposition requires a reason.'); return; }
    const data = { revision: review.revision, review: Object.fromEntries(Object.keys(reviewLabels).map(key => [key, values[key]])), outcome, reason };
    if (outcome === 'PROCEED_TO_CONFLICT_SCREENING') data.execution = execution;
    if (outcome === 'REQUEST_MINIMUM_INFORMATION') data.missing_fields = missing;
    if (secretary && (outcome === 'REQUEST_MINIMUM_INFORMATION' || (outcome === 'PROCEED_TO_CONFLICT_SCREENING' && execution === 'ASSIGN_CREATION_TO_SECRETARY'))) data.secretary_id = secretary;
    act('decide', data);
  };
  const selector = (label, value, update, rows, required = false) => <label className='block min-w-0'>{label}<select className={inputClass} value={value} onChange={e => update(e.target.value)} required={required}><option value=''>Choose…</option>{rows.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>;
  const canConvert = review?.state === 'AUTHORISED' && ((workspace === 'lawyer' && review.execution === 'CREATE_NOW_BY_LAWYER') || (workspace === 'secretary' && review.execution === 'ASSIGN_CREATION_TO_SECRETARY'));
  const canFollow = review?.state === 'INFORMATION' && (workspace === 'secretary' || (workspace === 'lawyer' && !review.secretary_id));
  return <main className='mx-auto w-full min-w-0 max-w-6xl space-y-5 p-4 [overflow-wrap:anywhere] md:p-8'>
    <h1 className='text-2xl font-bold'>{workspace === 'secretary' ? 'Assigned enquiry tasks' : 'Preliminary enquiries'}</h1>
    {workspace === 'admin' && queue.can_review_as_lawyer && <Link className='underline' to='/admin/clients/preliminary-lawyer'>My assigned enquiries as advocate</Link>}
    <p>Step 2 — Lawyer preliminary review. An enquiry is not an accepted instruction. The system supports the advocate and the physical file.</p>
    <Card className='p-4'><p>{warning}</p><p className='mt-2 text-sm'>Conflict screening finds possible name matches. An authorised advocate makes the conflict-of-interest decision.</p></Card>
    {error && <div role='alert' className='rounded border border-red-500 p-3'>{error}{selected && <button className='ml-3 underline' disabled={busy} onClick={() => select(selected)}>Reload enquiry</button>}</div>}
    {success && <p role='status'>{success}</p>}
    <section aria-label='Preliminary enquiry queue' className='grid min-w-0 gap-3 sm:grid-cols-2'>
      {queue.enquiries.length === 0 && <p>No {workspace === 'secretary' ? 'assigned tasks' : 'preliminary enquiries'}.</p>}
      {queue.enquiries.map(row => <Card key={row.id} className='min-w-0 space-y-2 p-4'><h2 className='font-semibold'>{row.reference}</h2><p>{row.visitor_name}</p><p>{row.status_label}</p><p>{row.lawyer_name}</p><Button disabled={busy} onClick={() => select(row)}>Review {row.reference}</Button></Card>)}
    </section>
    {selected && <Card className='min-w-0 space-y-5 p-4 md:p-6'>
      <h2 className='text-xl font-semibold'>{selected.reference} — {selected.status_label}</h2>
      <p>Safe contact: {selected.safe_contact}</p>
      {selected.reception_description && <p>Reception summary: {selected.reception_description}</p>}
      {review && <p>{review.administrative_reason}. Deciding advocate: {review.deciding_lawyer_name || 'Pending'} · {dateText(review.decided_at)} (Nairobi).</p>}
      {review?.state === 'CLOSED' && <p>This enquiry is closed. No client or proposed matter was created. This record does not imply that legal advice was given.</p>}
      {review?.state === 'CONVERTED' && <div><p>{review.proposal_reference} — awaiting conflict screening. Internal prospective client recorded.</p>{workspace !== 'secretary' && <Link className='underline' to={`/${workspace}/clients/${review.client_id}/conflict-checks/${review.proposed_matter_id}`}>View proposed matter in conflict-screening queue</Link>}</div>}
      {workspace === 'admin' && !['CLOSED', 'CONVERTED'].includes(review?.state) && <form onSubmit={e => { e.preventDefault(); act('assign', { lawyer_id: lawyer, reason, ...(review ? { revision: review.revision } : {}) }); }}>
        <fieldset disabled={busy} className='min-w-0 space-y-3'>
          {selector('Assign active advocate', lawyer, setLawyer, queue.lawyers, true)}
          {review && <label className='block'>Reassignment reason<input className={inputClass} maxLength={500} required value={reason} onChange={e => setReason(e.target.value)} /></label>}
          {review && <p>Reassignment returns the enquiry for a fresh review and cancels pending creation authority.</p>}
          <Button type='submit'>Assign to lawyer</Button>
        </fieldset>
      </form>}
      {workspace === 'lawyer' && ['REVIEW', 'URGENT'].includes(review?.state) && <form onSubmit={decide}>
        <fieldset disabled={busy} className='min-w-0 space-y-4'>
          <PreliminaryFields values={values} setValues={setValues} />
          <label className='block'>Preliminary disposition<select className={inputClass} required value={outcome} onChange={e => setOutcome(e.target.value)}><option value=''>Choose an outcome…</option>{outcomes.map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>
          <label className='block'>Disposition reason — restricted to assigned advocate<textarea className={inputClass} maxLength={500} required value={reason} onChange={e => setReason(e.target.value)} /></label>
          <p className='text-sm'>Use a short preliminary reason. Reception and secretary see only the administrative outcome.</p>
          {outcome === 'REQUEST_MINIMUM_INFORMATION' && <fieldset className='space-y-2'><legend>Missing identification or party information only</legend>{identityFields.map(field => <label key={field} className='flex gap-2'><input type='checkbox' checked={missing.includes(field)} onChange={e => setMissing(e.target.checked ? [...missing, field] : missing.filter(f => f !== field))} />{reviewLabels[field]}</label>)}</fieldset>}
          {outcome === 'PROCEED_TO_CONFLICT_SCREENING' && <label className='block'>Authorised execution<select className={inputClass} value={execution} onChange={e => setExecution(e.target.value)}><option value='CREATE_NOW_BY_LAWYER'>Create now by lawyer</option><option value='ASSIGN_CREATION_TO_SECRETARY'>Assign creation to secretary</option></select></label>}
          {(outcome === 'REQUEST_MINIMUM_INFORMATION' || (outcome === 'PROCEED_TO_CONFLICT_SCREENING' && execution === 'ASSIGN_CREATION_TO_SECRETARY')) && selector('Administrative secretary (optional for follow-up)', secretary, setSecretary, queue.secretaries, outcome === 'PROCEED_TO_CONFLICT_SCREENING')}
          <Button type='submit'>Record lawyer disposition</Button>
        </fieldset>
      </form>}
      {canFollow && <form onSubmit={e => { e.preventDefault(); act('follow_up', { revision: review.revision, changes: Object.fromEntries(review.missing_fields.map(key => [key, values[key]])) }); }}><fieldset disabled={busy} className='min-w-0 space-y-4'><h3>Requested minimum information</h3><PreliminaryFields values={values} setValues={setValues} fields={review.missing_fields} /><Button type='submit'>Return information to lawyer</Button></fieldset></form>}
      {canConvert && <form onSubmit={e => { e.preventDefault(); act('convert', existing ? { existing_client_id: existing, identity_verified: verified, verification_reason: verificationReason } : {}); }}>
        <fieldset disabled={busy} className='min-w-0 space-y-3'><h3 className='font-semibold'>Create authorised prospect and proposed matter</h3>
          <p>{review.prospective_name} · {review.working_title}. Creation will leave the proposal awaiting conflict screening.</p>
          <label className='block'>Existing prospective-client ID (optional; leave blank to create new)<input className={inputClass} value={existing} onChange={e => { setExisting(e.target.value); setVerified(false); }} /></label>
          {existing && <><label className='flex gap-2'><input type='checkbox' required checked={verified} onChange={e => setVerified(e.target.checked)} />I verified this is the same person or entity; a matching name alone is insufficient.</label><label className='block'>Identity verification basis<input className={inputClass} maxLength={300} required value={verificationReason} onChange={e => setVerificationReason(e.target.value)} /></label></>}
          <Button type='submit'>Create authorised records</Button>
        </fieldset>
      </form>}
      {review && !['CLOSED', 'CONVERTED'].includes(review.state) && <details open={showFile} onToggle={e => setShowFile(e.currentTarget.open)}><summary className='cursor-pointer'>Optional physical-file control</summary><p>PROSPECTIVE — CONFLICT/ACCEPTANCE PENDING</p>
        <form onSubmit={e => { e.preventDefault(); act('physical_file', { ...file, revision: review.revision }); }}><fieldset disabled={busy} className='min-w-0 space-y-3'>
          {[['reference', 'Physical file reference'], ['opened_date', 'Opened date'], ['location', 'Cabinet, shelf or location'], ['reason', 'Movement or opening reason']].map(([key, label]) => <label className='block' key={key}>{label}<input className={inputClass} required maxLength={key === 'reason' ? 500 : key === 'reference' ? 80 : 255} type={key === 'opened_date' ? 'date' : 'text'} readOnly={!!selected.physical_file && ['reference', 'opened_date'].includes(key)} value={file[key]} onChange={e => setFile({ ...file, [key]: e.target.value })} /></label>)}
          {selector('Custody holder', file.custody_holder_id, value => setFile({ ...file, custody_holder_id: value }), queue.custody_holders || [], true)}
          <Button type='submit'>Record physical-file control</Button>
        </fieldset></form>
      </details>}
      {selected.physical_file && <p>Physical file: {selected.physical_file.reference} · {selected.physical_file.location} · {selected.physical_file.label}</p>}
      {selected.history?.length > 0 && <details><summary>Assignment and review history</summary>{selected.history.map(h => <div className='my-3 rounded border p-3' key={h.id}><p>{h.action.replaceAll('_', ' ')} · {h.actor} · {dateText(h.recorded_at)} (Nairobi)</p>{h.reason && <p>{h.reason}</p>}{h.physical_movement && <p>Location: {h.physical_movement.location} · Custody holder: {h.physical_movement.custody_holder}</p>}</div>)}</details>}
    </Card>}
  </main>;
}
