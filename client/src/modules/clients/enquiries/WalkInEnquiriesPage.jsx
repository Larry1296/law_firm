import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Inputs';
import Textarea from '@/components/ui/TextArea';
import DataTable from '@/components/ui/DataTable';
import service from './walkInEnquiryService';
import { emptyEnquiry, enquiryPayload, urgencyOptions, validateEnquiry } from './enquiryForm';

const columns = [
  { key: 'reference', label: 'Reference' },
  { key: 'received_at', label: 'Date/time received (Nairobi)', render: (value) => new Intl.DateTimeFormat('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) },
  { key: 'visitor_name', label: 'Visitor name' },
  { key: 'service_category', label: 'Broad service category' },
  { key: 'urgency_label', label: 'Urgency' },
  { key: 'status_label', label: 'Status' },
  { key: 'received_by_name', label: 'Received by' },
];

export default function WalkInEnquiriesPage({ workspace = 'admin' }) {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyEnquiry);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [canCreate, setCanCreate] = useState(false);

  useEffect(() => {
    let active = true;
    service.list(workspace).then((rows) => {
      if (active) { setEnquiries(rows); setCanCreate(true); }
    }).catch((err) => {
      if (active) setError(err.response?.data?.message || 'Unable to load the enquiry register.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workspace]);

  const update = (name, value) => setForm((previous) => ({ ...previous, [name]: value }));
  const fieldError = (name) => errors[name] && <p id={`${name}-error`} className='text-sm text-red-700 dark:text-red-300'>{errors[name]}</p>;
  const input = (name, label, props = {}) => <Input name={name} label={label} value={form[name]} onChange={(event) => update(name, event.target.value)} error={errors[name]} format='none' {...props} />;
  const select = (name, label, options) => <div className='space-y-2'>
    <label htmlFor={name} className='text-sm font-semibold'>{label}</label>
    <select id={name} value={form[name]} onChange={(event) => update(name, event.target.value)} className='w-full rounded-lg border border-border-light bg-white p-3 dark:border-border-dark dark:bg-slate-900' aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${name}-error` : undefined}>
      {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
    </select>{fieldError(name)}
  </div>;

  const submit = async (event) => {
    event.preventDefault();
    const validation = validateEnquiry(form);
    setErrors(validation); setError(''); setSuccess('');
    if (Object.keys(validation).length) return;
    setSaving(true);
    try {
      const enquiry = await service.create(workspace, enquiryPayload(form));
      setEnquiries((rows) => [enquiry, ...rows].sort((a, b) => Date.parse(b.received_at) - Date.parse(a.received_at) || Date.parse(b.created_at) - Date.parse(a.created_at)));
      setSuccess(`${enquiry.reference} — ${enquiry.status_label}`);
      setForm(emptyEnquiry()); setOpen(false);
    } catch (err) {
      setErrors(err.response?.data?.errors || {});
      setError(err.response?.data?.message || 'Unable to record the enquiry. Please try again.');
    } finally { setSaving(false); }
  };

  return <main className='mx-auto max-w-7xl space-y-6 p-4 text-text-primary-light dark:text-text-primary-dark md:p-8'>
    <header className='flex flex-wrap items-start justify-between gap-4'>
      <div><h1 className='text-2xl font-bold'>Walk-in Enquiries</h1><p className='mt-2 text-sm'>Step 1: Record minimal visitor and enquiry details for preliminary review.</p></div>
      {!open && <Button disabled={loading || !canCreate} onClick={() => { setForm(emptyEnquiry()); setErrors({}); setError(''); setOpen(true); }}>New walk-in enquiry</Button>}
    </header>
    <Card className='border-amber-400 p-5'>
      <p>Recording an enquiry does not mean that the firm has accepted instructions or created an advocate–client engagement. Do not record a detailed confidential narrative or upload documents at this stage.</p>
    </Card>
    {success && <div role='status' className='rounded-lg bg-green-50 p-4 text-green-900 dark:bg-green-950 dark:text-green-200'>{success}</div>}
    {error && <div role='alert' className='rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-950 dark:text-red-200'>{error}</div>}
    {open && <Card className='p-5 md:p-7'>
      <h2 className='mb-5 text-xl font-semibold'>New walk-in enquiry</h2>
      <form onSubmit={submit} noValidate>
        <fieldset disabled={saving} className='space-y-5'>
          <div className='grid gap-5 md:grid-cols-2'>
            {input('received_at', 'Date/time received (Africa/Nairobi)', { type: 'datetime-local', required: true })}
            {input('visitor_name', 'Visitor’s full name', { required: true, maxLength: 255 })}
            {input('safe_contact', 'Safe telephone number or contact method', { required: true, maxLength: 255 })}
            {select('visitor_type', 'Visitor type', [['INDIVIDUAL', 'Individual'], ['ORGANISATION_REPRESENTATIVE', 'Representative of an organisation']])}
            {form.visitor_type === 'ORGANISATION_REPRESENTATIVE' && input('organisation_name', 'Organisation name', { required: true, maxLength: 255 })}
            {input('service_category', 'Broad legal-service category', { required: true, maxLength: 100, placeholder: 'e.g. Family, employment, land, commercial' })}
            {select('urgency_type', 'Urgency type', urgencyOptions)}
            {form.urgency_type !== 'NONE' && input('urgency_note', 'Brief urgency note', { required: true, maxLength: 255 })}
            {input('critical_date', 'Known critical date (optional)', { type: 'date' })}
            {input('referral_source', 'Referral source (optional)', { maxLength: 255 })}
          </div>
          <div><Textarea label='Known opposing or related-party names (one name per line)' aria-label='Known opposing or related-party names (one name per line)' value={form.related_party_names} onChange={(value) => update('related_party_names', value)} aria-invalid={Boolean(errors.related_party_names)} aria-describedby={errors.related_party_names ? 'related_party_names-error' : undefined} />{fieldError('related_party_names')}</div>
          <div><Textarea label='Very short non-confidential description' aria-label='Very short non-confidential description' value={form.description} onChange={(value) => update('description', value)} maxLength={500} required aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? 'description-help description-error' : 'description-help'} />
            <p id='description-help' className='text-sm'>{form.description.length}/500 characters. Record only the broad nature of the enquiry.</p>{fieldError('description')}
          </div>
          <div className='space-y-3 rounded-lg border border-border-light p-4 dark:border-border-dark'>
            <p className='text-sm'>Privacy notice: These details are recorded by the firm for preliminary review and safe follow-up. Share only the minimum information needed for this enquiry.</p>
            <label className='flex items-start gap-3'><input type='checkbox' checked={form.privacy_acknowledged} onChange={(event) => update('privacy_acknowledged', event.target.checked)} required aria-invalid={Boolean(errors.privacy_acknowledged)} aria-describedby={errors.privacy_acknowledged ? 'privacy_acknowledged-error' : undefined} className='mt-1 h-5 w-5' />The visitor acknowledges the privacy notice.</label>
            {fieldError('privacy_acknowledged')}
          </div>
          <div className='flex flex-wrap gap-4'><Button type='submit' disabled={saving} loading={saving} loadingText='Recording…'>Record enquiry</Button><Button type='button' variant='secondary' onClick={() => { setOpen(false); setErrors({}); }} disabled={saving}>Cancel</Button></div>
        </fieldset>
      </form>
    </Card>}
    <DataTable columns={columns} data={enquiries} loading={loading} emptyMessage='No walk-in enquiries recorded yet.' />
  </main>;
}
