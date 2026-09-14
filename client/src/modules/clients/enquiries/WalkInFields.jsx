import Input from '@/components/ui/Inputs';
import Textarea from '@/components/ui/TextArea';
import { urgencyOptions } from './enquiryForm';

export default function WalkInFields({ form, update, errors, correcting = false }) {
  const fieldError = (name) => errors[name] && <p id={`${name}-error`} className='text-sm text-red-700 dark:text-red-300'>{errors[name]}</p>;
  const input = (name, label, props = {}) => <Input name={name} label={label} value={form[name]} onChange={(event) => update(name, event.target.value)} error={errors[name]} format='none' {...props} />;
  const select = (name, label, options) => <div className='min-w-0 space-y-2'>
    <label htmlFor={name} className='text-sm font-semibold'>{label}</label>
    <select id={name} value={form[name]} onChange={(event) => update(name, event.target.value)} className='w-full min-w-0 rounded-lg border border-border-light bg-white p-3 dark:border-border-dark dark:bg-slate-900' aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${name}-error` : undefined}>
      {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
    </select>{fieldError(name)}
  </div>;

  return <div className='min-w-0 space-y-5'>
    <p className='text-sm'>Received time defaults to the server time when saved (Africa/Nairobi). {correcting ? 'Leave the override blank to keep the original received time.' : 'Only enter a different time for a delayed entry or clock correction.'}</p>
    <label className='flex items-center gap-3'><input type='checkbox' checked={form.override_received_time} onChange={(event) => update('override_received_time', event.target.checked)} className='h-5 w-5 shrink-0' />Enter a different received time</label>
    <div className='grid min-w-0 gap-5 md:grid-cols-2'>
      {form.override_received_time && input('received_at', 'Received time (Africa/Nairobi)', { type: 'datetime-local', required: true })}
      {form.override_received_time && !correcting && input('received_at_reason', 'Reason for entered received time', { required: true, maxLength: 500 })}
      {input('visitor_name', 'Visitor’s full name', { required: true, maxLength: 255 })}
      {input('safe_contact', 'Safe telephone number or contact method', { required: true, maxLength: 255 })}
      {select('enquiry_for', 'Who is the enquiry for?', [...(form.enquiry_for ? [] : [['', 'Select who the enquiry is for']]), ['SELF', 'Self'], ['OTHER', 'Another person'], ['ORGANISATION', 'Organisation']])}
      {form.enquiry_for === 'OTHER' && input('prospective_person_name', 'Prospective person name', { required: true, maxLength: 255 })}
      {form.enquiry_for === 'ORGANISATION' && input('organisation_name', 'Organisation name', { required: true, maxLength: 255 })}
      {form.enquiry_for !== 'SELF' && input('visitor_capacity', 'Visitor relationship or capacity', { required: true, maxLength: 255 })}
      {select('authority_status', 'Authority status', form.enquiry_for === 'SELF' ? [['NOT_REQUIRED', 'Not required']] : [['PENDING', 'Pending'], ['CLAIMED', 'Claimed'], ['CONFIRMED', 'Confirmed']])}
      {input('service_category', 'Broad legal-service category', { required: true, maxLength: 100, placeholder: 'e.g. Family, employment, land, commercial' })}
      {select('urgency_type', 'Urgency type', urgencyOptions)}
      {form.urgency_type !== 'NONE' && input('urgency_note', 'Brief urgency note', { required: true, maxLength: 255 })}
      {input('critical_date', 'Known critical date (optional)', { type: 'date' })}
      {input('referral_source', 'Referral source (optional)', { maxLength: 255 })}
    </div>
    <p className='text-sm'>Authority is a preliminary staff-recorded status. Selecting “Confirmed” does not perform verification or accept instructions.</p>
    <div><Textarea label='Known opposing or related-party names (one name per line)' aria-label='Known opposing or related-party names (one name per line)' value={form.related_party_names} onChange={(value) => update('related_party_names', value)} aria-invalid={Boolean(errors.related_party_names)} aria-describedby={errors.related_party_names ? 'related_party_names-error' : undefined} />{fieldError('related_party_names')}</div>
    <div><Textarea label='Very short non-confidential description' aria-label='Very short non-confidential description' value={form.description} onChange={(value) => update('description', value)} maxLength={500} required aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? 'description-help description-error' : 'description-help'} />
      <p id='description-help' className='text-sm'>{form.description.length}/500 characters. Record only the broad nature of the enquiry.</p>{fieldError('description')}
    </div>
  </div>;
}
