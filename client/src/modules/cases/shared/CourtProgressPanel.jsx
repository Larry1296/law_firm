import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Gavel, NotebookPen } from 'lucide-react';

import Card from '@/components/ui/Card';
import axiosInstance from '@/core/api/axios';
import { getApiErrorMessage } from '@/core/utils/errorMessages';

const COURT_DIMENSIONS = ['COURT_STAGE', 'OUTCOME_STATUS', 'ENFORCEMENT_STATUS', 'APPEAL_STATUS'];
const DIMENSION_LABELS = {
  COURT_STAGE: 'Court stage',
  OUTCOME_STATUS: 'Outcome',
  ENFORCEMENT_STATUS: 'Enforcement',
  APPEAL_STATUS: 'Appeal',
};

// Papers recorded as they are issued, filed or served outside the system.
// The plaint is recorded by moving the matter to Filed.
const REGISTER_TYPES = [
  ['DEMAND_LETTER', 'Demand letter issued'],
  ['SUMMONS', 'Summons served'],
  ['AFFIDAVIT_OF_SERVICE', 'Affidavit of service filed'],
  ['MEMORANDUM_OF_APPEARANCE', 'Memorandum of appearance received'],
  ['DEFENCE', 'Defence received'],
  ['REPLY_TO_DEFENCE', 'Reply to defence filed'],
  ['LIST_OF_DOCUMENTS', 'List of documents filed'],
  ['WITNESS_STATEMENT', 'Witness statement filed'],
  ['NOTICE_OF_MOTION', 'Notice of motion filed'],
  ['SUBMISSIONS', 'Written submissions filed'],
  ['REQUEST_FOR_JUDGMENT', 'Request for judgment (Order 10)'],
  ['CONSENT', 'Consent / settlement recorded'],
  ['DECREE', 'Decree issued'],
  ['BILL_OF_COSTS', 'Bill of costs filed'],
  ['CERTIFICATE_OF_COSTS', 'Certificate of costs issued'],
  ['WARRANT_OF_ATTACHMENT', 'Warrant of attachment issued'],
  ['NOTICE_OF_APPEAL', 'Notice of appeal filed'],
  ['OTHER', 'Other paper'],
];
const SERVICE_TYPES = new Set(['SUMMONS', 'AFFIDAVIT_OF_SERVICE']);

// The ELRC (Procedure) Rules, 2016 have no appearance: the respondent files a response within
// 21 days of service and the claimant may reply to it.
const ELRC_PAPERS = {
  DEFENCE: 'Response received',
  REPLY_TO_DEFENCE: 'Reply to response filed',
  REQUEST_FOR_JUDGMENT: 'Request for judgment in default of a response',
};
const registerTypesFor = (caseData) => (caseData.procedure_track === 'EMPLOYMENT_CLAIM'
  ? REGISTER_TYPES.filter(([value]) => value !== 'MEMORANDUM_OF_APPEARANCE').map(([value, label]) => [value, ELRC_PAPERS[value] || label])
  : REGISTER_TYPES);

// The paper the matter needs next: a demand before filing, then service, then the other side's answer.
const nextPaper = (caseData) => {
  const served = (caseData.filings || []).some((filing) => filing.filing_type === 'SUMMONS' && filing.served_at);
  if (['NOT_FILED', 'READY_FOR_FILING'].includes(caseData.court_stage)) return 'DEMAND_LETTER';
  if (['FILED', 'AWAITING_ASSESSMENT_OR_PAYMENT', 'AWAITING_SERVICE', 'SERVICE_IN_PROGRESS'].includes(caseData.court_stage)) {
    return served ? 'AFFIDAVIT_OF_SERVICE' : 'SUMMONS';
  }
  if (caseData.court_stage === 'AWAITING_RESPONSE') return 'DEFENCE';
  return 'DEMAND_LETTER';
};

