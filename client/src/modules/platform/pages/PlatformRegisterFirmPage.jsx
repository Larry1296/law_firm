import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, ImagePlus, Plus, X } from 'lucide-react';

import { getApiErrorMessage } from '@/core/utils/errorMessages';
import { formatKes, formatLimit, LIMIT_LABELS } from '@/modules/admin/subscription/utils/subscriptionFormatting';
import platformService from '@/modules/platform/services/platformService';
import {
  Button,
  ErrorNotice,
  Field,
  PageHeader,
  Panel,
} from '@/modules/platform/components/ui';
import { inputClass } from '@/modules/platform/components/styles';

const KRA_PIN = /^[AP]\d{9}[A-Z]$/;
const MPESA_CODE = /^[A-Z0-9]{10}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEPS = [
  { id: 'firm', title: 'Firm identity', description: 'Who the firm is, as registered with BRS and KRA.' },
  { id: 'contact', title: 'Contact & office', description: 'Where the firm is and how to reach it.' },
  { id: 'practice', title: 'Practice areas', description: 'The kinds of work the firm takes on.' },
  { id: 'owner', title: 'Firm owner', description: 'The managing partner who will administer the firm.' },
  { id: 'plan', title: 'Plan & billing', description: 'What the firm subscribes to and how it starts.' },
  { id: 'review', title: 'Review', description: 'Check everything before creating the firm.' },
];

const EMPTY = {
  firm: {
    name: '', business_structure: 'PARTNERSHIP', registration_number: '', kra_pin: '', description: '',
    email: '', phone_number: '', website: '', physical_address: '', postal_address: '', county: '', town: '',
  },
  office: { name: 'Head Office' },
  settings: { opening_time: '08:00', closing_time: '17:00', work_on_saturday: false },
  practice_areas: [],
  owner: {
    first_name: '', last_name: '', email: '', phone_number: '', national_id_number: '',
    admission_number: '', job_title: 'Managing Partner',
  },
  subscription: { plan_code: 'PRO', billing_cycle: 'MONTHLY', start: 'TRIAL', trial_days: 14, mpesa_receipt: '', payer_phone: '' },
};

// Which step owns each field, so a server error can send the user back to it.
const FIELD_STEP = (key) => {
  if (key.startsWith('owner.')) return 'owner';
  if (key.startsWith('subscription.')) return 'plan';
  if (key.startsWith('practice_areas')) return 'practice';
  if (key.startsWith('office.') || key.startsWith('settings.')) return 'contact';
  if (['firm.name', 'firm.business_structure', 'firm.registration_number', 'firm.kra_pin', 'firm.description'].includes(key)) return 'firm';
  return 'contact';
};

