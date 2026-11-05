import { useState } from 'react';

import AutoGrowTextarea from '@/components/ui/AutoGrowTextarea';
import axiosInstance from '@/core/api/axios';
import { getApiErrorMessage } from '@/core/utils/errorMessages';

const day = (value) => (value ? new Date(value).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

// The papers in the matter's filing register, newest first. An entry recorded wrongly is corrected in place with a
// reason (who filed it, its title, its e-filing reference); it is never deleted and entered again.
export default function FilingRegisterEntries({ caseId, filings, parties, eitherSidePapers, canCorrect, inputClass, onCorrected }) {
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const entries = [...(filings || [])].sort((a, b) => new Date(b.filed_at || b.created_at) - new Date(a.filed_at || a.created_at));
  if (!entries.length) return null;

  const start = (filing) => {
    setError('');
    setEditing({ id: filing.id, filing_type: filing.filing_type, filed_by_party: filing.filed_by_party || '', title: filing.title, efiling_reference: filing.efiling_reference || '', reason: '', original: filing });
  };
  const set = (changes) => setEditing((current) => ({ ...current, ...changes }));

  const save = async (event) => {
    event.preventDefault();
    const { original } = editing;
    const payload = { reason: editing.reason };
    if (editing.title !== original.title) payload.title = editing.title;
    if (editing.efiling_reference !== (original.efiling_reference || '')) payload.efiling_reference = editing.efiling_reference;
    if (editing.filed_by_party !== (original.filed_by_party || '')) payload.filed_by_party = editing.filed_by_party || null;
    setBusy(true);
    setError('');
    try {
      await axiosInstance.patch(`/cases/${caseId}/filings/${editing.id}/`, payload);
      setEditing(null);
      await onCorrected?.();
    } catch (err) {
      if (err?.isActionCancelled) return;
      setError(getApiErrorMessage(err, 'The entry could not be corrected.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <details className='mt-5 rounded-xl border border-border-light p-4 dark:border-border-dark'>
      <summary className='cursor-pointer font-semibold'>Papers in the register ({entries.length})</summary>
      <ul className='mt-3 space-y-2 text-sm'>
        {entries.map((filing) => (
          <li key={filing.id || `${filing.filing_type}-${filing.filed_at}`} className='rounded-lg border border-border-light p-3 dark:border-border-dark'>
            {editing && editing.id === filing.id ? (
              <form onSubmit={save} className='grid gap-2 md:grid-cols-2' aria-label='Correct the entry'>
                {eitherSidePapers.has(filing.filing_type) && parties.length > 1 && (
                  <label className='text-xs font-semibold'>Filed by
                    <select value={editing.filed_by_party} onChange={(event) => set({ filed_by_party: event.target.value })} className={inputClass} required>
                      <option value=''>Select who filed it</option>
                      {parties.map((party) => <option key={party.id} value={party.id}>{party.name} ({party.role_label}{party.is_our_client ? ', our client' : ''})</option>)}
                    </select>
                  </label>
                )}
                <label className='text-xs font-semibold'>Title
                  <input value={editing.title} onChange={(event) => set({ title: event.target.value })} className={inputClass} required />
                </label>
                <label className='text-xs font-semibold'>E-filing reference
                  <input value={editing.efiling_reference} onChange={(event) => set({ efiling_reference: event.target.value })} className={inputClass} />
                </label>
                <label className='text-xs font-semibold md:col-span-2'>Reason for the correction
                  <AutoGrowTextarea value={editing.reason} onChange={(event) => set({ reason: event.target.value })} className={inputClass} required />
                </label>
                {error && <p role='alert' className='text-sm font-semibold text-red-700 dark:text-red-300 md:col-span-2'>{error}</p>}
                <div className='flex gap-2 md:col-span-2'>
                  <button type='submit' disabled={busy} className='rounded-lg bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50'>{busy ? 'Saving…' : 'Save correction'}</button>
                  <button type='button' onClick={() => setEditing(null)} className='rounded-lg border border-border-light px-4 py-2 text-sm font-semibold dark:border-border-dark'>Cancel</button>
                </div>
              </form>
            ) : (
              <div className='flex flex-wrap items-start justify-between gap-2'>
                <div>
                  <p className='font-semibold'>{filing.title}</p>
                  <p className='text-xs text-text-muted-light dark:text-text-muted-dark'>
                    {[filing.filed_by_party_name && `Filed by ${filing.filed_by_party_name}`, day(filing.filed_at), filing.efiling_reference].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {canCorrect && <button type='button' onClick={() => start(filing)} className='font-semibold text-brand-primary hover:underline'>Correct</button>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
