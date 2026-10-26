import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { FileText, Truck } from 'lucide-react';

import AutoGrowTextarea from '@/components/ui/AutoGrowTextarea';
import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import { getApiErrorMessage } from '@/core/utils/errorMessages';
import documentsService from '@/modules/client/documents/services/documentsService';

// What each request status means to the client. Only the first two wait for the client.
const REQUEST_STATES = {
  OPEN: { label: 'Waiting for you', tone: 'bg-amber-100 text-amber-900', awaitsClient: true },
  REPLACEMENT_REQUIRED: { label: 'Replacement needed', tone: 'bg-red-100 text-red-900', awaitsClient: true },
  PENDING_SECRETARY: { label: 'On its way to the firm', tone: 'bg-blue-100 text-blue-900' },
  UPLOADED: { label: 'Received and filed, with your advocate', tone: 'bg-blue-100 text-blue-900' },
  ACCEPTED: { label: 'Accepted', tone: 'bg-emerald-100 text-emerald-900' },
  CANCELLED: { label: 'Cancelled', tone: 'bg-slate-100 text-slate-700' },
};

const DELIVERY_METHODS = [
  { value: 'IN_PERSON', label: 'I will bring it to the firm' },
  { value: 'COURIER', label: 'I will send it by courier' },
  { value: 'OTHER', label: 'Another way (explain below)' },
];

const today = () => new Date().toISOString().slice(0, 10);