function validateStep(step, form) {
  const errors = {};
  const need = (key, value, message = 'Required.') => {
    if (!String(value ?? '').trim()) errors[key] = message;
  };
  const { firm, owner, subscription } = form;
  if (step === 'firm') {
    need('firm.name', firm.name);
    need('firm.registration_number', firm.registration_number);
    need('firm.kra_pin', firm.kra_pin);
    if (firm.kra_pin && !KRA_PIN.test(firm.kra_pin.trim().toUpperCase())) errors['firm.kra_pin'] = 'Enter a valid KRA PIN, e.g. P051234567X.';
  }
  if (step === 'contact') {
    need('firm.email', firm.email);
    if (firm.email && !EMAIL.test(firm.email)) errors['firm.email'] = 'Enter a valid email address.';
    need('firm.phone_number', firm.phone_number);
    need('firm.physical_address', firm.physical_address);
    need('firm.county', firm.county, 'Choose a county.');
    need('firm.town', firm.town);
    if (firm.website && !/^https?:\/\//.test(firm.website)) errors['firm.website'] = 'Start the website with https://';
    if (form.settings.closing_time <= form.settings.opening_time) errors['settings.closing_time'] = 'Closing time must be after opening time.';
  }
  if (step === 'practice' && form.practice_areas.length === 0) errors.practice_areas = 'Add at least one practice area.';
  if (step === 'owner') {
    ['first_name', 'last_name', 'email', 'phone_number', 'national_id_number', 'admission_number'].forEach((key) => need(`owner.${key}`, owner[key]));
    if (owner.email && !EMAIL.test(owner.email)) errors['owner.email'] = 'Enter a valid email address.';
  }
  if (step === 'plan') {
    need('subscription.plan_code', subscription.plan_code, 'Choose a plan.');
    if (subscription.start === 'PAID' && !MPESA_CODE.test(subscription.mpesa_receipt.trim().toUpperCase())) {
      errors['subscription.mpesa_receipt'] = 'Enter the 10-character M-Pesa confirmation code, e.g. SIB7XK2LQ9.';
    }
  }
  return errors;
}

function buildPayload(form, requestId) {
  const subscription = {
    plan_code: form.subscription.plan_code,
    billing_cycle: form.subscription.billing_cycle,
    start: form.subscription.start,
  };
  if (form.subscription.start === 'TRIAL') subscription.trial_days = Number(form.subscription.trial_days) || undefined;
  else {
    subscription.mpesa_receipt = form.subscription.mpesa_receipt.trim().toUpperCase();
    subscription.payer_phone = form.subscription.payer_phone.trim();
  }
  return {
    firm: { ...form.firm, kra_pin: form.firm.kra_pin.trim().toUpperCase() },
    owner: form.owner,
    office: form.office,
    settings: form.settings,
    practice_areas: form.practice_areas,
    subscription,
    ...(requestId ? { onboarding_request_id: requestId } : {}),
  };
}

function Stepper({ current, completed, onSelect }) {
  return (
    <ol className='mb-6 grid grid-cols-3 gap-2 sm:grid-cols-6' aria-label='Registration steps'>
      {STEPS.map((step, index) => {
        const isCurrent = step.id === current;
        const isDone = completed.has(step.id);
        const reachable = isDone || isCurrent;
        return (
          <li key={step.id}>
            <button
              type='button'
              disabled={!reachable}
              onClick={() => onSelect(step.id)}
              aria-current={isCurrent ? 'step' : undefined}
              className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition disabled:cursor-not-allowed ${isCurrent ? 'border-brand-primary bg-brand-primary text-white dark:border-sky-500 dark:bg-sky-700' : isDone ? 'border-border-light bg-surface-light hover:bg-background-light dark:border-border-dark dark:bg-surface-dark' : 'border-dashed border-border-light text-text-muted-light dark:border-border-dark dark:text-text-muted-dark'}`}
            >
              <span className='flex items-center gap-1 font-semibold'>
                {isDone && !isCurrent ? <Check size={12} aria-hidden='true' /> : <span aria-hidden='true'>{index + 1}.</span>}
                {step.title}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className='grid gap-1 py-2 sm:grid-cols-3'>
      <dt className='text-sm text-text-muted-light dark:text-text-muted-dark'>{label}</dt>
      <dd className='text-sm font-medium sm:col-span-2'>{value || '—'}</dd>
    </div>
  );
}

function SuccessScreen({ result, logoError, onAnother }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.owner_invitation_url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  const { firm } = result;
  return (
    <Panel>
      <div className='mx-auto max-w-2xl py-4 text-center'>
        <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'>
          <Check size={24} aria-hidden='true' />
        </div>
        <h2 className='text-xl font-bold'>{firm.name} is registered</h2>
        <p className='mt-2 text-sm text-text-muted-light dark:text-text-muted-dark'>
          {firm.owner.full_name} is the firm&apos;s administrator. An email with a link to set their password has been sent to <strong>{firm.owner.email}</strong>.
          Once they set it, they sign in from the homepage and land in {firm.name}&apos;s dashboard, where they add their staff and clients.
        </p>
        {logoError && <div className='mt-4 text-left'><ErrorNotice>The firm was created, but the logo could not be uploaded: {logoError}. Upload it again from the firm&apos;s page.</ErrorNotice></div>}
        <div className='mt-6 rounded-xl border border-border-light bg-background-light p-4 text-left dark:border-border-dark dark:bg-background-dark'>
          <p className='text-sm font-semibold'>If the email does not arrive, share this link with the owner directly</p>
          <p className='mt-1 text-xs text-text-muted-light dark:text-text-muted-dark'>It works once, and only until the owner sets a password. Share it only with {firm.owner.full_name}.</p>
          <div className='mt-3 flex flex-col gap-2 sm:flex-row'>
            <input readOnly value={result.owner_invitation_url} aria-label='Owner password link' className={`${inputClass} font-mono text-xs`} onFocus={(event) => event.target.select()} />
            <Button variant='secondary' onClick={copy}>{copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy link</>}</Button>
          </div>
        </div>
        <div className='mt-6 flex flex-wrap justify-center gap-3'>
          <Link to={`/platform/firms/${firm.id}`}><Button>Open firm</Button></Link>
          <Button variant='secondary' onClick={onAnother}>Register another firm</Button>
        </div>
      </div>
    </Panel>
  );
}

export default function PlatformRegisterFirmPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('request');
  const [form, setForm] = useState(EMPTY);
  const [step, setStep] = useState('firm');
  const [completed, setCompleted] = useState(() => new Set());
  const [errors, setErrors] = useState({});
  const [customArea, setCustomArea] = useState('');
  const [logo, setLogo] = useState(null);
  const [result, setResult] = useState(null);
  const [logoError, setLogoError] = useState(null);
  const headingRef = useRef(null);

  const meta = useQuery({ queryKey: ['platform', 'meta'], queryFn: platformService.getMeta });
  const onboardingRequest = useQuery({
    queryKey: ['platform', 'onboarding-request', requestId],
    queryFn: () => platformService.getOnboardingRequest(requestId),
    enabled: Boolean(requestId),
  });

  // Start from what the firm told us on the homepage, when registering from a request.
  const prefilledFrom = useRef(null);
  useEffect(() => {
    const request = onboardingRequest.data;
    if (!request || prefilledFrom.current === request.id) return;
    prefilledFrom.current = request.id;
    const [first, ...rest] = request.contact_name.trim().split(/\s+/);
    // Prefill once from the fetched request.
    setForm((current) => ({
      ...current,
      firm: { ...current.firm, name: request.firm_name, county: request.county || current.firm.county },
      owner: { ...current.owner, first_name: first || '', last_name: rest.join(' '), email: request.email, phone_number: request.phone_number },
      subscription: { ...current.subscription, plan_code: request.preferred_plan || current.subscription.plan_code },
    }));
  }, [onboardingRequest.data]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const plans = useMemo(() => meta.data?.plans || [], [meta.data]);
  const selectedPlan = plans.find((plan) => plan.code === form.subscription.plan_code);
  const vatRate = Number(meta.data?.vat_rate || 16);

  const set = (section, key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [section]: { ...current[section], [key]: value } }));
    clearErrors(`${section}.${key}`);
  };

  // Drop a field's error, and any the server nested under it (e.g. practice_areas.0).
  const clearErrors = (field) => {
    setErrors((current) => Object.fromEntries(
      Object.entries(current).filter(([name]) => name !== field && !name.startsWith(`${field}.`)),
    ));
  };

  const toggleArea = (area) => {
    setForm((current) => ({
      ...current,
      practice_areas: current.practice_areas.includes(area)
        ? current.practice_areas.filter((item) => item !== area)
        : [...current.practice_areas, area],
    }));
    clearErrors('practice_areas');
  };

  const addCustomArea = () => {
    const area = customArea.trim().replace(/\s+/g, ' ');
    if (area && !form.practice_areas.some((item) => item.toLowerCase() === area.toLowerCase())) toggleArea(area);
    setCustomArea('');
  };

  const stepIndex = STEPS.findIndex((item) => item.id === step);
  const goNext = () => {
    const stepErrors = validateStep(step, form);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length) return;
    setCompleted((current) => new Set(current).add(step));
    setStep(STEPS[stepIndex + 1].id);
  };
  const goBack = () => setStep(STEPS[stepIndex - 1].id);

  const register = useMutation({
    mutationFn: () => platformService.registerFirm(buildPayload(form, requestId)),
    onSuccess: async (data) => {
      let finalData = data;
      if (logo) {
        try {
          finalData = { ...data, firm: await platformService.uploadLogo(data.firm.id, logo) };
        } catch (error) {
          setLogoError(getApiErrorMessage(error));
        }
      }
      queryClient.invalidateQueries({ queryKey: ['platform'] });
      setResult(finalData);
    },
    onError: (error) => {
      const serverErrors = error?.response?.data?.errors || {};
      setErrors(serverErrors);
      const first = Object.keys(serverErrors)[0];
      if (first) setStep(FIELD_STEP(first));
    },
  });

  const reset = () => {
    setForm(EMPTY);
    setStep('firm');
    setCompleted(new Set());
    setErrors({});
    setLogo(null);
    setLogoError(null);
    setResult(null);
    register.reset();
  };

  if (result) {
    return (
      <>
        <PageHeader title='Register a law firm' />
        <SuccessScreen result={result} logoError={logoError} onAnother={reset} />
      </>
    );
  }

  const err = (key) => errors[key];
  // A rejection that named fields is resolved once those fields are corrected; hide its summary then.
  const serverFlaggedFields = Object.keys(register.error?.response?.data?.errors || {}).length > 0;
  const current = STEPS[stepIndex];
  const monthlyPrice = selectedPlan && (form.subscription.billing_cycle === 'ANNUAL' ? selectedPlan.annual_price : selectedPlan.monthly_price);
  const withVat = monthlyPrice ? Number(monthlyPrice) * (1 + vatRate / 100) : null;

  return (
    <>
      <PageHeader
        title='Register a law firm'
        description='Create a firm on behalf of its owner. The owner receives a link to set their password, then administers the firm: its staff, clients and matters.'
      />

      {requestId && onboardingRequest.data && (
        <p className='mb-4 rounded-lg border border-sky-300 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-100'>
          Registering from the request sent by {onboardingRequest.data.contact_name} of {onboardingRequest.data.firm_name}. Their details are filled in; complete the rest.
        </p>
      )}

      <Stepper current={step} completed={completed} onSelect={setStep} />

      <Panel>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (step === 'review') register.mutate();
            else goNext();
          }}
        >
          <div className='mb-6'>
            <h2 ref={headingRef} tabIndex={-1} className='text-lg font-semibold focus:outline-none'>{current.title}</h2>
            <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>{current.description}</p>
          </div>

          {step === 'firm' && (
            <div className='grid gap-5 md:grid-cols-2'>
              <Field label='Registered firm name' required error={err('firm.name')} className='md:col-span-2'>
                <input value={form.firm.name} onChange={set('firm', 'name')} className={inputClass} placeholder='e.g. Achieng & Mwangi Advocates' />
              </Field>
              <Field label='Business structure' required error={err('firm.business_structure')}>
                <select value={form.firm.business_structure} onChange={set('firm', 'business_structure')} className={inputClass}>
                  {(meta.data?.business_structures || []).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </Field>
              <Field label='BRS registration number' required hint='Business name or partnership number from the Business Registration Service.' error={err('firm.registration_number')}>
                <input value={form.firm.registration_number} onChange={set('firm', 'registration_number')} className={inputClass} placeholder='e.g. BN-2026-0042' />
              </Field>
              <Field label='KRA PIN' required hint='Used on the firm’s tax invoices (eTIMS).' error={err('firm.kra_pin')}>
                <input value={form.firm.kra_pin} onChange={set('firm', 'kra_pin')} className={`${inputClass} uppercase`} placeholder='P051234567X' maxLength={11} />
              </Field>
              <Field label='Logo' hint='PNG or JPG, up to 2 MB. Shown on the firm’s dashboard.'>
                <span className='flex items-center gap-3'>
                  <span className={`${inputClass} flex cursor-pointer items-center gap-2`}>
                    <ImagePlus size={16} aria-hidden='true' />
                    <span className='truncate'>{logo ? logo.name : 'Choose an image'}</span>
                    <input type='file' accept='image/png,image/jpeg,image/webp' className='sr-only' onChange={(event) => setLogo(event.target.files?.[0] || null)} />
                  </span>
                  {logo && <Button variant='ghost' size='sm' onClick={() => setLogo(null)} aria-label='Remove logo'><X size={14} /></Button>}
                </span>
              </Field>
              <Field label='About the firm' hint='A short description shown on the firm’s profile.' className='md:col-span-2'>
                <textarea rows={3} value={form.firm.description} onChange={set('firm', 'description')} className={inputClass} />
              </Field>
            </div>
          )}

          {step === 'contact' && (
            <div className='grid gap-5 md:grid-cols-2'>
              <Field label='Firm email' required error={err('firm.email')}>
                <input type='email' value={form.firm.email} onChange={set('firm', 'email')} className={inputClass} placeholder='info@firm.co.ke' />
              </Field>
              <Field label='Firm phone' required error={err('firm.phone_number')}>
                <input type='tel' value={form.firm.phone_number} onChange={set('firm', 'phone_number')} className={inputClass} placeholder='+254 7XX XXX XXX' />
              </Field>
              <Field label='Website' error={err('firm.website')}>
                <input type='url' value={form.firm.website} onChange={set('firm', 'website')} className={inputClass} placeholder='https://' />
              </Field>
              <Field label='Postal address' error={err('firm.postal_address')}>
                <input value={form.firm.postal_address} onChange={set('firm', 'postal_address')} className={inputClass} placeholder='P.O. Box 1234-00100 Nairobi' />
              </Field>
              <Field label='Physical address' required hint='Building, floor and street of the head office.' error={err('firm.physical_address')} className='md:col-span-2'>
                <input value={form.firm.physical_address} onChange={set('firm', 'physical_address')} className={inputClass} />
              </Field>
              <Field label='County' required error={err('firm.county')}>
                <select value={form.firm.county} onChange={set('firm', 'county')} className={inputClass}>
                  <option value=''>Choose a county</option>
                  {(meta.data?.counties || []).map((county) => <option key={county} value={county}>{county}</option>)}
                </select>
              </Field>
              <Field label='Town' required error={err('firm.town')}>
                <input value={form.firm.town} onChange={set('firm', 'town')} className={inputClass} />
              </Field>
              <Field label='Head office name' error={err('office.name')}>
                <input value={form.office.name} onChange={set('office', 'name')} className={inputClass} />
              </Field>
              <div className='grid grid-cols-2 gap-3'>
                <Field label='Opens' error={err('settings.opening_time')}>
                  <input type='time' value={form.settings.opening_time} onChange={set('settings', 'opening_time')} className={inputClass} />
                </Field>
                <Field label='Closes' error={err('settings.closing_time')}>
                  <input type='time' value={form.settings.closing_time} onChange={set('settings', 'closing_time')} className={inputClass} />
                </Field>
              </div>
              <label className='flex items-center gap-2 text-sm md:col-span-2'>
                <input type='checkbox' checked={form.settings.work_on_saturday} onChange={set('settings', 'work_on_saturday')} />
                The office opens on Saturdays
              </label>
            </div>
          )}

          {step === 'practice' && (
            <div>
              <fieldset>
                <legend className='mb-3 text-sm font-medium'>Choose every area the firm practises</legend>
                <div className='flex flex-wrap gap-2'>
                  {[...new Set([...(meta.data?.practice_areas || []), ...form.practice_areas])].map((area) => {
                    const selected = form.practice_areas.includes(area);
                    return (
                      <button
                        key={area}
                        type='button'
                        aria-pressed={selected}
                        onClick={() => toggleArea(area)}
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition ${selected ? 'border-brand-primary bg-brand-primary text-white dark:border-sky-500 dark:bg-sky-700' : 'border-border-light hover:bg-background-light dark:border-border-dark dark:hover:bg-background-dark'}`}
                      >
                        {selected && <Check size={14} aria-hidden='true' />}
                        {area}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div className='mt-5 flex max-w-lg gap-2'>
                <label className='flex-1'>
                  <span className='sr-only'>Another practice area</span>
                  <input
                    value={customArea}
                    onChange={(event) => setCustomArea(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addCustomArea();
                      }
                    }}
                    className={inputClass}
                    placeholder='Another practice area'
                  />
                </label>
                <Button variant='secondary' onClick={addCustomArea} disabled={!customArea.trim()}><Plus size={14} /> Add</Button>
              </div>
              {err('practice_areas') && <p role='alert' className='mt-3 text-sm font-medium text-error dark:text-red-300'>{err('practice_areas')}</p>}
            </div>
          )}

          {step === 'owner' && (
            <div className='grid gap-5 md:grid-cols-2'>
              <p className='rounded-lg bg-background-light p-3 text-sm text-text-muted-light dark:bg-background-dark dark:text-text-muted-dark md:col-span-2'>
                The owner signs in with this email address and becomes the firm&apos;s administrator and first advocate. They set their own password; you never see it.
              </p>
              <Field label='First name' required error={err('owner.first_name')}>
                <input value={form.owner.first_name} onChange={set('owner', 'first_name')} className={inputClass} />
              </Field>
              <Field label='Last name' required error={err('owner.last_name')}>
                <input value={form.owner.last_name} onChange={set('owner', 'last_name')} className={inputClass} />
              </Field>
              <Field label='Email (used to sign in)' required error={err('owner.email')}>
                <input type='email' value={form.owner.email} onChange={set('owner', 'email')} className={inputClass} autoComplete='off' />
              </Field>
              <Field label='Phone number' required error={err('owner.phone_number')}>
                <input type='tel' value={form.owner.phone_number} onChange={set('owner', 'phone_number')} className={inputClass} />
              </Field>
              <Field label='National ID number' required error={err('owner.national_id_number')}>
                <input value={form.owner.national_id_number} onChange={set('owner', 'national_id_number')} className={inputClass} />
              </Field>
              <Field label='Advocate admission number' required hint='Roll of Advocates number, e.g. P.105/1234/15.' error={err('owner.admission_number')}>
                <input value={form.owner.admission_number} onChange={set('owner', 'admission_number')} className={inputClass} />
              </Field>
              <Field label='Title' error={err('owner.job_title')}>
                <input value={form.owner.job_title} onChange={set('owner', 'job_title')} className={inputClass} />
              </Field>
            </div>
          )}

          {step === 'plan' && (
            <div className='space-y-6'>
              <fieldset>
                <legend className='mb-3 text-sm font-medium'>Plan</legend>
                <div className='grid gap-4 md:grid-cols-2'>
                  {plans.map((plan) => {
                    const selected = form.subscription.plan_code === plan.code;
                    return (
                      <label key={plan.code} className={`cursor-pointer rounded-xl border p-4 transition ${selected ? 'border-brand-primary ring-2 ring-brand-primary dark:border-sky-500 dark:ring-sky-500' : 'border-border-light hover:bg-background-light dark:border-border-dark dark:hover:bg-background-dark'}`}>
                        <input type='radio' name='plan' value={plan.code} checked={selected} onChange={set('subscription', 'plan_code')} className='sr-only' />
                        <span className='flex items-baseline justify-between gap-2'>
                          <span className='text-base font-bold'>{plan.name}</span>
                          <span className='text-sm font-semibold tabular-nums'>{formatKes(plan.monthly_price)}<span className='font-normal text-text-muted-light dark:text-text-muted-dark'> / month</span></span>
                        </span>
                        <span className='mt-1 block text-xs text-text-muted-light dark:text-text-muted-dark'>{plan.tagline}</span>
                        <ul className='mt-3 space-y-1 text-xs'>
                          {Object.entries(plan.limits).map(([key, value]) => (
                            <li key={key}>{LIMIT_LABELS[key]}: <strong>{formatLimit(value)}</strong></li>
                          ))}
                          {plan.features.map((feature) => (
                            <li key={feature.code} className={feature.included ? '' : 'text-text-muted-light line-through dark:text-text-muted-dark'}>
                              {feature.included ? '✓' : '✗'} {feature.label}
                            </li>
                          ))}
                        </ul>
                      </label>
                    );
                  })}
                </div>
                {err('subscription.plan_code') && <p role='alert' className='mt-2 text-sm text-error'>{err('subscription.plan_code')}</p>}
              </fieldset>

              <div className='grid gap-5 md:grid-cols-2'>
                <Field label='Billing cycle'>
                  <select value={form.subscription.billing_cycle} onChange={set('subscription', 'billing_cycle')} className={inputClass}>
                    {(meta.data?.billing_cycles || []).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </Field>
                <Field label='How the subscription starts'>
                  <select value={form.subscription.start} onChange={set('subscription', 'start')} className={inputClass}>
                    {(meta.data?.onboarding_starts || []).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </Field>
                {form.subscription.start === 'TRIAL' ? (
                  <Field label='Trial length (days)' hint='The firm pays by M-Pesa before the trial ends.'>
                    <input type='number' min={1} max={90} value={form.subscription.trial_days} onChange={set('subscription', 'trial_days')} className={inputClass} />
                  </Field>
                ) : (
                  <>
                    <Field label='M-Pesa confirmation code' required hint='Check it against the Paybill statement first. It is recorded as a paid invoice.' error={err('subscription.mpesa_receipt')}>
                      <input value={form.subscription.mpesa_receipt} onChange={set('subscription', 'mpesa_receipt')} className={`${inputClass} font-mono uppercase`} maxLength={10} placeholder='SIB7XK2LQ9' />
                    </Field>
                    <Field label='Paid from phone number'>
                      <input type='tel' value={form.subscription.payer_phone} onChange={set('subscription', 'payer_phone')} className={inputClass} />
                    </Field>
                  </>
                )}
              </div>
              {selectedPlan && (
                <p className='rounded-lg bg-background-light p-3 text-sm dark:bg-background-dark'>
                  {selectedPlan.name}, billed {form.subscription.billing_cycle === 'ANNUAL' ? 'annually' : 'monthly'}: <strong>{formatKes(monthlyPrice)}</strong> + {vatRate}% VAT = <strong>{formatKes(withVat)}</strong> per {form.subscription.billing_cycle === 'ANNUAL' ? 'year' : 'month'}.
                </p>
              )}
            </div>
          )}

          {step === 'review' && (
            <div className='grid gap-6 lg:grid-cols-2'>
              <div>
                <h3 className='mb-1 text-sm font-semibold uppercase tracking-wide text-text-muted-light dark:text-text-muted-dark'>Firm</h3>
                <dl className='divide-y divide-border-light dark:divide-border-dark'>
                  <ReviewRow label='Name' value={form.firm.name} />
                  <ReviewRow label='Structure' value={meta.data?.business_structures.find((item) => item.value === form.firm.business_structure)?.label} />
                  <ReviewRow label='BRS number' value={form.firm.registration_number} />
                  <ReviewRow label='KRA PIN' value={form.firm.kra_pin.toUpperCase()} />
                  <ReviewRow label='Email / phone' value={`${form.firm.email} · ${form.firm.phone_number}`} />
                  <ReviewRow label='Office' value={`${form.firm.physical_address}, ${form.firm.town}, ${form.firm.county}`} />
                  <ReviewRow label='Hours' value={`${form.settings.opening_time}–${form.settings.closing_time}${form.settings.work_on_saturday ? ', Saturdays too' : ''}`} />
                  <ReviewRow label='Practice areas' value={form.practice_areas.join(', ')} />
                  <ReviewRow label='Logo' value={logo?.name} />
                </dl>
              </div>
              <div>
                <h3 className='mb-1 text-sm font-semibold uppercase tracking-wide text-text-muted-light dark:text-text-muted-dark'>Owner</h3>
                <dl className='divide-y divide-border-light dark:divide-border-dark'>
                  <ReviewRow label='Name' value={`${form.owner.first_name} ${form.owner.last_name} (${form.owner.job_title})`} />
                  <ReviewRow label='Signs in with' value={form.owner.email} />
                  <ReviewRow label='Phone' value={form.owner.phone_number} />
                  <ReviewRow label='National ID' value={form.owner.national_id_number} />
                  <ReviewRow label='Admission no.' value={form.owner.admission_number} />
                </dl>
                <h3 className='mb-1 mt-6 text-sm font-semibold uppercase tracking-wide text-text-muted-light dark:text-text-muted-dark'>Subscription</h3>
                <dl className='divide-y divide-border-light dark:divide-border-dark'>
                  <ReviewRow label='Plan' value={`${selectedPlan?.name || form.subscription.plan_code}, ${form.subscription.billing_cycle.toLowerCase()}`} />
                  <ReviewRow
                    label='Starts as'
                    value={form.subscription.start === 'TRIAL'
                      ? `${form.subscription.trial_days}-day free trial`
                      : `Paid, M-Pesa ${form.subscription.mpesa_receipt.toUpperCase()}`}
                  />
                </dl>
              </div>
            </div>
          )}

          {register.error && !serverFlaggedFields && <div className='mt-6'><ErrorNotice error={register.error} /></div>}
          {register.error && serverFlaggedFields && Object.keys(errors).length > 0 && (
            <div className='mt-6'><ErrorNotice>{getApiErrorMessage(register.error)}</ErrorNotice></div>
          )}

          <div className='mt-8 flex items-center justify-between gap-3 border-t border-border-light pt-5 dark:border-border-dark'>
            <Button variant='secondary' onClick={goBack} disabled={stepIndex === 0}>Back</Button>
            {step === 'review'
              ? <Button type='submit' disabled={register.isPending}>{register.isPending ? 'Creating the firm…' : 'Create firm and invite owner'}</Button>
              : <Button type='submit'>Continue</Button>}
          </div>
        </form>
      </Panel>
    </>
  );
}
