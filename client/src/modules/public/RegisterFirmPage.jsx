import { lazy, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Building2, CheckCircle2 } from 'lucide-react';

import { KENYAN_COUNTIES } from '@/core/constants/kenyanCounties';
import { getApiErrorMessage } from '@/core/utils/errorMessages';
import { formatKes } from '@/modules/admin/subscription/utils/subscriptionFormatting';
import platformService from '@/modules/platform/services/platformService';
import subscriptionService from '@/modules/subscription/services/subscriptionService';

const FirmSignup = lazy(() => import('@/modules/auth/pages/FirmSignup'));

const inputClass = 'form-control';

function Field({ label, required, error, children, className = '' }) {
  return (
    <label className={`form-label ${className}`}>
      <span>
        {label}{required && <span className='text-[color:var(--form-danger)]' aria-hidden='true'> *</span>}
      </span>
      {children}
      {error && <span role='alert' className='form-error text-xs'>{error}</span>}
    </label>
  );
}

function OnboardingRequestForm({ plans }) {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    firm_name: '', contact_name: '', email: '', phone_number: '', county: '',
    advocates_count: '', preferred_plan: searchParams.get('plan') || '', message: '',
  });
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = useMutation({
    mutationFn: () => platformService.submitOnboardingRequest({
      ...form,
      advocates_count: form.advocates_count === '' ? null : Number(form.advocates_count),
    }),
  });
  const errors = submit.error?.response?.data?.errors || {};

  if (submit.isSuccess) {
    return (
      <div className='py-6 text-center'>
        <CheckCircle2 size={44} className='mx-auto text-success' aria-hidden='true' />
        <h2 className='mt-4 text-xl font-bold'>Thank you, we have your request</h2>
        <p className='mx-auto mt-2 max-w-md text-sm text-text-muted-light dark:text-text-muted-dark'>
          The Sheria Master team will contact {form.contact_name.split(' ')[0] || 'you'} on {form.phone_number} or {form.email} to confirm your firm&apos;s
          details and set up its workspace. The firm owner then receives a link to sign in.
        </p>
        <Link to='/' className='mt-6 inline-flex rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white dark:bg-sky-600'>Back to the homepage</Link>
      </div>
    );
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); submit.mutate(); }} className='grid gap-5 sm:grid-cols-2'>
      <Field label='Firm name' required error={errors.firm_name} className='sm:col-span-2'>
        <input required value={form.firm_name} onChange={set('firm_name')} className={inputClass} placeholder='e.g. Achieng & Mwangi Advocates' />
      </Field>
      <Field label='Your name' required error={errors.contact_name}>
        <input required value={form.contact_name} onChange={set('contact_name')} className={inputClass} autoComplete='name' />
      </Field>
      <Field label='Phone number' required error={errors.phone_number}>
        <input required type='tel' value={form.phone_number} onChange={set('phone_number')} className={inputClass} autoComplete='tel' placeholder='+254 7XX XXX XXX' />
      </Field>
      <Field label='Email' required error={errors.email}>
        <input required type='email' value={form.email} onChange={set('email')} className={inputClass} autoComplete='email' />
      </Field>
      <Field label='County' error={errors.county}>
        <select value={form.county} onChange={set('county')} className={inputClass}>
          <option value=''>Choose a county</option>
          {KENYAN_COUNTIES.map((county) => <option key={county}>{county}</option>)}
        </select>
      </Field>
      <Field label='Number of advocates' error={errors.advocates_count}>
        <input type='number' min='1' value={form.advocates_count} onChange={set('advocates_count')} className={inputClass} />
      </Field>
      <Field label='Plan you are interested in' error={errors.preferred_plan}>
        <select value={form.preferred_plan} onChange={set('preferred_plan')} className={inputClass}>
          <option value=''>Not sure yet</option>
          {plans.map((plan) => <option key={plan.code} value={plan.code}>{plan.name} ({formatKes(plan.monthly_price)} / month)</option>)}
        </select>
      </Field>
      <Field label='Anything we should know?' error={errors.message} className='sm:col-span-2'>
        <textarea rows={3} maxLength={2000} value={form.message} onChange={set('message')} className={inputClass} placeholder='For example, how many offices you have or when you would like to start.' />
      </Field>
      {submit.error && (
        <p role='alert' className='rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-950/60 dark:text-red-100 sm:col-span-2'>
          {getApiErrorMessage(submit.error)}
        </p>
      )}
      <div className='sm:col-span-2'>
        <button type='submit' disabled={submit.isPending} className='w-full rounded-xl bg-brand-primary px-5 py-3 font-bold text-white transition hover:bg-[#0e2c47] disabled:opacity-60 dark:bg-sky-600 dark:hover:bg-sky-500'>
          {submit.isPending ? 'Sending…' : 'Request registration'}
        </button>
        <p className='mt-3 text-center text-xs text-text-muted-light dark:text-text-muted-dark'>
          We use these details only to contact you about registering your firm (Data Protection Act, 2019).
        </p>
      </div>
    </form>
  );
}

export default function RegisterFirmPage() {
  const plansQuery = useQuery({ queryKey: ['subscription', 'plans'], queryFn: subscriptionService.getPlans });

  if (plansQuery.data?.firm_signup_enabled) return <FirmSignup />;

  return (
    <div className='bg-background-light px-4 pb-16 pt-32 dark:bg-background-dark sm:px-6'>
      <div className='mx-auto grid max-w-6xl gap-10 lg:grid-cols-5'>
        <div className='lg:col-span-2'>
          <span className='flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary dark:bg-sky-400/10 dark:text-sky-300'>
            <Building2 size={24} aria-hidden='true' />
          </span>
          <h1 className='mt-5 text-3xl font-bold tracking-tight'>Register your firm</h1>
          <p className='mt-3 leading-relaxed text-text-muted-light dark:text-text-muted-dark'>
            Tell us how to reach you. Our team will call to confirm your firm&apos;s details (registration number, KRA PIN,
            offices, practice areas and the managing partner) and set up your workspace.
          </p>
          <ol className='mt-8 space-y-4 text-sm'>
            {[
              'We call you and confirm your firm’s details and plan.',
              'We create your firm’s workspace with its owner account.',
              'The owner gets a link to set a password and signs in.',
              'The owner adds staff and clients. Everyone signs in from this site.',
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
        <div className='rounded-3xl border border-border-light bg-surface-light p-6 shadow-medium dark:border-border-dark dark:bg-surface-dark sm:p-8 lg:col-span-3'>
          <OnboardingRequestForm plans={plansQuery.data?.plans || []} />
        </div>
      </div>
    </div>
  );
}