const inputClass = 'form-control';
const friendly = (value) => (value || '').replaceAll('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

const emptyFiling = {
  filing_date: '', official_court_case_number: '', efiling_reference: '', court_station: '',
  registry: '', court_fee_amount: '', payment_reference: '', payment_date: '',
};
const emptyEntry = {
  filing_type: '', title: '', filed_at: '', served_at: '', response_period_days: '14', response_due_date: '',
  efiling_reference: '', court_fee_amount: '', payment_reference: '', receipt_number: '',
};

function Field({ label, children, wide = false }) {
  return (
    <label className={`space-y-1 text-sm font-semibold ${wide ? 'md:col-span-2' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function Feedback({ feedback }) {
  if (!feedback) return null;
  return (
    <p role={feedback.tone === 'error' ? 'alert' : 'status'} className={`mt-3 rounded-lg p-3 text-sm ${feedback.tone === 'error' ? 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200' : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'}`}>
      {feedback.text}
    </p>
  );
}

const toIso = (value) => (value ? new Date(value).toISOString() : null);
const compact = (object) => Object.fromEntries(Object.entries(object).filter(([, value]) => value !== '' && value !== null));

export default function CourtProgressPanel({ caseData, canRecordFilings = true, showStage = true }) {
  const queryClient = useQueryClient();
  const caseId = caseData.id;
  const [selected, setSelected] = useState('');
  const [reason, setReason] = useState('');
  const [filing, setFiling] = useState(emptyFiling);
  const [serviceFiled, setServiceFiled] = useState(false);
  const [entry, setEntry] = useState(emptyEntry);
  const registerTypes = registerTypesFor(caseData);
  const isElrc = caseData.procedure_track === 'EMPLOYMENT_CLAIM';
  // Until a paper is chosen, the form offers the one the matter needs next, following it as the matter moves on.
  const paper = entry.filing_type || nextPaper(caseData);
  const [busy, setBusy] = useState(false);
  const [stageFeedback, setStageFeedback] = useState(null);
  const [entryFeedback, setEntryFeedback] = useState(null);

  const transitions = (caseData.available_transitions || []).filter((item) => COURT_DIMENSIONS.includes(item.dimension));
  const [dimension, toState] = selected.split(':');
  const refresh = () => queryClient.invalidateQueries({ predicate: (query) => JSON.stringify(query.queryKey).includes(caseId) });

  const submitTransition = async (event) => {
    event.preventDefault();
    setStageFeedback(null);
    let metadata = {};
    if (dimension === 'COURT_STAGE' && toState === 'FILED') metadata = compact(filing);
    if (dimension === 'COURT_STAGE' && toState === 'AWAITING_RESPONSE') metadata = { affidavit_of_service_filed: serviceFiled };
    setBusy(true);
    try {
      await axiosInstance.post(`/cases/${caseId}/transitions/`, { dimension, to_state: toState, reason, metadata });
      setStageFeedback({ tone: 'success', text: `${DIMENSION_LABELS[dimension]} updated.` });
      setSelected('');
      setReason('');
      setFiling(emptyFiling);
      setServiceFiled(false);
      refresh();
    } catch (error) { if (error?.isActionCancelled) return;
      setStageFeedback({ tone: 'error', text: getApiErrorMessage(error, 'The update could not be saved.') });
    } finally {
      setBusy(false);
    }
  };

  const submitEntry = async (event) => {
    event.preventDefault();
    setEntryFeedback(null);
    const payload = compact({
      filing_type: paper,
      title: entry.title,
      filed_at: toIso(entry.filed_at),
      served_at: SERVICE_TYPES.has(paper) ? toIso(entry.served_at) : null,
      response_due_date: SERVICE_TYPES.has(paper) ? entry.response_due_date : null,
      response_period_days: paper === 'DEMAND_LETTER' ? Number(entry.response_period_days) : null,
      efiling_reference: entry.efiling_reference,
      court_fee_amount: entry.court_fee_amount,
      payment_reference: entry.payment_reference,
      receipt_number: entry.receipt_number,
    });
    setBusy(true);
    try {
      const { data } = await axiosInstance.post(`/cases/${caseId}/filings/`, payload);
      setEntryFeedback({ tone: 'success', text: `Recorded. Next action: ${data.next_action || 'none pending'}.` });
      setEntry(emptyEntry);
      refresh();
    } catch (error) { if (error?.isActionCancelled) return;
      setEntryFeedback({ tone: 'error', text: getApiErrorMessage(error, 'The entry could not be recorded.') });
    } finally {
      setBusy(false);
    }
  };

  const updateFiling = (event) => setFiling((current) => ({ ...current, [event.target.name]: event.target.value }));
  const updateEntry = (event) => setEntry((current) => ({ ...current, [event.target.name]: event.target.value }));

  return (
    <Card className='p-6'>
      <div className='mb-4 flex items-center gap-2'>
        <Gavel size={20} className='text-brand-primary' />
        <h3 className='text-lg font-semibold text-text-primary-light dark:text-text-primary-dark'>Court progress</h3>
      </div>

      {showStage && (
        <dl className='grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4'>
        <div><dt className='text-text-muted-light dark:text-text-muted-dark'>Court stage</dt><dd className='font-semibold'>{friendly(caseData.court_stage)}</dd></div>
        <div><dt className='text-text-muted-light dark:text-text-muted-dark'>Outcome</dt><dd className='font-semibold'>{friendly(caseData.outcome_status)}</dd></div>
        <div><dt className='text-text-muted-light dark:text-text-muted-dark'>Enforcement</dt><dd className='font-semibold'>{friendly(caseData.enforcement_status)}</dd></div>
        <div><dt className='text-text-muted-light dark:text-text-muted-dark'>Next action</dt><dd className='font-semibold'>{caseData.next_action || 'None pending'}</dd></div>
      </dl>
      )}

      {/* Papers are recorded first (a demand, a filing, service); the court stage then moves on them. */}
      {canRecordFilings && (
        <form onSubmit={submitEntry} className={`grid gap-3 md:grid-cols-2 ${showStage ? 'mt-5' : ''}`} aria-label='Record in the filing register'>
          <div className='flex items-center gap-2 md:col-span-2'>
            <NotebookPen size={18} className='text-brand-primary' />
            <h4 className='font-semibold'>Filing register</h4>
          </div>
          <Field label='Paper'>
            <select name='filing_type' value={paper} onChange={updateEntry} className={inputClass}>
              {registerTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label='Title (optional)'><input name='title' value={entry.title} onChange={updateEntry} className={inputClass} /></Field>
          <Field label={paper === 'DEMAND_LETTER' ? 'Date issued' : 'Date filed / received'}>
            <input type='datetime-local' name='filed_at' value={entry.filed_at} onChange={updateEntry} className={inputClass} />
          </Field>
          {paper === 'DEMAND_LETTER' && (
            <Field label='Demand period'>
              <select name='response_period_days' value={entry.response_period_days} onChange={updateEntry} className={inputClass}>
                <option value='7'>7 days</option>
                <option value='14'>14 days</option>
                <option value='21'>21 days</option>
              </select>
            </Field>
          )}
          {SERVICE_TYPES.has(paper) && (
            <>
            <Field label={isElrc ? 'Response due date (21 days after service)' : 'Appearance due date in summons / court order'}>
              <input type='date' name='response_due_date' value={entry.response_due_date} onChange={updateEntry} className={inputClass} required />
              <span className='block text-xs font-normal'>The advocate verifies this date in the matter deadlines before relying on it.</span>
            </Field>
            <Field label='Date served'>
              <input type='datetime-local' name='served_at' value={entry.served_at} onChange={updateEntry} className={inputClass} required />
            </Field>
            </>
          )}
          <Field label='E-filing reference'><input name='efiling_reference' value={entry.efiling_reference} onChange={updateEntry} className={inputClass} /></Field>
          <Field label='Court fees (KES)'><input type='number' step='0.01' min='0' name='court_fee_amount' value={entry.court_fee_amount} onChange={updateEntry} className={inputClass} /></Field>
          <Field label='Payment reference'><input name='payment_reference' value={entry.payment_reference} onChange={updateEntry} className={inputClass} /></Field>
          <Field label='Receipt number'><input name='receipt_number' value={entry.receipt_number} onChange={updateEntry} className={inputClass} /></Field>
          <div className='md:col-span-2'>
            <button type='submit' disabled={busy} className='inline-flex min-h-11 items-center rounded-lg bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50'>
              Record in register
            </button>
          </div>
          <div className='md:col-span-2'><Feedback feedback={entryFeedback} /></div>
        </form>
      )}

      {showStage && (<>
      <form onSubmit={submitTransition} className={`grid gap-3 md:grid-cols-2 ${canRecordFilings ? 'mt-6 border-t border-border-light pt-6 dark:border-border-dark' : 'mt-5'}`} aria-label='Record court progress'>
        <Field label='What has happened' wide>
          <select value={selected} onChange={(event) => { setSelected(event.target.value); setStageFeedback(null); }} className={inputClass} required>
            <option value=''>{transitions.length ? 'Select the step reached' : 'No court step is available at this stage'}</option>
            {transitions.map((item) => (
              <option key={`${item.dimension}:${item.to_state}`} value={`${item.dimension}:${item.to_state}`}>
                {DIMENSION_LABELS[item.dimension]}: {item.label || friendly(item.to_state)}
              </option>
            ))}
          </select>
        </Field>

        {dimension === 'COURT_STAGE' && toState === 'FILED' && (
          <>
            <Field label='Filing date'><input type='date' name='filing_date' value={filing.filing_date} onChange={updateFiling} className={inputClass} required /></Field>
            <Field label='Court case number'><input name='official_court_case_number' value={filing.official_court_case_number} onChange={updateFiling} placeholder='As stamped by the court, e.g. ELRC Cause No. E512 of 2026' className={inputClass} required /></Field>
            <Field label='E-filing reference'><input name='efiling_reference' value={filing.efiling_reference} onChange={updateFiling} className={inputClass} /></Field>
            <Field label='Court station'><input name='court_station' value={filing.court_station} onChange={updateFiling} placeholder={caseData.court_station || 'Milimani Commercial Courts'} className={inputClass} required={!caseData.court_station} /></Field>
            <Field label='Registry'><input name='registry' value={filing.registry} onChange={updateFiling} className={inputClass} required={!caseData.registry} /></Field>
            <Field label='Court fees paid (KES)'><input type='number' step='0.01' min='0' name='court_fee_amount' value={filing.court_fee_amount} onChange={updateFiling} className={inputClass} /></Field>
            <Field label='Payment reference (e.g. M-Pesa code)'><input name='payment_reference' value={filing.payment_reference} onChange={updateFiling} className={inputClass} /></Field>
            <Field label='Payment date'><input type='date' name='payment_date' value={filing.payment_date} onChange={updateFiling} className={inputClass} /></Field>
          </>
        )}

        {dimension === 'COURT_STAGE' && toState === 'AWAITING_RESPONSE' && (
          <label className='flex items-start gap-2 text-sm md:col-span-2'>
            <input type='checkbox' checked={serviceFiled} onChange={(event) => setServiceFiled(event.target.checked)} className='mt-1' required />
            <span>The affidavit of service has been filed.</span>
          </label>
        )}

        <Field label='Reason / note for the record' wide>
          <input value={reason} onChange={(event) => setReason(event.target.value)} className={inputClass} required placeholder='e.g. Claim filed through the Judiciary e-filing portal' />
        </Field>
        <div className='md:col-span-2'>
          <button type='submit' disabled={busy || !selected} className='inline-flex min-h-11 items-center rounded-lg bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50'>
            Save court progress
          </button>
        </div>
      </form>
      <Feedback feedback={stageFeedback} />
      </>)}
    </Card>
  );
}