function DeliveryForm({ item, onDone }) {
  const [method, setMethod] = useState('IN_PERSON');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const send = useMutation({
    mutationFn: () => documentsService.sendDeliveryNotice(item.id, { delivery_method: method, expected_delivery_date: date || null, note }),
    onSuccess: onDone,
    onError: (failure) => { if (failure?.isActionCancelled) return; return setError(getApiErrorMessage(failure, 'Your answer could not be sent.')); },
  });

  return (
    <form className='mt-3 space-y-3 rounded-lg bg-background-light p-3 dark:bg-background-dark' onSubmit={(event) => { event.preventDefault(); setError(null); send.mutate(); }}>
      <fieldset>
        <legend className='text-sm font-semibold'>How will the paper reach the firm?</legend>
        <div className='mt-2 grid gap-2 sm:grid-cols-3'>
          {DELIVERY_METHODS.map((option) => (
            <label key={option.value} className='flex items-center gap-2 text-sm'>
              <input type='radio' name={`delivery-${item.id}`} value={option.value} checked={method === option.value} onChange={() => setMethod(option.value)} />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className='grid gap-3 sm:grid-cols-2'>
        <label className='text-sm'>
          <span className='font-semibold'>When? (optional)</span>
          <input type='date' min={today()} value={date} onChange={(event) => setDate(event.target.value)} className='form-control mt-1 w-full' />
        </label>
        <label className='text-sm'>
          <span className='font-semibold'>Note for the firm (optional)</span>
          <AutoGrowTextarea maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} className='form-control mt-1 w-full' placeholder='For example, the courier and tracking number' />
        </label>
      </div>
      {error && <p role='alert' className='text-sm text-red-700'>{error}</p>}
      <button type='submit' disabled={send.isPending} className='inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50'>
        <Truck size={16} aria-hidden='true' /> {send.isPending ? 'Sending…' : 'Tell the firm'}
      </button>
    </form>
  );
}

function RequestCard({ item, highlighted }) {
  const queryClient = useQueryClient();
  const [sent, setSent] = useState(false);
  const state = REQUEST_STATES[item.status] || { label: item.status.replaceAll('_', ' '), tone: 'bg-slate-100 text-slate-700' };

  return (
    <div id={`request-${item.id}`} className={`rounded-xl border p-4 ${highlighted ? 'border-brand-primary ring-2 ring-brand-primary/30' : 'border-border-light dark:border-border-dark'}`}>
      <div className='flex flex-wrap items-start justify-between gap-2'>
        <div>
          <strong>{item.title}</strong>
          <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>
            {item.case_number} · {item.case_title}
            {item.due_date ? ` · needed by ${new Date(item.due_date).toLocaleDateString()}` : ''}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${state.tone}`}>{state.label}</span>
      </div>
      {item.instructions && <p className='mt-2 text-sm'>{item.instructions}</p>}
      {item.status === 'REPLACEMENT_REQUIRED' && item.review_notes && (
        <p className='mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-900'>Why a replacement is needed: {item.review_notes}</p>
      )}
      {item.status === 'PENDING_SECRETARY' && item.delivery_note && <p className='mt-2 text-sm'>{item.delivery_note}</p>}
      {item.reference && item.status !== 'PENDING_SECRETARY' && (
        <p className='mt-2 text-sm'>Filed by the firm as <strong>{item.reference}</strong>.</p>
      )}
      {state.awaitsClient && !sent && (
        <DeliveryForm item={item} onDone={() => { setSent(true); queryClient.invalidateQueries({ queryKey: ['client-documents'] }); }} />
      )}
      {sent && <p role='status' className='mt-2 text-sm text-emerald-700'>Thank you. The firm will receive the paper, file it and let you know.</p>}
    </div>
  );
}

const STATUS_TONE = { filed: 'text-emerald-700', 'awaiting delivery to the firm': 'text-amber-700' };

export default function ClientDocumentWorkspace({ caseId = '', compact = false }) {
  const [searchParams] = useSearchParams();
  const highlightedRequest = searchParams.get('request');
  const { data, isLoading, error } = useQuery({
    queryKey: ['client-documents', caseId],
    queryFn: () => documentsService.getDocuments(caseId ? { case_id: caseId } : {}),
  });
  const requests = data?.requests || [];
  const documents = data?.documents || [];
  const waiting = requests.filter((item) => REQUEST_STATES[item.status]?.awaitsClient);

  return <div className='space-y-6'>
    {!compact && <SectionHeading title='My documents' subtitle='Papers your firm has asked you for, and the papers it holds for you.' />}
    <Card className='p-5'>
      <h3 className='font-semibold'>Documents requested by your firm</h3>
      <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>
        Your firm keeps paper documents, so there is nothing to upload. When it needs a document, tell it here how and when you
        will bring or send the paper. The firm files it and gives it a reference you can quote.
      </p>
      {waiting.length > 0 && <p className='mt-2 text-sm font-semibold'>{waiting.length} waiting for you</p>}
      <div className='mt-3 space-y-3'>
        {requests.map((item) => <RequestCard key={item.id} item={item} highlighted={item.id === highlightedRequest} />)}
        {!isLoading && requests.length === 0 && (
          <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>Nothing has been requested from you.</p>
        )}
      </div>
    </Card>
    <Card className='p-5'>
      <h3 className='font-semibold'>Papers the firm holds for you</h3>
      {isLoading && <p className='mt-3'>Loading…</p>}
      {error && <p className='mt-3 text-error'>Could not load documents.</p>}
      <ul className='mt-3 space-y-2'>
        {documents.map((item) => (
          <li key={item.id} className='flex gap-3 rounded-xl border border-border-light p-3 dark:border-border-dark'>
            <FileText className='shrink-0' aria-hidden='true' />
            <span>
              <strong>{item.title}</strong>
              <span className='block text-xs'>
                {item.where?.reference ? `Reference ${item.where.reference}` : 'Reference given when filed'}
                {item.where?.in_file ? ` · in file ${item.where.in_file}` : ''} · {item.document_type_label}
              </span>
              <span className={`block text-xs font-semibold ${STATUS_TONE[item.where?.status] || ''}`}>
                {item.where?.status ? item.where.status[0].toUpperCase() + item.where.status.slice(1) : ''}
                {item.return_required && item.expected_return_date ? ` · original due back to you ${new Date(item.expected_return_date).toLocaleDateString()}` : ''}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {!isLoading && documents.length === 0 && <p className='text-text-muted-light dark:text-text-muted-dark'>The firm holds no papers for you yet.</p>}
    </Card>
  </div>;
}
