import React, { useState } from 'react';

import { FormButton as Button3D } from '@/components/forms';
import Select3D from '@/components/ui/Select3D';
import ElasticTextInput from '@/components/ui/ElasticTextInput';
import { Input3D } from '@/components/ui/Input3D';
import { formatDate } from '@/core/utils/dateFormatter';

const STAGES = [
  { value: 'DRAFT', label: 'Drafting' },
  { value: 'SENT', label: 'Sent to client, awaiting signature' },
  { value: 'SIGNED', label: 'Signed by the client' },
];

const FEE_ARRANGEMENTS = [
  { value: 'CONSULTATION', label: 'Consultation fee' },
  { value: 'FIXED', label: 'Fixed or agreed fee' },
  { value: 'HOURLY', label: 'Hourly fee' },
  { value: 'STAGE_BASED', label: 'Stage-based fee' },
  { value: 'MONTHLY_RETAINER', label: 'Monthly retainer' },
  { value: 'REMUNERATION_ORDER', label: 'Advocates Remuneration Order' },
  { value: 'OTHER', label: 'Other approved arrangement' },
];

const PAYMENT_TERMS = [
  'Payable in full on signing',
  'Half on signing, balance on completion',
  'Payable at each stage as the work is done',
  'Payable monthly',
  'Payable on completion',
  'As assessed under the Advocates Remuneration Order',
].map((label) => ({ value: label, label }));

const EXCLUSIONS = [
  'Appeals to a higher court',
  'Execution and enforcement of any judgment',
  'Any counterclaim or new claim',
  'Related criminal proceedings',
  'Matters outside Kenya',
].map((label) => ({ value: label, label }));

const OBJECTIVES = [
  'Compensation or damages',
  'Recovery of money owed',
  'Reinstatement or specific performance',
  'Negotiated settlement',
  'Defend the claim against the client',
  'Secure or transfer property',
  'Legal advice or opinion only',
].map((label) => ({ value: label, label }));

const REPORTING = [
  'After every court attendance or key step',
  'Monthly progress update',
  'Only when the client’s instructions are needed',
].map((label) => ({ value: label, label }));

const COMMUNICATION = [
  { value: 'PHONE', label: 'Phone call' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'SMS', label: 'SMS' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'IN_PERSON', label: 'In person at the office' },
];

const pad = (value) => String(value).padStart(2, '0');
const localDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// "Today" records the moment of saving; an earlier day is recorded at midday so time zones cannot move its date.
const resolveDay = (choice, day, letterDate) => {
  if (choice === 'TODAY') return new Date().toISOString();
  const date = choice === 'LETTER_DATE' ? letterDate : day;
  return date ? `${date}T12:00:00` : '';
};

const money = (amount) => `KES ${Number(amount).toLocaleString('en-KE')}`;

function buildFeeDescription(draft) {
  const arrangement = FEE_ARRANGEMENTS.find((item) => item.value === draft.fee_arrangement_type)?.label || '';
  if (draft.fee_arrangement_type === 'OTHER') return draft.other_fee_terms.trim();
  const fee = Number(draft.estimated_professional_fees) > 0 ? ` of ${money(draft.estimated_professional_fees)}` : '';
  return `${arrangement}${fee}. ${draft.payment_terms}.`;
}

function signatoryOptions(client) {
  const names = [
    ...(client?.client_type === 'INDIVIDUAL' && client.full_name ? [{ value: client.full_name, label: `${client.full_name} (the client)` }] : []),
    ...(client?.representatives || [])
      .filter((representative) => representative.full_legal_name)
      .map((representative) => ({
        value: representative.full_legal_name,
        label: representative.role_title ? `${representative.full_legal_name} (${representative.role_title})` : representative.full_legal_name,
      })),
  ];
  return names.filter((option, index) => names.findIndex((item) => item.value === option.value) === index);
}

