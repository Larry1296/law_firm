import { useEffect, useState } from 'react';
import useAuth from '@/core/hooks/useAuth';
import Swal from '@/core/utils/themedSwal';
import adminCasesService from '../services/adminCasesService';

const WORKSTREAM_STAGES = {
  LITIGATION: ['PRE_ACTION','NOTICE','DRAFTING','FILING','REGISTRY_ACCEPTANCE','SERVICE','PLEADINGS','INTERIM_APPLICATIONS','CASE_MANAGEMENT','PRE_TRIAL','HEARING','SUBMISSIONS','JUDGMENT','DECREE','APPEAL_REVIEW','ENFORCEMENT','SETTLEMENT','CONCLUSION'],
  TRANSACTIONAL: ['INITIAL_INSTRUCTIONS','IDENTITY_AUTHORITY','DUE_DILIGENCE','SEARCHES','CONDITIONS_PRECEDENT','RISK_REPORT','DRAFTING','NEGOTIATION','EXECUTION','STAKEHOLDER_FUNDS','CONSENTS_CLEARANCES','VALUATION','TAX_STAMP_DUTY','REGISTRATION','COMPLETION','EXCHANGE','POST_COMPLETION','ORIGINALS_DELIVERY','COMPLETION_STATEMENT','FINAL_REPORT'],
  CRIMINAL: ['POLICE_STATION','ARREST_CUSTODY','CHARGE_SHEET','PLEA','BAIL_BOND','MENTIONS','DISCLOSURE_EVIDENCE','TRIAL','SUBMISSIONS','JUDGMENT','MITIGATION','SENTENCE','APPEAL','REVISION','POST_CONVICTION'],
  PROBATE: ['DECEASED_DETAILS','HEIRS_BENEFICIARIES','ASSETS_LIABILITIES','AUTHORITY','PETITION','GAZETTE','GRANT','CONFIRMATION','DISTRIBUTION','TRANSMISSION','ACCOUNTS','COMPLETION'],
  FAMILY: ['INTERIM_PROTECTION','CUSTODY','MAINTENANCE','MATRIMONIAL_PROPERTY','NEGOTIATION','MEDIATION','HEARING','ORDERS','IMPLEMENTATION'],
  EMPLOYMENT: ['DISCIPLINARY_REVIEW','DEMAND_RESPONSE','CONCILIATION','CLAIM_DEFENCE','HEARING','JUDGMENT','ENFORCEMENT'],
  TRIBUNAL: ['PRE_ACTION','FILING','SERVICE','DIRECTIONS','HEARING','DECISION','APPEAL_REVIEW','ENFORCEMENT','CONCLUSION'],
  ADR: ['AGREEMENT_TO_MEDIATE_ARBITRATE','APPOINTMENT','PRELIMINARY_MEETING','PLEADINGS','EVIDENCE','HEARING_SESSION','SETTLEMENT_AWARD','ENFORCEMENT','CONCLUSION'],
  REGULATORY: ['INSTRUCTIONS','REGULATORY_REVIEW','REPRESENTATIONS','HEARING','DECISION','REVIEW_APPEAL','COMPLIANCE','CONCLUSION'],
  ADVISORY: ['INSTRUCTIONS','RESEARCH','DRAFT_ADVICE','ADVOCATE_REVIEW','CLIENT_ADVICE','FOLLOW_UP','CONCLUSION'],
};
const RETENTION_FIELDS = {
  limitation_periods: 'Limitation periods', tax_accounting: 'Tax and accounting duties',
  aml_due_diligence: 'AML and due-diligence retention', appeal_review: 'Pending appeal or review',
  enforcement_risk: 'Enforcement risk', complaints_negligence: 'Complaints or negligence risk',
  audits_investigations: 'Audits or investigations', insurance: 'Insurance requirements',
  special_originals: 'Titles, wills, probate, trust, corporate or security originals',
  client_instructions: 'Client preservation instructions', data_protection: 'Data-protection duties',
  legal_hold: 'Existing legal hold', other_preservation: 'Other preservation reasons',
};
const input = 'w-full rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm dark:border-border-dark';
const button = 'rounded-lg bg-brand-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50';
const today = () => new Date().toISOString().slice(0, 10);
const split = (value) => value.split(',').map((item) => item.trim()).filter(Boolean);
const label = (value = '') => value.replaceAll('_', ' ').toLowerCase();

