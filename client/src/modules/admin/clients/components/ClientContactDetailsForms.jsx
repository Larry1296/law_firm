import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import axiosInstance from '@/core/api/axios';
import { getApiErrorMessage } from '@/core/utils/errorMessages';
import { CountryField, Field, KenyaCountyField, SelectField } from '@/modules/admin/clients/clientCreation/Fields';
import { roleOptionsForClientType } from '@/modules/admin/clients/clientCreation/representativeOptions';

const ADDRESS_TYPES = {
  INDIVIDUAL: [['HOME', 'Home'], ['WORK', 'Work'], ['POSTAL', 'Postal'], ['SERVICE', 'Address for service'], ['OTHER', 'Other']],
  ORGANISATION: [['REGISTERED', 'Registered office'], ['PRINCIPAL_BUSINESS', 'Principal place of business'], ['POSTAL', 'Postal'], ['BILLING', 'Billing'], ['SERVICE', 'Address for service'], ['OTHER', 'Other']],
};
const CONTACT_TYPES = [['PRIMARY', 'Primary contact'], ['SECONDARY', 'Secondary contact'], ['EMERGENCY', 'Emergency contact / next of kin'], ['BILLING', 'Billing contact'], ['OTHER', 'Other']];
// An individual's contacts are the people close to them; an organisation's are its officers, as in onboarding.
const INDIVIDUAL_RELATIONSHIPS = ['Spouse', 'Parent', 'Child', 'Sibling', 'Next of kin', 'Employer', 'Other'];
const CONTACT_CHANNELS = [['PHONE', 'Phone'], ['SMS', 'SMS'], ['WHATSAPP', 'WhatsApp'], ['EMAIL', 'Email'], ['IN_PERSON', 'In person'], ['OTHER', 'Other']];
const options = (pairs) => pairs.map(([value, label]) => ({ value, label }));

const freshAddress = (isIndividual) => ({ address_type: isIndividual ? 'HOME' : 'REGISTERED', country: 'Kenya', county: '', city: '', street: '', building_or_plot: '', postal_address: '', postal_code: '', full_address: '', is_primary: false });
const freshContact = () => ({ contact_type: 'EMERGENCY', full_name: '', role_or_designation: '', phone_number: '', email: '', preferred_channel: 'PHONE', is_primary: false });

const compact = (values) => Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ''));

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
      await axiosInstance.post(`/admin/clients/${client.id}/${kind === 'address' ? 'addresses' : 'contacts'}/`, compact(values));
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

  const roleOptions = isIndividual ? INDIVIDUAL_RELATIONSHIPS.map((value) => ({ value, label: value })) : roleOptionsForClientType(client.client_type);
  return (
    <form onSubmit={submit} className='mt-4 space-y-4 rounded-xl border border-border-light p-4 dark:border-border-dark' aria-label={kind === 'address' ? 'Add address' : 'Add contact'}>
      <div className='grid gap-4 md:grid-cols-2'>
        {kind === 'address' ? (
          <>
            <SelectField label='Type of address' required value={values.address_type} onChange={(value) => set({ address_type: value })} options={options(ADDRESS_TYPES[isIndividual ? 'INDIVIDUAL' : 'ORGANISATION'])} />
            <CountryField label='Country' required value={values.country} onChange={(value) => set({ country: value, county: '', city: '', street: '' })} />
            <KenyaCountyField label={values.country === 'Kenya' ? 'County' : 'State / region / county'} country={values.country} value={values.county} onChange={(value) => set({ county: value, city: '', street: '' })} />
            <Field label='City / town' value={values.city} onChange={(value) => set({ city: value })} />
            <Field label='Street / locality' value={values.street} onChange={(value) => set({ street: value })} />
            <Field label='Building / plot' value={values.building_or_plot} onChange={(value) => set({ building_or_plot: value })} />
            <Field label='P.O. Box' value={values.postal_address} onChange={(value) => set({ postal_address: value })} />
            <Field label='Postal code' value={values.postal_code} onChange={(value) => set({ postal_code: value })} />
            <Field label='Full formatted address' required value={values.full_address} onChange={(value) => set({ full_address: value })} />
          </>
        ) : (
          <>
            <SelectField label='Type of contact' required value={values.contact_type} onChange={(value) => set({ contact_type: value })} options={options(CONTACT_TYPES)} />
            <Field label='Contact name' required value={values.full_name} onChange={(value) => set({ full_name: value })} />
            <SelectField label={isIndividual ? 'Relationship to the client' : 'Role / designation'} value={values.role_or_designation} onChange={(value) => set({ role_or_designation: value })} options={roleOptions} />
            <Field label='Phone' value={values.phone_number} onChange={(value) => set({ phone_number: value })} />
            <Field label='Email' type='email' value={values.email} onChange={(value) => set({ email: value })} />
            <SelectField label='Preferred contact channel' value={values.preferred_channel} onChange={(value) => set({ preferred_channel: value })} options={options(CONTACT_CHANNELS)} />
          </>
        )}
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
