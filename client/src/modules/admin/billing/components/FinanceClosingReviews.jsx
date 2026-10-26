import { useEffect, useState } from 'react';
import axios from '@/core/api/axios';
import { getApiErrorMessage } from '@/core/utils/errorMessages';

export default function FinanceClosingReviews() {
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const { data } = await axios.get('/cases/closing-reviews/finance/');
    setReviews(data.closing_reviews || []);
    setError('');
  };
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load().catch((err) => { if (err?.isActionCancelled) return; return setError(getApiErrorMessage(err, 'Financial-clearance access is required.')); }); }, []);
  const approve = async (review) => {
    setBusy(true);
    try {
      await axios.post(`/cases/${review.matter_id}/closure/${review.id}/approve-finance/`, {});
      await load();
    } catch (err) { if (err?.isActionCancelled) return;  setError(getApiErrorMessage(err)); }
    finally { setBusy(false); }
  };
  return <section className='space-y-3 rounded-xl border p-4 dark:border-border-dark'>
    <h2 className='font-semibold'>Financial clearance for closing matters</h2>
    <p className='text-sm'>Check the ledger, final account and invoices before approving. The system blocks approval while client money or unresolved invoices remain.</p>
    <button type='button' className='text-sm underline' disabled={busy} onClick={() => load().catch((err) => { if (err?.isActionCancelled) return; return setError(getApiErrorMessage(err)); })}>Refresh closing reviews</button>
    {error && <p role='alert'>{error}</p>}
    {!reviews.length && !error && <p className='text-sm'>No pending closing reviews.</p>}
    {reviews.map((review) => <div key={review.id} className='flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm'>
      <span>{review.matter_reference} · {review.financial_clearance_status}</span>
      {review.financial_clearance_status !== 'CLEARED' && <button type='button' disabled={busy} onClick={() => approve(review)} className='rounded-lg bg-brand-primary px-3 py-2 font-semibold text-white'>Approve financial clearance</button>}
    </div>)}
  </section>;
}