export default function MatterLifecycleControls({ matter }) {
  const { user } = useAuth() || {};
  const [busy, setBusy] = useState(false);
  const [deadlines, setDeadlines] = useState([]);
  const [closures, setClosures] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [workstreamRecord, setWorkstreamRecord] = useState(null);
  const [archive, setArchive] = useState(null);
  const [archivePurpose, setArchivePurpose] = useState('Closing, retention and compliance administration.');
  const [workstreamType, setWorkstreamType] = useState(matter.matter_nature === 'TRANSACTIONAL' ? 'TRANSACTIONAL' : 'LITIGATION');
  const [stageChecklist, setStageChecklist] = useState('work_complete,documents_saved,client_updated');
  const [stageReason, setStageReason] = useState('Stage work and recorded controls completed.');
  const [deadline, setDeadline] = useState({ deadline_type: 'CLIENT_FOLLOW_UP', due_at: '', timezone: 'Africa/Nairobi', responsible_staff: user?.id || '', priority: 'MEDIUM', source: '', description: '', reminder_schedule: [] });
  const [assessment, setAssessment] = useState({
    facts_understood: '', desired_outcome: '', parties_and_relationships: '', legal_issues: '', causes_or_defences: '',
    evidence_available: '', evidence_missing: '', witnesses: '', limitation_analysis: '', jurisdiction_analysis: '',
    procedural_route: '', available_remedies: '', adr_options: '', commercial_considerations: '', risks: '',
    estimated_stages: '', recommended_next_action: '', client_advice_date: '', client_decision: '',
  });
  const [closureForm, setClosureForm] = useState({
    proposed_closure_date: today(), closure_reason: '', outcome: '', closing_summary: '', outstanding_actions: '',
    post_closure_responsibilities: '', appeal_position: '', enforcement_position: '', original_document_status: 'RETURNED',
    authorised_original_retention_reason: '', financial_clearance_status: 'PENDING_FINANCE', legal_work_complete: false,
    result_document_recorded: false, client_instructions_complete: false, undertakings_resolved: false,
    final_invoice_issued: false, final_client_account_prepared: false, closing_letter_prepared: false, client_informed: false,
  });
  const [archiveForm, setArchiveForm] = useState({
    archive_reference: '', closure_date: today(), archive_date: today(), physical_location: '', electronic_location: '',
    archive_category: '', matter_type: matter.case_type || 'OTHER', retention_policy: '', retention_start_date: today(),
    scheduled_review_date: '', proposed_destruction_date: '', permanent_preservation: false, original_documents_held: false,
    data_sensitivity: 'CONFIDENTIAL', responsible_custodian: user?.id || '', archive_checklist: {}, access_restrictions: '',
  });
  const [retention, setRetention] = useState({ assessment: Object.fromEntries(Object.keys(RETENTION_FIELDS).map((key) => [key, 'Reviewed — no preservation issue identified.'])), outcome: 'DEFER', reason: '', next_review_date: '' });
  const [hold, setHold] = useState({ action: 'PLACE', reason: '', authority: '' });
  const [destruction, setDestruction] = useState({ records_approved: [], approval_date: today(), destruction_date: today(), method: '', performed_by: '', verifier: '', certificate_reference: '', electronic_deletion_confirmed: false, backup_handling_decision: '' });

  const fail = (error) => Swal.fire('Control rejected', error.response?.data ? JSON.stringify(error.response.data) : error.message, 'error');
  const execute = async (command, success) => {
    setBusy(true);
    try { await command(); if (success) await Swal.fire('Recorded', success, 'success'); }
    catch (error) { await fail(error); }
    finally { setBusy(false); }
  };
  const load = async () => {
    const [deadlineData, closureData, assessmentData, workstreamData] = await Promise.all([
      adminCasesService.getDeadlines(matter.id), adminCasesService.getClosures(matter.id),
      adminCasesService.getLegalAssessments(matter.id), adminCasesService.getWorkstream(matter.id),
    ]);
    setDeadlines(deadlineData.deadlines || []); setClosures(closureData.closures || []);
    setAssessments(assessmentData.assessments || []); setWorkstreamRecord(workstreamData.workstream || null);
  };
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { load().catch(() => {}); }, [matter.id]);

  const saveAssessment = (event) => { event.preventDefault(); return execute(async () => {
    const arrayFields = ['parties_and_relationships','legal_issues','causes_or_defences','evidence_available','evidence_missing','witnesses','available_remedies','adr_options','risks','estimated_stages'];
    const payload = { ...assessment, advocate: matter.assigned_lawyer?.id || matter.assigned_lawyer };
    arrayFields.forEach((key) => { payload[key] = split(payload[key]); });
    if (!payload.client_advice_date) payload.client_advice_date = null;
    await adminCasesService.createLegalAssessment(matter.id, payload); await load();
  }, 'A new advocate-controlled assessment version was saved.'); };

  const applyWorkstream = () => execute(async () => {
    const stages = WORKSTREAM_STAGES[workstreamRecord?.workstream_type || workstreamType];
    const next = workstreamRecord ? stages[stages.indexOf(workstreamRecord.current_stage) + 1] : stages[0];
    if (!next) throw new Error('The workstream has reached its final controlled stage.');
    await adminCasesService.setWorkstream(matter.id, { workstream_type: workstreamRecord?.workstream_type || workstreamType, current_stage: next, stage_data: {} });
    await load();
  }, workstreamRecord ? 'The next controlled stage was opened.' : 'The specialised workstream was created.');
  const completeStage = () => execute(async () => {
    const checks = Object.fromEntries(split(stageChecklist).map((key) => [key, true]));
    await adminCasesService.completeWorkstreamStage(matter.id, { checklist: checks, reason: stageReason, supporting_document_ids: [] }); await load();
  }, 'The current stage was completed with immutable checklist history.');

  const saveDeadline = (event) => { event.preventDefault(); return execute(async () => {
    await adminCasesService.createDeadline(matter.id, { ...deadline, responsible_staff: deadline.responsible_staff || user?.id }); await load();
  }, 'The critical deadline and reminders were recorded.'); };
  const resolveDeadline = (item, action) => execute(async () => {
    const reason = window.prompt(`Reason to ${action.toLowerCase()} this deadline:`);
    if (!reason) return;
    await adminCasesService.resolveDeadline(item.id, { action, reason }); await load();
  }, `Deadline ${action === 'COMPLETE' ? 'completed' : 'cancelled'} with history.`);
  const changeDeadline = (item) => execute(async () => {
    const newDueAt = window.prompt('New ISO date/time:', item.due_at);
    const reason = newDueAt && window.prompt('Reason for changing this critical date:');
    if (!newDueAt || !reason) return;
    await adminCasesService.changeDeadline(item.id, { new_due_at: newDueAt, reason }); await load();
  }, 'The critical date changed and the previous date remains in history.');

  const requestClosure = (event) => { event.preventDefault(); return execute(async () => {
    await adminCasesService.requestClosure(matter.id, closureForm); await load();
  }, 'The formal closing review was requested.'); };
  const closureAction = (action, payload = {}) => execute(async () => {
    await adminCasesService.closureAction(matter.id, closures[0].id, action, payload); await load();
  }, `Closing action ${label(action)} recorded.`);
  const generateClosing = (type) => execute(async () => {
    await adminCasesService.generateClosingDocument(matter.id, closures[0].id, type); await load();
  }, `${label(type)} generated, versioned and registered.`);

  const accessArchive = () => execute(async () => {
    const data = await adminCasesService.getArchive(matter.id, archivePurpose); setArchive(data.archive);
  }, 'Archive access was logged.');
  const createArchive = (event) => { event.preventDefault(); return execute(async () => {
    const payload = { ...archiveForm };
    if (!payload.physical_location) payload.physical_location = '';
    if (!payload.proposed_destruction_date) payload.proposed_destruction_date = null;
    payload.archive_checklist = { intake: true, conflict: true, engagement: true, kyc_authority: true, correspondence: true, legal_work: true, finance: true, closing_letter: true, document_return: true, retention_classification: true };
    const data = await adminCasesService.createArchive(matter.id, payload); setArchive(data.archive);
  }, 'The closed matter was placed in the controlled archive.'); };
  const recordRetention = (event) => { event.preventDefault(); return execute(async () => {
    const payload = { ...retention, next_review_date: retention.next_review_date || null };
    await adminCasesService.createRetentionReview(archive.id, payload);
    const data = await adminCasesService.getArchive(matter.id, archivePurpose); setArchive(data.archive);
  }, 'The retention assessment and decision were recorded.'); };
  const legalHold = (event) => { event.preventDefault(); return execute(async () => {
    const data = await adminCasesService.changeLegalHold(archive.id, hold); setArchive(data.archive);
  }, `Legal hold ${hold.action === 'PLACE' ? 'placed' : 'released'} with authority history.`); };
  const recordDestruction = (event) => { event.preventDefault(); return execute(async () => {
    const excluded = (archive.document_inventory || []).map((item) => String(item.id)).filter((id) => !destruction.records_approved.includes(id));
    await adminCasesService.recordDestruction(archive.id, { ...destruction, records_excluded: excluded });
    const data = await adminCasesService.getArchive(matter.id, archivePurpose); setArchive(data.archive);
  }, 'Secure destruction was logged; matter and audit metadata were retained.'); };

  const closure = closures[0];
  const workstreamStages = WORKSTREAM_STAGES[workstreamRecord?.workstream_type || workstreamType];
  const nextStage = workstreamRecord ? workstreamStages[workstreamStages.indexOf(workstreamRecord.current_stage) + 1] : workstreamStages[0];
  const isClosed = matter.matter_status === 'CLOSED';
  const isArchived = matter.matter_status === 'ARCHIVED';

  return <section id='lifecycle-controls' className='space-y-7 rounded-xl border border-border-light p-5 dark:border-border-dark'>
    <div><p className='text-xs font-semibold uppercase tracking-widest text-brand-primary'>Controlled lifecycle</p><h2 className='text-lg font-semibold'>Assessment, Workstream, Deadlines, Closing and Retention</h2><p className='text-sm text-text-muted-light'>Every action below is revalidated by firm-scoped backend services and written to immutable history.</p></div>

    {!isArchived && <details className='rounded-lg border p-4 dark:border-border-dark'><summary className='cursor-pointer font-semibold'>Advocate legal assessment ({assessments.length} version{assessments.length === 1 ? '' : 's'})</summary>
      <form className='mt-4 grid gap-3 md:grid-cols-2' onSubmit={saveAssessment}>
        {Object.entries({ facts_understood:'Facts currently understood', desired_outcome:'Client desired outcome', parties_and_relationships:'Parties and relationships (comma separated)', legal_issues:'Legal issues', causes_or_defences:'Causes of action or defences', evidence_available:'Evidence available', evidence_missing:'Evidence missing', witnesses:'Witnesses', limitation_analysis:'Limitation and deadline analysis', jurisdiction_analysis:'Jurisdiction analysis', procedural_route:'Procedural route', available_remedies:'Available remedies', adr_options:'ADR options', commercial_considerations:'Commercial considerations', risks:'Legal and practical risks', estimated_stages:'Estimated stages', recommended_next_action:'Recommended next action', client_decision:'Client decision' }).map(([key, text]) => <textarea key={key} className={input} rows='2' required={!['commercial_considerations','client_decision'].includes(key)} placeholder={text} value={assessment[key]} onChange={(e) => setAssessment({ ...assessment, [key]: e.target.value })}/>)}
        <label className='text-sm'>Client advice date<input className={input} type='date' value={assessment.client_advice_date} onChange={(e) => setAssessment({ ...assessment, client_advice_date: e.target.value })}/></label>
        <button disabled={busy} className={button}>Save new assessment version</button>
      </form>
      {assessments[0] && <p className='mt-3 text-sm'>Current version {assessments[0].version}: {assessments[0].recommended_next_action}</p>}
    </details>}

    {!isArchived && <div className='grid gap-4 xl:grid-cols-2'>
      <div className='space-y-3 rounded-lg border p-4 dark:border-border-dark'><h3 className='font-semibold'>Specialised workstream</h3>
        {!workstreamRecord && <select className={input} value={workstreamType} onChange={(e) => setWorkstreamType(e.target.value)}>{Object.keys(WORKSTREAM_STAGES).map((item) => <option key={item}>{item}</option>)}</select>}
        <p className='text-sm'>Current: {workstreamRecord ? `${label(workstreamRecord.workstream_type)} — ${label(workstreamRecord.current_stage)}` : 'Not created'}</p>
        {workstreamRecord && !workstreamRecord.stage_records.at(-1)?.completed_at && <><input className={input} value={stageChecklist} onChange={(e) => setStageChecklist(e.target.value)} placeholder='Checklist keys, comma separated'/><textarea className={input} value={stageReason} onChange={(e) => setStageReason(e.target.value)}/><button disabled={busy} type='button' className={button} onClick={completeStage}>Complete current stage</button></>}
        {(!workstreamRecord || workstreamRecord.stage_records.at(-1)?.completed_at) && nextStage && <button disabled={busy} type='button' className={button} onClick={applyWorkstream}>{workstreamRecord ? `Open next: ${label(nextStage)}` : `Start: ${label(nextStage)}`}</button>}
        <div className='max-h-36 overflow-auto text-xs'>{workstreamRecord?.stage_records.map((item) => <p key={item.id}>{item.sequence}. {label(item.stage)} — {item.completed_at ? 'completed' : 'open'}</p>)}</div>
      </div>
      <div className='space-y-3 rounded-lg border p-4 dark:border-border-dark'><h3 className='font-semibold'>Critical deadline</h3>
        <form className='space-y-2' onSubmit={saveDeadline}><select className={input} value={deadline.deadline_type} onChange={(e) => setDeadline({ ...deadline, deadline_type: e.target.value })}>{['LIMITATION','COURT','FILING','SERVICE','RESPONSE','HEARING','MENTION','SUBMISSIONS','COMPLETION','UNDERTAKING','RENEWAL','APPEAL_REVIEW','RETENTION_REVIEW','CLIENT_FOLLOW_UP'].map((item) => <option key={item}>{item}</option>)}</select><input className={input} type='datetime-local' value={deadline.due_at} onChange={(e) => setDeadline({ ...deadline, due_at: e.target.value })} required/><input className={input} placeholder='Source: order, statute or instruction' value={deadline.source} onChange={(e) => setDeadline({ ...deadline, source: e.target.value })} required/><input className={input} placeholder='Description' value={deadline.description} onChange={(e) => setDeadline({ ...deadline, description: e.target.value })} required/><button disabled={busy} className={button}>Record deadline</button></form>
      </div>
    </div>}
    <div><h3 className='font-semibold'>Upcoming and overdue deadlines</h3><div className='mt-2 grid gap-2 md:grid-cols-2'>{deadlines.map((item) => <div className={`rounded-lg border p-3 text-sm dark:border-border-dark ${new Date(item.due_at) < new Date() && item.status === 'OPEN' ? 'border-red-500 text-red-700' : ''}`} key={item.id}><b>{label(item.deadline_type)}</b><br/>{new Date(item.due_at).toLocaleString()} · {item.priority} · {item.status}<br/><span className='text-xs'>{item.source}</span>{item.status === 'OPEN' && !isArchived && <div className='mt-2 flex gap-2'><button type='button' onClick={() => changeDeadline(item)}>Change</button><button type='button' onClick={() => resolveDeadline(item, 'COMPLETE')}>Complete</button><button type='button' onClick={() => resolveDeadline(item, 'CANCEL')}>Cancel</button></div>}</div>)}</div></div>

    {!closure && !isClosed && !isArchived && <details className='rounded-lg border p-4 dark:border-border-dark'><summary className='cursor-pointer font-semibold'>Request formal Closing Review</summary><form className='mt-4 grid gap-3 md:grid-cols-2' onSubmit={requestClosure}>{Object.entries({ closure_reason:'Closure reason', outcome:'Outcome or result', closing_summary:'Closing summary', outstanding_actions:'Outstanding actions', post_closure_responsibilities:'Post-closure responsibilities', appeal_position:'Appeal or review position', enforcement_position:'Enforcement position', authorised_original_retention_reason:'Original retention reason, if applicable' }).map(([key, text]) => <textarea className={input} key={key} required={['closure_reason','outcome','closing_summary','appeal_position','enforcement_position'].includes(key)} placeholder={text} value={closureForm[key]} onChange={(e) => setClosureForm({ ...closureForm, [key]: e.target.value })}/>)}<div className='grid gap-2 text-sm'>{['legal_work_complete','result_document_recorded','client_instructions_complete','undertakings_resolved','final_invoice_issued','client_informed'].map((key) => <label key={key}><input type='checkbox' checked={closureForm[key]} onChange={(e) => setClosureForm({ ...closureForm, [key]: e.target.checked })}/> {label(key)}</label>)}</div><button disabled={busy} className={button}>Request Closing Review</button></form></details>}
    {closure && <div className='space-y-3 rounded-lg border p-4 dark:border-border-dark'><h3 className='font-semibold'>Closing Review — {closure.status}</h3>{closure.blocking_reasons?.length ? <ul className='list-disc pl-5 text-sm text-amber-700'>{closure.blocking_reasons.map((item) => <li key={item}>{item}</li>)}</ul> : <p className='text-sm text-green-700'>All currently evaluated closing controls are clear.</p>}<div className='flex flex-wrap gap-2'>{closure.status !== 'CLOSED' && <><button className={button} onClick={() => generateClosing('CLOSING_LETTER')}>Generate closing letter</button><button className={button} onClick={() => generateClosing('FINAL_CLIENT_STATEMENT')}>Generate final statement</button><button className={button} onClick={() => closureAction('approve-advocate')}>Advocate approval</button><button className={button} onClick={() => closureAction('approve-finance')}>Finance approval</button><button className={button} onClick={() => closureAction('finalise')}>Administrative final review</button></>}{closure.status === 'CLOSED' && !archive && <button className={button} onClick={() => closureAction('reopen', { reason: window.prompt('Authorised reopening reason:') || '' })}>Controlled reopen</button>}</div></div>}

    {(isClosed || isArchived || closure?.status === 'CLOSED') && <details className='rounded-lg border p-4 dark:border-border-dark' open={isArchived}><summary className='cursor-pointer font-semibold'>Archive, Retention Review and Secure Destruction</summary>
      {!archive && isArchived && <div className='mt-3 flex gap-2'><input className={input} value={archivePurpose} onChange={(e) => setArchivePurpose(e.target.value)}/><button className={button} onClick={accessArchive}>Access archived file</button></div>}
      {!archive && !isArchived && <form className='mt-4 grid gap-3 md:grid-cols-2' onSubmit={createArchive}>{Object.entries({ archive_reference:'Archive reference', electronic_location:'Electronic archive location', physical_location:'Physical archive location', archive_category:'Archive category', retention_policy:'Retention policy applied', scheduled_review_date:'Scheduled review date', proposed_destruction_date:'Proposed destruction date', access_restrictions:'Access restrictions' }).map(([key, text]) => <label className='text-sm' key={key}>{text}<input className={input} type={key.includes('date') ? 'date' : 'text'} required={!['physical_location','proposed_destruction_date','access_restrictions'].includes(key)} value={archiveForm[key]} onChange={(e) => setArchiveForm({ ...archiveForm, [key]: e.target.value })}/></label>)}<button disabled={busy} className={button}>Archive formally closed matter</button></form>}
      {archive && <div className='mt-4 space-y-5'><div className='grid gap-2 text-sm md:grid-cols-3'><p><b>Reference:</b> {archive.archive_reference}</p><p><b>Review:</b> {archive.scheduled_review_date}</p><p><b>Legal hold:</b> {archive.legal_hold ? 'YES' : 'No'}</p><p><b>Location:</b> {archive.electronic_location}</p><p><b>Retention:</b> {archive.retention_policy}</p><p><b>Destruction:</b> {archive.destruction_log ? 'Recorded' : 'Not recorded'}</p></div>
        <form className='grid gap-2 md:grid-cols-2' onSubmit={recordRetention}><h4 className='font-semibold md:col-span-2'>Retention assessment</h4>{Object.entries(RETENTION_FIELDS).map(([key, text]) => <label className='text-xs' key={key}>{text}<input className={input} value={retention.assessment[key]} onChange={(e) => setRetention({ ...retention, assessment: { ...retention.assessment, [key]: e.target.value } })}/></label>)}<select className={input} value={retention.outcome} onChange={(e) => setRetention({ ...retention, outcome: e.target.value })}>{['EXTEND','LEGAL_HOLD','RETURN_ORIGINALS','PERMANENT_PRESERVATION','APPROVE_DESTRUCTION','DEFER'].map((item) => <option key={item}>{item}</option>)}</select><input className={input} placeholder='Decision reason' required value={retention.reason} onChange={(e) => setRetention({ ...retention, reason: e.target.value })}/><input className={input} type='date' value={retention.next_review_date} onChange={(e) => setRetention({ ...retention, next_review_date: e.target.value })}/><button disabled={busy} className={button}>Record retention decision</button></form>
        <form className='grid gap-2 md:grid-cols-4' onSubmit={legalHold}><h4 className='font-semibold md:col-span-4'>Legal hold control</h4><select className={input} value={hold.action} onChange={(e) => setHold({ ...hold, action: e.target.value })}><option>PLACE</option><option>RELEASE</option></select><input className={input} placeholder='Reason' required value={hold.reason} onChange={(e) => setHold({ ...hold, reason: e.target.value })}/><input className={input} placeholder='Legal authority' required value={hold.authority} onChange={(e) => setHold({ ...hold, authority: e.target.value })}/><button disabled={busy} className={button}>{hold.action === 'PLACE' ? 'Place' : 'Release'} hold</button></form>
        {!archive.destruction_log && <form className='space-y-2' onSubmit={recordDestruction}><h4 className='font-semibold'>Authorised secure destruction</h4><div className='grid gap-2 md:grid-cols-2'>{archive.document_inventory?.map((item) => <label className='rounded border p-2 text-sm' key={item.id}><input type='checkbox' disabled={item.physical_copy_retained} checked={destruction.records_approved.includes(String(item.id))} onChange={(e) => setDestruction({ ...destruction, records_approved: e.target.checked ? [...destruction.records_approved, String(item.id)] : destruction.records_approved.filter((id) => id !== String(item.id)) })}/> {item.title} {item.physical_copy_retained && '(original must first be returned)'}</label>)}</div><div className='grid gap-2 md:grid-cols-3'>{['method','performed_by','verifier','certificate_reference','backup_handling_decision'].map((key) => <input className={input} key={key} required={key !== 'certificate_reference'} placeholder={label(key)} value={destruction[key]} onChange={(e) => setDestruction({ ...destruction, [key]: e.target.value })}/>)}</div><label className='text-sm'><input type='checkbox' checked={destruction.electronic_deletion_confirmed} onChange={(e) => setDestruction({ ...destruction, electronic_deletion_confirmed: e.target.checked })}/> Electronic deletion confirmed</label><button disabled={busy || archive.legal_hold || !destruction.records_approved.length} className={button}>Record secure destruction</button></form>}
        <div><h4 className='font-semibold'>Archive access history</h4>{archive.access_history?.map((item) => <p className='text-xs' key={item.id}>{new Date(item.accessed_at).toLocaleString()} — {item.purpose}</p>)}</div>
      </div>}
    </details>}
  </section>;
}
