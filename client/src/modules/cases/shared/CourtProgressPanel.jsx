import AutoGrowTextarea from '@/components/ui/AutoGrowTextarea';
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
  ['HEARING_NOTICE', 'Hearing notice served'],
  ['MEMORANDUM_OF_APPEARANCE', 'Memorandum of appearance received'],
  ['DEFENCE', 'Defence received'],
  ['REPLY_TO_DEFENCE', 'Reply to defence filed'],
  ['VERIFYING_AFFIDAVIT', 'Verifying affidavit filed'],
  ['LIST_OF_WITNESSES', 'List of witnesses filed'],
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
const SERVICE_TYPES = new Set(['SUMMONS', 'AFFIDAVIT_OF_SERVICE', 'HEARING_NOTICE']);
// Papers whose service an affidavit of service proves.
const SERVED_PAPER_TYPES = new Set(['SUMMONS', 'HEARING_NOTICE']);
const shortDate = (value) => new Date(value).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });

// The ELRC (Procedure) Rules, 2024 have no separate appearance: the respondent enters appearance and
// files a response within 28 days of service (rule 29(1)) and the claimant may reply within 7 days (rule 29(3)).
const ELRC_PAPERS = {
  DEFENCE: 'Response received',
  REPLY_TO_DEFENCE: 'Reply to response filed',
  REQUEST_FOR_JUDGMENT: 'Request for judgment in default of a response',
};
const registerTypesFor = (caseData) => (caseData.procedure_track === 'EMPLOYMENT_CLAIM'
  ? REGISTER_TYPES.filter(([value]) => value !== 'MEMORANDUM_OF_APPEARANCE').map(([value, label]) => [value, ELRC_PAPERS[value] || label])
  : REGISTER_TYPES);

// The paper the matter needs next: a demand before filing, then service, the other side's answer and the reply.
// Past that no single paper follows, so the form asks which one is being recorded.
const nextPaper = (caseData) => {
  const filed = (type) => (caseData.filings || []).some((filing) => filing.filing_type === type);
  const served = (caseData.filings || []).some((filing) => filing.filing_type === 'SUMMONS' && filing.served_at);
  if (['NOT_FILED', 'READY_FOR_FILING'].includes(caseData.court_stage)) return 'DEMAND_LETTER';
  if (['FILED', 'AWAITING_ASSESSMENT_OR_PAYMENT', 'AWAITING_SERVICE', 'SERVICE_IN_PROGRESS'].includes(caseData.court_stage)) {
    return served ? 'AFFIDAVIT_OF_SERVICE' : 'SUMMONS';
  }
  if (caseData.court_stage === 'AWAITING_RESPONSE') return 'DEFENCE';
  if (caseData.court_stage === 'PLEADINGS_OPEN' && !filed('REPLY_TO_DEFENCE')) return 'REPLY_TO_DEFENCE';
  // Before a hearing the claimant serves a hearing notice and proves it by affidavit (ELRC Rules, 2024, rule 60(1)).
  if (caseData.court_stage === 'AWAITING_HEARING' && caseData.procedure_track === 'EMPLOYMENT_CLAIM') {
    const notice = (caseData.filings || []).find((filing) => filing.filing_type === 'HEARING_NOTICE' && filing.served_at);
    if (!notice) return 'HEARING_NOTICE';
    if (!(caseData.filings || []).some((filing) => filing.served_filing === notice.id)) return 'AFFIDAVIT_OF_SERVICE';
  }
  return '';
};
// The papers a claimant files with the claim itself: ELRC (Procedure) Rules, 2024, rule 7(3), and for a
// civil suit the Civil Procedure Rules, 2010, Order 3 rule 2. They go in with the claim, under its fees.
const CLAIM_PAPERS = [
  ['VERIFYING_AFFIDAVIT', 'Verifying affidavit'],
  ['LIST_OF_WITNESSES', 'List of witnesses'],
  ['WITNESS_STATEMENT', 'Witness statement(s)'],
  ['LIST_OF_DOCUMENTS', 'Paginated list and copies of documents'],
];
const CLAIM_PAPER_TYPES = new Set(CLAIM_PAPERS.map(([value]) => value));
const claimFiling = (caseData) => (caseData.filings || []).find((filing) => ['ORIGINATING_CLAIM', 'PLAINT'].includes(filing.filing_type));
// Only a claimant's own filed claim carries these papers.
const claimPapersFor = (caseData) => {
  const claim = claimFiling(caseData);
  const ours = (caseData.parties || []).find((party) => party.is_our_client);
  if (!claim || !['EMPLOYMENT_CLAIM', 'CIVIL_SUIT'].includes(caseData.procedure_track) || !['CLAIMANT', 'PLAINTIFF'].includes(ours?.party_role)) return null;
  return {
    rule: caseData.procedure_track === 'EMPLOYMENT_CLAIM' ? 'ELRC (Procedure) Rules, 2024, rule 7(3)' : 'Civil Procedure Rules, 2010, Order 3 rule 2',
    claim,
    papers: CLAIM_PAPERS.map(([value, label]) => ({ value, label, filings: (caseData.filings || []).filter((filing) => filing.filing_type === value && !filing.filed_by_adverse) })),
  };
};
// A demand letter is not filed in court, and the other side's papers carry their own fees and receipts.
const NOT_FILED_IN_COURT = new Set(['DEMAND_LETTER']);
const OTHER_SIDE_PAPERS = new Set(['DEFENCE', 'MEMORANDUM_OF_APPEARANCE']);
// Papers either side files, e.g. the respondent's witness statements served under a court direction.
const EITHER_SIDE_PAPERS = new Set(['LIST_OF_WITNESSES', 'WITNESS_STATEMENT', 'LIST_OF_DOCUMENTS', 'NOTICE_OF_MOTION', 'SUBMISSIONS', 'OTHER']);

