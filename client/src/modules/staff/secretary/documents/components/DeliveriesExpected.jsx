import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Inbox } from 'lucide-react';

import { getApiErrorMessage } from '@/core/utils/errorMessages';
import secretaryDocumentsService from '../services/secretaryDocumentsService';

const CHECKS = [
  ['correct_client', 'It is the right client’s document'],
  ['readable_complete', 'It is complete and legible'],
  ['matter_link_confirmed', 'It belongs to this matter'],
];

function ReceiveForm({ item, originalsPlaces, onDone }) {
  const [checks, setChecks] = useState({});
  const [copy, setCopy] = useState('COPY');
  const [placeId, setPlaceId] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [error, setError] = useState(null);
  const isOriginal = copy === 'ORIGINAL';
  const receive = useMutation({
    mutationFn: () => secretaryDocumentsService.verifyClientUpload(item.id, {
      ...checks,
      source_copy_type: copy,
      location_id: placeId || null,
      return_required: isOriginal && Boolean(returnDate),
      expected_return_date: isOriginal && returnDate ? returnDate : null,
    }),
    onSuccess: onDone,
    onError: (failure) => setError(getApiErrorMessage(failure, 'Could not file this document.')),
  });
  const ready = CHECKS.every(([key]) => checks[key]);

  return (
    <form className='mt-3 space-y-3' onSubmit={(event) => { event.preventDefault(); setError(null); receive.mutate(); }}>
      <div className='grid gap-2 sm:grid-cols-3'>
        {CHECKS.map(([key, label]) => (
          <label key={key} className='flex items-center gap-2 text-sm'>
            <input type='checkbox' checked={Boolean(checks[key])} onChange={(event) => setChecks({ ...checks, [key]: event.target.checked })} />
            {label}
          </label>
        ))}
      </div>
      <div className='grid gap-3 sm:grid-cols-3'>
        <label className='text-sm font-semibold'>
          Original or copy
          <select className='form-control mt-1 w-full' value={copy} onChange={(event) => setCopy(event.target.value)}>
            <option value='COPY'>Copy</option>
            <option value='CERTIFIED_COPY'>Certified copy</option>
            <option value='ORIGINAL'>Original</option>
          </select>
        </label>
        <label className='text-sm font-semibold'>
          Keep it in
          <select className='form-control mt-1 w-full' value={placeId} onChange={(event) => setPlaceId(event.target.value)}>
            <option value=''>Its file ({item.drawer_reference || 'matter file'})</option>
            {originalsPlaces.map((place) => <option key={place.id} value={place.id}>{place.path}</option>)}
          </select>
        </label>
        {isOriginal && (
          <label className='text-sm font-semibold'>
            Original due back to the client (optional)
            <input type='date' className='form-control mt-1 w-full' value={returnDate} onChange={(event) => setReturnDate(event.target.value)} />
          </label>
        )}
      </div>
      {error && <p role='alert' className='text-sm text-red-700'>{error}</p>}
      <button type='submit' disabled={!ready || receive.isPending} className='rounded-lg bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50 dark:bg-sky-600'>
        {receive.isPending ? 'Filing…' : 'Receive and file'}
      </button>
    </form>
  );
}

/** Papers clients said they would bring or send. Receiving one gives it its reference and place. */
export default function DeliveriesExpected({ deliveries = [], originalsPlaces = [], onDone }) {
  const [openId, setOpenId] = useState(null);
  const [filed, setFiled] = useState(null);

  return (
    <section className='rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5'>
      <h2 className='flex items-center gap-2 text-lg font-semibold'><Inbox size={18} aria-hidden='true' /> Papers on their way</h2>
      <p className='text-sm text-[color:var(--text-muted)]'>
        Documents clients said they will bring or send. When the paper arrives, check it and file it: the system gives it its
        reference in the client&apos;s KYC file or the matter file.
      </p>
      {filed && <p role='status' className='mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900'>Filed as <strong>{filed}</strong>.</p>}
      {!deliveries.length && <p className='mt-3 text-sm'>Nothing is on its way.</p>}
      <ul className='mt-3 space-y-3'>
        {deliveries.map((item) => (
          <li key={item.id} className='rounded-xl border border-[color:var(--border)] p-4'>
            <div className='flex flex-wrap items-start justify-between gap-2'>
              <div>
                <strong>{item.title}</strong>
                <p className='text-sm text-[color:var(--text-muted)]'>{item.client_name} · {item.case_number}</p>
                {item.delivery_note && <p className='mt-1 text-sm'>{item.delivery_note}</p>}
              </div>
              {openId !== item.id && (
                <button type='button' onClick={() => setOpenId(item.id)} className='rounded-lg border border-[color:var(--border)] px-3 py-1.5 text-sm font-semibold'>It has arrived</button>
              )}
            </div>
            {openId === item.id && (
              <ReceiveForm
                item={item}
                originalsPlaces={originalsPlaces}
                onDone={(result) => { setOpenId(null); setFiled(result.reference || 'its file'); onDone?.(); }}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
