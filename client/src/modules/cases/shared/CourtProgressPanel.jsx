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

const inputClass = 'form-control';
const friendly = (value) => (value || '').replaceAll('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

const emptyFiling = {
  filing_date: '', official_court_case_number: '', efiling_reference: '', court_station: '',
  registry: '', court_fee_amount: '', payment_reference: '', payment_date: '',
};
const emptyEntry = {
  filing_type: 'DEMAND_LETTER', title: '', filed_at: '', served_at: '', response_period_days: '14',
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
    <p role={feedback.tone === 'error' ? 'alert' : 'status'} className={`mt-3 rounded-lg p-3 text-sm ${feedback.tone === 'error' ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}>
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
    } catch (error) {
      setStageFeedback({ tone: 'error', text: getApiErrorMessage(error, 'The update could not be saved.') });
    } finally {
      setBusy(false);
    }
  };

  const submitEntry = async (event) => {
    event.preventDefault();
    setEntryFeedback(null);
    const payload = compact({
      filing_type: entry.filing_type,
      title: entry.title,
      filed_at: toIso(entry.filed_at),
      served_at: SERVICE_TYPES.has(entry.filing_type) ? toIso(entry.served_at) : null,
      response_period_days: entry.filing_type === 'DEMAND_LETTER' ? Number(entry.response_period_days) : null,
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
    } catch (error) {
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

      {showStage && (<>
      <dl className='grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4'>
        <div><dt className='text-text-muted-light dark:text-text-muted-dark'>Court stage</dt><dd className='font-semibold'>{friendly(caseData.court_stage)}</dd></div>
        <div><dt className='text-text-muted-light dark:text-text-muted-dark'>Outcome</dt><dd className='font-semibold'>{friendly(caseData.outcome_status)}</dd></div>
        <div><dt className='text-text-muted-light dark:text-text-muted-dark'>Enforcement</dt><dd className='font-semibold'>{friendly(caseData.enforcement_status)}</dd></div>
        <div><dt className='text-text-muted-light dark:text-text-muted-dark'>Next action</dt><dd className='font-semibold'>{caseData.next_action || 'None pending'}</dd></div>
      </dl>

      <form onSubmit={submitTransition} className='mt-5 grid gap-3 md:grid-cols-2' aria-label='Record court progress'>
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
            <Field label='Court case number'><input name='official_court_case_number' value={filing.official_court_case_number} onChange={updateFiling} placeholder='MCCOMMSU/E1234/2026' className={inputClass} required /></Field>
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
          <input value={reason} onChange={(event) => setReason(event.target.value)} className={inputClass} required placeholder='e.g. Plaint filed through the Judiciary e-filing portal' />
        </Field>
        <div className='md:col-span-2'>
          <button type='submit' disabled={busy || !selected} className='inline-flex min-h-11 items-center rounded-lg bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50'>
            Save court progress
          </button>
        </div>
      </form>
      <Feedback feedback={stageFeedback} />
      </>)}

      {canRecordFilings && (
        <form onSubmit={submitEntry} className={`grid gap-3 md:grid-cols-2 ${showStage ? 'mt-6 border-t border-border-light pt-6 dark:border-border-dark' : ''}`} aria-label='Record in the filing register'>
          <div className='flex items-center gap-2 md:col-span-2'>
            <NotebookPen size={18} className='text-brand-primary' />
            <h4 className='font-semibold'>Filing register</h4>
          </div>
          <Field label='Paper'>
            <select name='filing_type' value={entry.filing_type} onChange={updateEntry} className={inputClass}>
              {REGISTER_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label='Title (optional)'><input name='title' value={entry.title} onChange={updateEntry} className={inputClass} /></Field>
          <Field label={entry.filing_type === 'DEMAND_LETTER' ? 'Date issued' : 'Date filed / received'}>
            <input type='datetime-local' name='filed_at' value={entry.filed_at} onChange={updateEntry} className={inputClass} />
          </Field>
          {entry.filing_type === 'DEMAND_LETTER' && (
            <Field label='Demand period'>
              <select name='response_period_days' value={entry.response_period_days} onChange={updateEntry} className={inputClass}>
                <option value='7'>7 days</option>
                <option value='14'>14 days</option>
                <option value='21'>21 days</option>
              </select>
            </Field>
          )}
          {SERVICE_TYPES.has(entry.filing_type) && (
            <Field label='Date served'>
              <input type='datetime-local' name='served_at' value={entry.served_at} onChange={updateEntry} className={inputClass} required />
            </Field>
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
    </Card>
  );
}
