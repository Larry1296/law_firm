import AutoGrowTextarea from '@/components/ui/AutoGrowTextarea';
import { lazy, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Building2, CheckCircle2, Plus, X } from 'lucide-react';

import { KENYAN_COUNTIES } from '@/core/constants/kenyanCounties';
import BackButton from '@/components/ui/BackButton';
import BrandMark from '@/components/ui/BrandMark';
import { getApiErrorMessage } from '@/core/utils/errorMessages';
import { formatKes } from '@/modules/admin/subscription/utils/subscriptionFormatting';
import platformService from '@/modules/platform/services/platformService';
import subscriptionService from '@/modules/subscription/services/subscriptionService';

const FirmSignup = lazy(() => import('@/modules/auth/pages/FirmSignup'));

const inputClass = 'form-control';
const KRA_PIN = '[AaPp][0-9]{9}[A-Za-z]';

const EMPTY = {
  firm: {
    name: '', business_structure: 'PARTNERSHIP', registration_number: '', kra_pin: '', description: '',
    email: '', phone_number: '', website: '', physical_address: '', postal_address: '', county: '', town: '',
  },
  settings: { opening_time: '08:00', closing_time: '17:00', work_on_saturday: false },
  practice_areas: [],
  owner: {
    first_name: '', last_name: '', email: '', phone_number: '', national_id_number: '',
    admission_number: '', job_title: 'Managing Partner',
  },
};

function Field({ label, required, error, hint, children, className = '' }) {
  return (
    <label className={`form-label ${className}`}>
      <span>
        {label}{required && <span className='text-[color:var(--form-danger)]' aria-hidden='true'> *</span>}
      </span>
      {children}
      {hint && !error && <span className='form-hint text-xs'>{hint}</span>}
      {error && <span role='alert' className='form-error text-xs'>{error}</span>}
    </label>
  );
}

function Section({ title, description, children }) {
  return (
    <fieldset className='grid gap-5 border-t border-border-light pt-6 first:border-t-0 first:pt-0 dark:border-border-dark sm:grid-cols-2'>
      <legend className='contents'>
        <span className='block text-lg font-bold sm:col-span-2'>{title}</span>
      </legend>
      {description && <p className='-mt-3 text-sm text-text-muted-light dark:text-text-muted-dark sm:col-span-2'>{description}</p>}
      {children}
    </fieldset>
  );
}

function RequestSent({ form }) {
  return (
    <div className='flex min-h-screen items-center justify-center bg-background-light px-4 pb-16 pt-28 dark:bg-background-dark sm:px-6'>
      <div role='status' className='w-full max-w-lg rounded-3xl border border-border-light bg-surface-light p-8 text-center shadow-medium dark:border-border-dark dark:bg-surface-dark'>
        <CheckCircle2 size={44} className='mx-auto text-success' aria-hidden='true' />
        <h2 className='mt-4 text-xl font-bold'>Thank you, we have your request</h2>
        <p className='mx-auto mt-2 max-w-md text-sm text-text-muted-light dark:text-text-muted-dark'>
          The Sheria Master team will check {form.firm.name}&apos;s details and register the firm. {form.owner.first_name || 'The managing partner'} then
          receives a link at {form.owner.email} to set a password and sign in. We will call {form.owner.phone_number} if anything needs clarifying.
        </p>
        <Link to='/' className='mt-6 inline-flex rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white dark:bg-sky-600'>Back to the homepage</Link>
      </div>
    </div>
  );
}