const inputClass = 'form-control';
const friendly = (value) => (value || '').replaceAll('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

const emptyFiling = {
  filing_date: '', official_court_case_number: '', efiling_reference: '', court_station: '',
  registry: '', court_fee_amount: '', payment_reference: '', payment_date: '',
};
const emptyEntry = {
  filing_type: '', title: '', filed_at: '', served_at: '', response_period_days: '14', response_due_date: '',
  efiling_reference: '', court_fee_amount: '', payment_reference: '', receipt_number: '', filed_by_party: '',
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
// A register title written from the paper and the other side, e.g. "Summons and statement of claim served on Baraka Supplies Limited".
const titleFor = (paper, caseData, label, filer) => {
  const other = (caseData.parties || []).find((party) => party.is_adverse)?.name || caseData.defendant || 'the other side';
  const elrc = caseData.procedure_track === 'EMPLOYMENT_CLAIM';
  const claim = elrc ? 'statement of claim' : 'plaint';
  const client = (caseData.parties || []).find((party) => party.is_our_client)?.name || caseData.client?.full_name || 'the client';
  const role = elrc ? 'Claimant' : 'Plaintiff';
  if (filer?.is_adverse) {
    const theirs = filer.role_label || 'Respondent';
    const adverseTitles = {
      LIST_OF_WITNESSES: `${theirs}'s list of witnesses`,
      WITNESS_STATEMENT: `${theirs}'s witness statement(s)`,
      LIST_OF_DOCUMENTS: `${theirs}'s list and copies of documents`,
      NOTICE_OF_MOTION: `${theirs}'s notice of motion`,
      SUBMISSIONS: `${theirs}'s written submissions`,
    };
    if (adverseTitles[paper]) return adverseTitles[paper];
  }
  const titles = {
    DEMAND_LETTER: `Demand letter to ${other}`,
    SUMMONS: `Summons and ${claim} served on ${other}`,
    AFFIDAVIT_OF_SERVICE: `Affidavit of service on ${other}`,
    HEARING_NOTICE: `Hearing notice${caseData.next_court_date ? ` for ${shortDate(caseData.next_court_date)}` : ''} served on ${other}`,
    MEMORANDUM_OF_APPEARANCE: `Memorandum of appearance by ${other}`,
    DEFENCE: `${elrc ? 'Response' : 'Defence'} by ${other}`,
    REPLY_TO_DEFENCE: `Reply to ${elrc ? 'response' : 'defence'} of ${other}`,
    VERIFYING_AFFIDAVIT: `Verifying affidavit of ${client}`,
    LIST_OF_WITNESSES: `${role}'s list of witnesses`,
    WITNESS_STATEMENT: `Witness statement of ${client}`,
    LIST_OF_DOCUMENTS: `${role}'s paginated list and copies of documents`,
  };
  return titles[paper] || label;
};

const pad = (value) => String(value).padStart(2, '0');
const localDate = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const localDateTime = (date = new Date()) => `${localDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
const addDays = (day, days) => {
  const [year, month, date] = day.split('-').map(Number);
  return localDate(new Date(year, month - 1, date + days));
};
const ELRC_RESPONSE_DAYS = 28;
const compact = (object) => Object.fromEntries(Object.entries(object).filter(([, value]) => value !== '' && value !== null));

export default function CourtProgressPanel({ caseData, canRecordFilings = true, showStage = true }) {
  // Dates default to the server's clock (sent with the matter), so a wrong device clock does not date a record.
  const [clockOffset] = useState(() => (caseData.server_now ? new Date(caseData.server_now).getTime() - Date.now() : 0));
  const today = () => localDate(new Date(Date.now() + clockOffset));
  const nowLocal = () => localDateTime(new Date(Date.now() + clockOffset));
  const queryClient = useQueryClient();
  const caseId = caseData.id;
  const [selected, setSelected] = useState('');
  const [reason, setReason] = useState('');
  const freshFiling = () => ({
    ...emptyFiling,
    filing_date: today(),
    payment_date: today(),
    // What the matter already records about its court is carried in, not typed again.
    court_station: caseData.court_station || '',
    registry: caseData.registry || '',
    efiling_reference: caseData.court_proceeding?.efiling_reference || caseData.efiling_reference || '',
  });
  const [filing, setFiling] = useState(freshFiling);
  const [serviceFiled, setServiceFiled] = useState(false);
  // What is recorded has just happened, so its times start at now; at the ELRC the response is due 28 days after service.
  const freshEntry = () => {
    const now = nowLocal();
    // Each paper has its own e-filing reference, fees and receipt, read from that paper's e-filing record.
    return { ...emptyEntry, filed_at: now, served_at: now, response_due_date: caseData.procedure_track === 'EMPLOYMENT_CLAIM' ? addDays(today(), ELRC_RESPONSE_DAYS) : '' };
  };
  const [entry, setEntry] = useState(freshEntry);
  const claimPapers = claimPapersFor(caseData);
  // A paper filed with the claim went in the same e-filing submission: it carries the claim's date and reference.
  const claimDate = claimPapers ? localDateTime(new Date(claimPapers.claim.filed_at)) : '';
  const claimReference = claimPapers?.claim.efiling_reference || '';
  const startClaimPaper = (value) => {
    setEntry({ ...freshEntry(), filing_type: value, filed_at: claimDate, efiling_reference: claimReference });
    setEntryFeedback(null);
    document.getElementById('filing-register-form')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };
  const registerTypes = registerTypesFor(caseData);
  const isElrc = caseData.procedure_track === 'EMPLOYMENT_CLAIM';
  // Until a paper is chosen, the form offers the one the matter needs next, following it as the matter moves on.
  const paper = entry.filing_type || nextPaper(caseData);
  // An affidavit of service swears to the service already recorded, so it repeats that date and the response it set.
  const summons = (caseData.filings || []).find((filing) => filing.filing_type === 'SUMMONS' && filing.served_at);
  // An affidavit of service names the paper it proves: the latest served paper without one, unless chosen.
  const servedPapers = (caseData.filings || []).filter((filing) => SERVED_PAPER_TYPES.has(filing.filing_type) && filing.served_at);
  const unproved = servedPapers.find((filing) => filing.filing_type !== 'SUMMONS' && !(caseData.filings || []).some((other) => other.served_filing === filing.id));
  const provedPaper = paper === 'AFFIDAVIT_OF_SERVICE'
    ? servedPapers.find((filing) => filing.id === entry.served_filing) || unproved || summons
    : null;
  const provesNotice = provedPaper?.filing_type === 'HEARING_NOTICE';
  const fromSummons = paper === 'AFFIDAVIT_OF_SERVICE' && summons && !provesNotice && !entry.serviceEdited;
  const servedAt = provesNotice ? localDateTime(new Date(provedPaper.served_at)) : fromSummons ? localDateTime(new Date(summons.served_at)) : entry.served_at;
  const responseDue = fromSummons ? summons.response_due_date || entry.response_due_date : entry.response_due_date;
  // Only the summons starts the response period; a hearing notice gives the hearing date.
  const startsResponse = paper === 'SUMMONS' || (paper === 'AFFIDAVIT_OF_SERVICE' && !provesNotice);
  // Who filed the paper: the other side for its own papers, a chosen party for papers either side files.
  const filingParties = (caseData.parties || []).filter((party) => party.is_our_client || party.is_adverse);
  const ourParty = filingParties.find((party) => party.is_our_client);
  const filerId = EITHER_SIDE_PAPERS.has(paper) ? (entry.filed_by_party || ourParty?.id || '') : '';
  const filer = filingParties.find((party) => party.id === filerId);
  const theirPaper = OTHER_SIDE_PAPERS.has(paper) || Boolean(filer?.is_adverse);
  const defaultTitle = provesNotice
    ? `Affidavit of service of hearing notice on ${(caseData.parties || []).find((party) => party.is_adverse)?.name || 'the other side'}`
    : titleFor(paper, caseData, registerTypes.find(([value]) => value === paper)?.[1] || '', filer);
  const title = entry.title || defaultTitle;
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
      setFiling(freshFiling());
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
      title,
      filed_at: toIso(entry.filed_at),
      served_at: SERVICE_TYPES.has(paper) ? toIso(servedAt) : null,
      response_due_date: startsResponse ? responseDue : null,
      served_filing: provesNotice ? provedPaper.id : null,
      response_period_days: paper === 'DEMAND_LETTER' ? Number(entry.response_period_days) : null,
      // Only the fields shown for this paper are sent.
      efiling_reference: NOT_FILED_IN_COURT.has(paper) ? null : entry.efiling_reference,
      filed_by_party: filerId || null,
      ...(NOT_FILED_IN_COURT.has(paper) || theirPaper || CLAIM_PAPER_TYPES.has(paper) ? {} : {
        court_fee_amount: entry.court_fee_amount,
        payment_reference: entry.payment_reference,
        receipt_number: entry.receipt_number,
      }),
    });
    setBusy(true);
    try {
      const { data } = await axiosInstance.post(`/cases/${caseId}/filings/`, payload);
      setEntryFeedback({ tone: 'success', text: `Recorded. Next action: ${data.next_action || 'none pending'}.` });
      setEntry(freshEntry());
      refresh();
    } catch (error) { if (error?.isActionCancelled) return;
      setEntryFeedback({ tone: 'error', text: getApiErrorMessage(error, 'The entry could not be recorded.') });
    } finally {
      setBusy(false);
    }
  };

  const updateFiling = (event) => setFiling((current) => ({ ...current, [event.target.name]: event.target.value }));
  const updateEntry = (event) => setEntry((current) => {
    const next = { ...current, [event.target.name]: event.target.value };
    const adverseChosen = filingParties.find((party) => party.id === next.filed_by_party)?.is_adverse;
    if (event.target.name === 'filed_by_party' && adverseChosen) {
      // The other side's paper is dated when it reaches us and carries its own reference, not our claim's.
      next.filed_at = nowLocal();
      next.efiling_reference = '';
      next.title = '';
    }
    if (event.target.name === 'filed_by_party' && !adverseChosen) next.title = '';
    if (['served_filing', 'filing_type'].includes(event.target.name)) next.title = '';
    if (event.target.name === 'filing_type' && CLAIM_PAPER_TYPES.has(event.target.value) && claimDate && !adverseChosen) {
      next.filed_at = claimDate;
      next.efiling_reference = claimReference;
    }
    if (['served_at', 'response_due_date'].includes(event.target.name) && !current.serviceEdited) {
      // Editing either service field starts from what the form was showing.
      next.served_at = event.target.name === 'served_at' ? event.target.value : servedAt;
      next.response_due_date = event.target.name === 'response_due_date' ? event.target.value : responseDue;
      next.serviceEdited = true;
    }
    if (event.target.name === 'served_at' && isElrc && event.target.value) {
      next.response_due_date = addDays(event.target.value.slice(0, 10), ELRC_RESPONSE_DAYS);
    }
    return next;
  });

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

      {claimPapers && (
        <section className={`rounded-xl border border-border-light p-4 dark:border-border-dark ${showStage ? 'mt-5' : ''}`} aria-label='Papers filed with the claim'>
          <h4 className='font-semibold'>Papers filed with the claim</h4>
          <p className='text-xs text-text-muted-light dark:text-text-muted-dark'>{claimPapers.rule}. Filed with the claim on {new Date(claimPapers.claim.filed_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}{claimPapers.claim.efiling_reference ? ` (${claimPapers.claim.efiling_reference})` : ''}; the copies stay in the physical matter file.</p>
          <ul className='mt-3 space-y-2 text-sm'>
            {claimPapers.papers.map((item) => (
              <li key={item.value} className='flex flex-wrap items-center justify-between gap-2'>
                <span>{item.label}</span>
                {item.filings.length ? (
                  <span className='font-semibold text-green-700 dark:text-green-300'>Recorded{item.filings[0].efiling_reference ? ` · ${item.filings[0].efiling_reference}` : ''}{item.filings.length > 1 ? ` · ${item.filings.length} entries` : ''}</span>
                ) : (
                  <span className='flex items-center gap-3'>
                    <span className='font-semibold text-red-700 dark:text-red-300'>Not recorded</span>
                    {canRecordFilings && <button type='button' onClick={() => startClaimPaper(item.value)} className='font-semibold text-brand-primary hover:underline'>Record</button>}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Papers are recorded first (a demand, a filing, service); the court stage then moves on them. */}
      {canRecordFilings && (
        <form id='filing-register-form' onSubmit={submitEntry} className={`grid gap-3 md:grid-cols-2 ${showStage || claimPapers ? 'mt-5' : ''}`} aria-label='Record in the filing register'>
          <div className='flex items-center gap-2 md:col-span-2'>
            <NotebookPen size={18} className='text-brand-primary' />
            <h4 className='font-semibold'>Filing register</h4>
          </div>
          <Field label='Paper'>
            <select name='filing_type' value={paper} onChange={updateEntry} className={inputClass} required>
              <option value=''>Select the paper</option>
              {registerTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          {EITHER_SIDE_PAPERS.has(paper) && filingParties.length > 1 && (
            <Field label='Filed by'>
              <select name='filed_by_party' value={filerId} onChange={updateEntry} className={inputClass} required>
                {filingParties.map((party) => <option key={party.id} value={party.id}>{party.name} ({party.role_label}{party.is_our_client ? ', our client' : ''})</option>)}
              </select>
            </Field>
          )}
          <Field label='Title'><input name='title' value={title} onChange={updateEntry} className={inputClass} /></Field>
          <Field label={paper === 'DEMAND_LETTER' ? 'Date issued' : theirPaper ? 'Date served on us' : 'Date filed / received'}>
            <input type='datetime-local' name='filed_at' max={nowLocal()} value={entry.filed_at} onChange={updateEntry} className={inputClass} />
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
          {paper === 'AFFIDAVIT_OF_SERVICE' && servedPapers.length > 1 && (
            <Field label='Proves service of'>
              <select name='served_filing' value={provedPaper?.id || ''} onChange={updateEntry} className={inputClass} required>
                {servedPapers.map((filing) => <option key={filing.id} value={filing.id}>{filing.title} (served {shortDate(filing.served_at)})</option>)}
              </select>
            </Field>
          )}
          {SERVICE_TYPES.has(paper) && (
            <>
            {startsResponse && <Field label={isElrc ? 'Response due date (28 days after service)' : 'Appearance due date in summons / court order'}>
              <input type='date' name='response_due_date' value={responseDue} onChange={updateEntry} className={inputClass} required />
              <span className='block text-xs font-normal'>The advocate verifies this date in the matter deadlines before relying on it.</span>
            </Field>}
            <Field label='Date served'>
              <input type='datetime-local' name='served_at' max={nowLocal()} value={servedAt} onChange={updateEntry} className={inputClass} required readOnly={provesNotice} />
            </Field>
            </>
          )}
          {!NOT_FILED_IN_COURT.has(paper) && (
            <Field label='E-filing reference'><input name='efiling_reference' value={entry.efiling_reference} onChange={updateEntry} className={inputClass} /></Field>
          )}
          {!NOT_FILED_IN_COURT.has(paper) && !theirPaper && !CLAIM_PAPER_TYPES.has(paper) && (
            <>
            <Field label='Court fees (KES)'><input type='number' step='0.01' min='0' name='court_fee_amount' value={entry.court_fee_amount} onChange={updateEntry} className={inputClass} /></Field>
            <Field label='Payment reference'><input name='payment_reference' value={entry.payment_reference} onChange={updateEntry} className={inputClass} /></Field>
            <Field label='Receipt number'><input name='receipt_number' value={entry.receipt_number} onChange={updateEntry} className={inputClass} /></Field>
            </>
          )}
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
            <Field label='Filing date'><input type='date' name='filing_date' max={today()} value={filing.filing_date} onChange={updateFiling} className={inputClass} required /></Field>
            <Field label='Court case number'><input name='official_court_case_number' value={filing.official_court_case_number} onChange={updateFiling} placeholder='As stamped by the court, e.g. ELRC Cause No. E512 of 2026' className={inputClass} required /></Field>
            <Field label='E-filing reference'><input name='efiling_reference' value={filing.efiling_reference} onChange={updateFiling} className={inputClass} /></Field>
            <Field label='Court station'><input name='court_station' value={filing.court_station} onChange={updateFiling} placeholder={caseData.court_station || 'Milimani Commercial Courts'} className={inputClass} required={!caseData.court_station} /></Field>
            <Field label='Registry'><input name='registry' value={filing.registry} onChange={updateFiling} className={inputClass} required={!caseData.registry} /></Field>
            <Field label='Court fees paid (KES)'><input type='number' step='0.01' min='0' name='court_fee_amount' value={filing.court_fee_amount} onChange={updateFiling} className={inputClass} /></Field>
            <Field label='Payment reference (e.g. M-Pesa code)'><input name='payment_reference' value={filing.payment_reference} onChange={updateFiling} className={inputClass} /></Field>
            <Field label='Payment date'><input type='date' name='payment_date' max={today()} value={filing.payment_date} onChange={updateFiling} className={inputClass} /></Field>
          </>
        )}

        {dimension === 'COURT_STAGE' && toState === 'AWAITING_RESPONSE' && (
          <label className='flex items-start gap-2 text-sm md:col-span-2'>
            <input type='checkbox' checked={serviceFiled} onChange={(event) => setServiceFiled(event.target.checked)} className='mt-1' required />
            <span>The affidavit of service has been filed.</span>
          </label>
        )}

        <Field label='Reason / note for the record' wide>
          <AutoGrowTextarea value={reason} onChange={(event) => setReason(event.target.value)} className={inputClass} required placeholder='e.g. Claim filed through the Judiciary e-filing portal' />
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