function initialDraft({ client, letters, defaultAdvocate, defaultScope }) {
  return {
    responsible_advocate: defaultAdvocate || '',
    status: letters.length ? 'SIGNED' : 'DRAFT',
    scope_of_work: defaultScope || '',
    excluded_work: [],
    client_objectives: [],
    reporting_expectations: REPORTING[0].value,
    communication_method: client?.email ? 'EMAIL' : 'PHONE',
    fee_arrangement_type: 'FIXED',
    payment_terms: PAYMENT_TERMS[0].value,
    other_fee_terms: '',
    estimated_professional_fees: '',
    estimated_disbursements: '',
    required_retainer: '',
    retainer_due_date: '',
    engagement_letter_document: letters.length === 1 ? letters[0].id : '',
    sent_on: 'TODAY',
    sent_day: '',
    signed_on: 'TODAY',
    signed_day: '',
    signed_by: signatoryOptions(client)[0]?.value || '',
  };
}

export default function EngagementForm({ client, lawyerOptions, defaultAdvocate, defaultScope, busy, onSubmit }) {
  const letters = (client?.documents || []).filter((document) => document.subtype === 'ENGAGEMENT_LETTER');
  const [draft, setDraft] = useState(() => initialDraft({ client, letters, defaultAdvocate, defaultScope }));
  const set = (field) => (event) => setDraft((current) => ({ ...current, [field]: event.target.value }));
  const today = localDate(new Date());
  const signatories = signatoryOptions(client);
  const letter = letters.find((item) => item.id === draft.engagement_letter_document);
  const letterDate = letter?.document_date && letter.document_date <= today ? letter.document_date : '';
  const dayChoices = (event) => [
    { value: 'TODAY', label: `Today (${formatDate(today)})` },
    ...(event === 'signed' && letterDate ? [{ value: 'LETTER_DATE', label: `The date on the letter (${formatDate(letterDate)})` }] : []),
    { value: 'EARLIER', label: 'An earlier day' },
  ];
  const signed = draft.status === 'SIGNED';
  const hasRetainer = Number(draft.required_retainer) > 0;
  const signedChoice = draft.signed_on === 'LETTER_DATE' && !letterDate ? 'TODAY' : draft.signed_on;

  const submit = (event) => {
    event.preventDefault();
    const payload = {
      responsible_advocate: draft.responsible_advocate,
      status: draft.status,
      scope_of_work: draft.scope_of_work,
      excluded_work: draft.excluded_work.join('; '),
      client_objectives: draft.client_objectives.join('; '),
      reporting_expectations: draft.reporting_expectations,
      communication_method: draft.communication_method,
      fee_arrangement_type: draft.fee_arrangement_type,
      fee_arrangement_description: buildFeeDescription(draft),
      estimated_professional_fees: draft.estimated_professional_fees,
      estimated_disbursements: draft.estimated_disbursements,
      required_retainer: hasRetainer ? draft.required_retainer : '',
      retainer_due_date: hasRetainer ? draft.retainer_due_date : '',
      sent_at: draft.status === 'SENT' ? resolveDay(draft.sent_on, draft.sent_day) : '',
      ...(signed ? {
        engagement_letter_document: draft.engagement_letter_document,
        signed_at: resolveDay(signedChoice, draft.signed_day, letterDate),
        signed_by: draft.signed_by,
      } : {}),
    };
    onSubmit(Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== '' && value !== null && value !== undefined)));
  };

  return (
    <form className='grid gap-4 md:grid-cols-2' onSubmit={submit}>
      <Select3D label='Responsible advocate' value={draft.responsible_advocate} onChange={set('responsible_advocate')} options={lawyerOptions} required />
      <Select3D label='Where the engagement letter stands' value={draft.status} onChange={set('status')} options={STAGES} required />
      <div className='md:col-span-2'>
        <ElasticTextInput label='Scope of work' value={draft.scope_of_work} onChange={set('scope_of_work')} required />
        <p className='mt-1 text-xs text-text-muted-light dark:text-text-muted-dark'>Taken from the scope confirmed when the firm accepted the matter.</p>
      </div>
      <Select3D label='Work expressly excluded' value={draft.excluded_work} onChange={set('excluded_work')} options={EXCLUSIONS} multiple placeholder='Nothing excluded' />
      <Select3D label='Client objectives' value={draft.client_objectives} onChange={set('client_objectives')} options={OBJECTIVES} multiple placeholder='Select what the client wants' />
      <Select3D label='Reporting to the client' value={draft.reporting_expectations} onChange={set('reporting_expectations')} options={REPORTING} required />
      <Select3D label='Preferred way to reach the client' value={draft.communication_method} onChange={set('communication_method')} options={COMMUNICATION} required />

      <Select3D label='Fee arrangement' value={draft.fee_arrangement_type} onChange={set('fee_arrangement_type')} options={FEE_ARRANGEMENTS} required />
      {draft.fee_arrangement_type === 'OTHER' ? (
        <ElasticTextInput label='Agreed fee terms' value={draft.other_fee_terms} onChange={set('other_fee_terms')} required />
      ) : (
        <Select3D label='When the fee is paid' value={draft.payment_terms} onChange={set('payment_terms')} options={PAYMENT_TERMS} required />
      )}
      <Input3D label='Agreed professional fee (KES)' name='engagement-estimated_professional_fees' type='number' min='0' step='1' value={draft.estimated_professional_fees} onChange={set('estimated_professional_fees')} />
      <Input3D label='Estimated disbursements (KES)' name='engagement-estimated_disbursements' type='number' min='0' step='1' value={draft.estimated_disbursements} onChange={set('estimated_disbursements')} />
      <Input3D label='Deposit required before work starts (KES)' name='engagement-required_retainer' type='number' min='0' step='1' value={draft.required_retainer} onChange={set('required_retainer')} />
      {hasRetainer && (
        <Input3D label='Deposit due by' name='engagement-retainer_due_date' type='date' min={today} value={draft.retainer_due_date} onChange={set('retainer_due_date')} required />
      )}
      {draft.fee_arrangement_type !== 'OTHER' && (
        <p className='text-sm text-text-muted-light dark:text-text-muted-dark md:col-span-2'>Fee terms recorded: <strong>{buildFeeDescription(draft)}</strong></p>
      )}

      {draft.status === 'SENT' && (
        <>
          <Select3D label='Sent to the client on' value={draft.sent_on} onChange={set('sent_on')} options={dayChoices('sent')} required />
          {draft.sent_on === 'EARLIER' && <Input3D label='Day sent' name='engagement-sent_day' type='date' max={today} value={draft.sent_day} onChange={set('sent_day')} required />}
        </>
      )}
      {signed && (
        <>
          <div>
            <Select3D label='Signed engagement letter' value={draft.engagement_letter_document} onChange={set('engagement_letter_document')} options={letters.map((item) => ({ value: item.id, label: `${item.reference} · ${item.title}` }))} placeholder={letters.length ? 'Select the letter from the client file' : 'None recorded yet'} required />
            {!letters.length && <p className='mt-1 text-xs text-text-muted-light dark:text-text-muted-dark'>Record it in the client&apos;s document register with the type &quot;Engagement letter / retainer agreement&quot;.</p>}
          </div>
          <Select3D label='Signed by' value={draft.signed_by} onChange={set('signed_by')} options={signatories} placeholder={signatories.length ? 'Select who signed' : 'Record an authorised representative first'} required />
          <Select3D label='Signed on' value={signedChoice} onChange={set('signed_on')} options={dayChoices('signed')} required />
          {signedChoice === 'EARLIER' && <Input3D label='Day signed' name='engagement-signed_day' type='date' max={today} value={draft.signed_day} onChange={set('signed_day')} required />}
        </>
      )}
      <div className='md:col-span-2'>
        <Button3D type='submit' variant='primary' disabled={busy}>{busy ? 'Saving...' : 'Create Engagement Version'}</Button3D>
      </div>
    </form>
  );
}
