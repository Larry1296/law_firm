import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import axiosInstance from '@/core/api/axios';
import { getApiErrorMessage } from '@/core/utils/errorMessages';
import { Field } from '@/modules/admin/clients/clientCreation/Fields';
import { AddressFields, ContactFields } from '@/modules/admin/clients/clientCreation/ContactDetailsFields';
import { filledFields, freshAddress, freshContact } from '@/modules/admin/clients/clientCreation/contactDetailsDefaults';

// Adds an address or a contact to the client's record at any stage, including after the matter has opened.
export default function ClientContactDetailsForms({ client, kind }) {
  const queryClient = useQueryClient();
  const isIndividual = client.client_type === 'INDIVIDUAL';
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(() => (kind === 'address' ? freshAddress(isIndividual) : freshContact()));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (changes) => setValues((current) => ({ ...current, ...changes }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await axiosInstance.post(`/admin/clients/${client.id}/${kind === 'address' ? 'addresses' : 'contacts'}/`, filledFields(values));
      setValues(kind === 'address' ? freshAddress(isIndividual) : freshContact());
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['admin-client', client.id] });
    } catch (err) {
      if (err?.isActionCancelled) return;
      setError(getApiErrorMessage(err, `The ${kind} could not be saved.`));
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button type='button' onClick={() => setOpen(true)} className='mt-4 rounded-lg border border-brand-primary/30 bg-brand-primary/5 px-4 py-2 text-sm font-bold text-brand-primary hover:bg-brand-primary/10'>
        {kind === 'address' ? 'Add address' : 'Add contact'}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className='mt-4 space-y-4 rounded-xl border border-border-light p-4 dark:border-border-dark' aria-label={kind === 'address' ? 'Add address' : 'Add contact'}>
      <div className='grid gap-4 md:grid-cols-2'>
        {kind === 'address'
          ? <AddressFields values={values} set={set} isIndividual={isIndividual} />
          : <ContactFields values={values} set={set} isIndividual={isIndividual} clientType={client.client_type} />}
        <Field label={kind === 'address' ? 'Make this the primary address' : 'Make this the primary contact'} type='checkbox' value={values.is_primary} onChange={(value) => set({ is_primary: value })} />
      </div>
      {error && <p role='alert' className='text-sm font-semibold text-red-700 dark:text-red-300'>{error}</p>}
      <div className='flex flex-wrap gap-2'>
        <button type='submit' disabled={saving} className='rounded-lg bg-brand-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50'>{saving ? 'Saving…' : kind === 'address' ? 'Save address' : 'Save contact'}</button>
        <button type='button' onClick={() => { setOpen(false); setError(''); }} className='rounded-lg border border-border-light px-4 py-2 text-sm font-semibold dark:border-border-dark'>Cancel</button>
      </div>
    </form>
  );
}