function OnboardingRequestForm({ plans, onSent }) {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState(EMPTY);
  const [extra, setExtra] = useState({ advocates_count: '', preferred_plan: searchParams.get('plan') || '', message: '' });
  const [logo, setLogo] = useState(null);
  const [customArea, setCustomArea] = useState('');
  const choices = useQuery({ queryKey: ['onboarding-request', 'choices'], queryFn: platformService.getOnboardingRequestChoices });
  const structures = choices.data?.business_structures || [{ value: 'PARTNERSHIP', label: 'Partnership' }];
  const suggestions = choices.data?.practice_areas || [];

  const set = (section, key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [section]: { ...current[section], [key]: value } }));
  };
  const setExtraField = (key) => (event) => setExtra((current) => ({ ...current, [key]: event.target.value }));
  const toggleArea = (area) => setForm((current) => ({
    ...current,
    practice_areas: current.practice_areas.includes(area)
      ? current.practice_areas.filter((item) => item !== area)
      : [...current.practice_areas, area],
  }));
  const addCustomArea = () => {
    const area = customArea.trim().replace(/\s+/g, ' ');
    if (area && !form.practice_areas.some((item) => item.toLowerCase() === area.toLowerCase())) toggleArea(area);
    setCustomArea('');
  };

  const submit = useMutation({
    mutationFn: () => platformService.submitOnboardingRequest({
      ...form,
      firm: { ...form.firm, kra_pin: form.firm.kra_pin.trim().toUpperCase() },
      advocates_count: extra.advocates_count === '' ? null : Number(extra.advocates_count),
      preferred_plan: extra.preferred_plan,
      message: extra.message,
    }, logo),
    onSuccess: () => {
      // The thank-you message is much shorter than the form; start it at the top of the page.
      window.scrollTo({ top: 0 });
      onSent(form);
    },
    onError: (error) => {
      const first = Object.keys(error?.response?.data?.errors || {})[0];
      document.querySelector(`[name="${first}"]`)?.focus();
    },
  });
  const errors = submit.error?.response?.data?.errors || {};
  const err = (key) => errors[key]?.[0] ?? errors[key];

  const text = (section, key, label, props = {}) => (
    <Field label={label} required={props.required} error={err(`${section}.${key}`)} hint={props.hint} className={props.className}>
      <input
        name={`${section}.${key}`}
        value={form[section][key]}
        onChange={set(section, key)}
        className={inputClass}
        {...Object.fromEntries(Object.entries(props).filter(([name]) => !['hint', 'className'].includes(name)))}
      />
    </Field>
  );

  return (
    <form onSubmit={(event) => { event.preventDefault(); submit.mutate(); }} className='grid gap-8'>
      <Section title='Firm identity' description='Who the firm is, as registered with BRS and KRA.'>
        {text('firm', 'name', 'Registered firm name', { required: true, className: 'sm:col-span-2', placeholder: 'e.g. Achieng & Mwangi Advocates' })}
        <Field label='Business structure' required error={err('firm.business_structure')}>
          <select name='firm.business_structure' value={form.firm.business_structure} onChange={set('firm', 'business_structure')} className={inputClass}>
            {structures.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </Field>
        {text('firm', 'registration_number', 'BRS registration number', { required: true, placeholder: 'e.g. BN-2026-0042', hint: 'Business name or partnership number from the Business Registration Service.' })}
        {text('firm', 'kra_pin', 'KRA PIN', { required: true, pattern: KRA_PIN, title: 'A KRA PIN such as P051234567X', placeholder: 'P051234567X', hint: 'Used on the firm’s tax invoices (eTIMS).' })}
        <Field label='Logo' error={err('logo')} hint='PNG or JPG, up to 2 MB. Shown on the firm’s dashboard.'>
          <input name='logo' type='file' accept='image/png,image/jpeg,image/webp' className={inputClass} onChange={(event) => setLogo(event.target.files?.[0] || null)} />
        </Field>
        <Field label='About the firm' error={err('firm.description')} hint='A short description shown on the firm’s profile.' className='sm:col-span-2'>
          <AutoGrowTextarea name='firm.description' maxLength={2000} value={form.firm.description} onChange={set('firm', 'description')} className={inputClass} />
        </Field>
      </Section>

      <Section title='Contact & office' description='Where the firm is and how clients reach it.'>
        {text('firm', 'email', 'Firm email', { required: true, type: 'email' })}
        {text('firm', 'phone_number', 'Firm phone', { required: true, type: 'tel', placeholder: '+254 7XX XXX XXX' })}
        {text('firm', 'physical_address', 'Physical address', { required: true, className: 'sm:col-span-2', placeholder: 'Building, floor and street' })}
        <Field label='County' required error={err('firm.county')}>
          <select name='firm.county' required value={form.firm.county} onChange={set('firm', 'county')} className={inputClass}>
            <option value=''>Choose a county</option>
            {(choices.data?.counties || KENYAN_COUNTIES).map((county) => <option key={county}>{county}</option>)}
          </select>
        </Field>
        {text('firm', 'town', 'Town', { required: true })}
        {text('firm', 'postal_address', 'Postal address', { placeholder: 'P.O. Box 1234-00100 Nairobi' })}
        {text('firm', 'website', 'Website', { type: 'url', placeholder: 'https://' })}
        {text('settings', 'opening_time', 'Opens at', { type: 'time', required: true })}
        {text('settings', 'closing_time', 'Closes at', { type: 'time', required: true })}
        <label className='flex items-center gap-2 text-sm sm:col-span-2'>
          <input type='checkbox' name='settings.work_on_saturday' checked={form.settings.work_on_saturday} onChange={set('settings', 'work_on_saturday')} />
          Open on Saturdays
        </label>
      </Section>

      <Section title='Practice areas' description='The kinds of work the firm takes on. Choose at least one.'>
        <div className='flex flex-wrap gap-2 sm:col-span-2'>
          {[...new Set([...suggestions, ...form.practice_areas])].map((area) => {
            const chosen = form.practice_areas.includes(area);
            return (
              <button
                key={area}
                type='button'
                aria-pressed={chosen}
                onClick={() => toggleArea(area)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${chosen ? 'border-brand-primary bg-brand-primary text-white dark:border-sky-500 dark:bg-sky-700' : 'border-border-light hover:bg-background-light dark:border-border-dark dark:hover:bg-background-dark'}`}
              >
                {area}{chosen && <X size={12} className='ml-1 inline' aria-hidden='true' />}
              </button>
            );
          })}
        </div>
        <div className='flex gap-2 sm:col-span-2'>
          <label className='flex-1'>
            <span className='sr-only'>Another practice area</span>
            <input
              name='practice_areas'
              value={customArea}
              onChange={(event) => setCustomArea(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustomArea(); } }}
              placeholder='Add another practice area'
              className={inputClass}
            />
          </label>
          <button type='button' onClick={addCustomArea} className='inline-flex items-center gap-1 rounded-xl border border-border-light px-3 text-sm font-semibold dark:border-border-dark'>
            <Plus size={14} aria-hidden='true' /> Add
          </button>
        </div>
        {err('practice_areas') && <p role='alert' className='form-error text-xs sm:col-span-2'>{err('practice_areas')}</p>}
      </Section>

      <Section title='Managing partner' description='The advocate who will own and administer the firm’s account. They receive the sign-in link.'>
        {text('owner', 'first_name', 'First name', { required: true, autoComplete: 'given-name' })}
        {text('owner', 'last_name', 'Last name', { required: true, autoComplete: 'family-name' })}
        {text('owner', 'email', 'Email (used to sign in)', { required: true, type: 'email', autoComplete: 'email' })}
        {text('owner', 'phone_number', 'Mobile number', { required: true, type: 'tel', autoComplete: 'tel', placeholder: '+254 7XX XXX XXX' })}
        {text('owner', 'national_id_number', 'National ID number', { required: true })}
        {text('owner', 'admission_number', 'Admission number', { required: true, placeholder: 'e.g. P.105/1234/15', hint: 'As on the Roll of Advocates.' })}
        {text('owner', 'job_title', 'Job title')}
      </Section>

      <Section title='Plan'>
        <Field label='Plan you are interested in' error={err('preferred_plan')}>
          <select name='preferred_plan' value={extra.preferred_plan} onChange={setExtraField('preferred_plan')} className={inputClass}>
            <option value=''>Not sure yet</option>
            {plans.map((plan) => <option key={plan.code} value={plan.code}>{plan.name} ({formatKes(plan.monthly_price)} / month)</option>)}
          </select>
        </Field>
        <Field label='Number of advocates' error={err('advocates_count')}>
          <input name='advocates_count' type='number' min='1' value={extra.advocates_count} onChange={setExtraField('advocates_count')} className={inputClass} />
        </Field>
        <Field label='Anything we should know?' error={err('message')} className='sm:col-span-2'>
          <AutoGrowTextarea name='message' maxLength={2000} value={extra.message} onChange={setExtraField('message')} className={inputClass} placeholder='For example, other offices or when you would like to start.' />
        </Field>
      </Section>

      {submit.error && (
        <p role='alert' className='rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-950/60 dark:text-red-100'>
          {Object.keys(errors).length ? 'Some details need correcting. They are marked above.' : getApiErrorMessage(submit.error)}
        </p>
      )}
      <div>
        <button type='submit' disabled={submit.isPending} className='w-full rounded-xl bg-brand-primary px-5 py-3 font-bold text-white transition hover:bg-[#0e2c47] disabled:opacity-60 dark:bg-sky-600 dark:hover:bg-sky-500'>
          {submit.isPending ? 'Sending…' : 'Request registration'}
        </button>
        <p className='mt-3 text-center text-xs text-text-muted-light dark:text-text-muted-dark'>
          We use these details only to register your firm and contact you about it (Data Protection Act, 2019).
        </p>
      </div>
    </form>
  );
}

export default function RegisterFirmPage() {
  const plansQuery = useQuery({ queryKey: ['subscription', 'plans'], queryFn: subscriptionService.getPlans });
  const [sent, setSent] = useState(null);

  if (plansQuery.data?.firm_signup_enabled) return <FirmSignup />;
  if (sent) return <RequestSent form={sent} />;

  return (
    <div className='bg-background-light px-4 pb-16 pt-32 dark:bg-background-dark sm:px-6'>
      <div className='mx-auto grid max-w-6xl gap-10 lg:grid-cols-5'>
        <div className='lg:col-span-2'>
          <div className='lg:sticky lg:top-28'>
            <BackButton fallback='/' />
            <BrandMark className='mt-6 flex' />
            <span className='mt-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary dark:bg-sky-400/10 dark:text-sky-300'>
              <Building2 size={24} aria-hidden='true' />
            </span>
            <h1 className='mt-5 text-3xl font-bold tracking-tight'>Register your firm</h1>
            <p className='mt-3 leading-relaxed text-text-muted-light dark:text-text-muted-dark'>
              Send your firm&apos;s full details once. Our team checks them against BRS, KRA and the Roll of Advocates,
              then registers the firm exactly as you sent it.
            </p>
            <ol className='mt-8 space-y-4 text-sm'>
              {[
                'You send the firm’s registration, office and managing partner details.',
                'We check the details and register the firm’s workspace.',
                'The managing partner gets a link to set a password and signs in.',
                'The firm adds staff and clients. Everyone signs in from this site.',
              ].map((step, index) => (
                <li key={step} className='flex gap-3'>
                  <span className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-white dark:bg-sky-600'>{index + 1}</span>
                  <span className='text-text-primary-light dark:text-text-primary-dark'>{step}</span>
                </li>
              ))}
            </ol>
            <p className='mt-8 text-sm text-text-muted-light dark:text-text-muted-dark'>
              Already registered? <Link to='/login' className='font-semibold text-brand-primary underline dark:text-sky-300'>Sign in</Link>
            </p>
          </div>
        </div>
        <div className='rounded-3xl border border-border-light bg-surface-light p-6 shadow-medium dark:border-border-dark dark:bg-surface-dark sm:p-8 lg:col-span-3'>
          <OnboardingRequestForm plans={plansQuery.data?.plans || []} onSent={setSent} />
        </div>
      </div>
    </div>
  );
}
