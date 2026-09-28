import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Minus, Smartphone } from 'lucide-react';

import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import Swal from '@/core/utils/themedSwal';
import { getApiErrorMessage } from '@/core/utils/errorMessages';
import subscriptionService from '@/modules/subscription/services/subscriptionService';
import useSubscription, { SUBSCRIPTION_QUERY_KEY } from '@/modules/subscription/hooks/useSubscription';
import {
  LIMIT_LABELS,
  STATUS_LABELS,
  formatKes,
  formatLimit,
  formatSubscriptionDate,
} from '@/modules/admin/subscription/utils/subscriptionFormatting';

const INVOICES_QUERY_KEY = ['subscription', 'invoices'];
const primaryButton =
  'inline-flex min-h-10 items-center justify-center rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500';
const inputClass =
  'w-full rounded-lg border border-border-light bg-white px-3 py-2 text-sm text-gray-900 dark:border-border-dark dark:bg-slate-900 dark:text-white';

function UsageMeter({ label, used, limit }) {
  const unlimited = limit === null || limit === undefined;
  const percent = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  const full = !unlimited && used >= limit;
  return (
    <div>
      <div className='flex justify-between text-sm'>
        <span className='font-medium text-gray-700 dark:text-gray-200'>{label}</span>
        <span className={full ? 'font-semibold text-red-700 dark:text-red-300' : 'text-gray-600 dark:text-gray-300'}>
          {used} / {formatLimit(limit)}
        </span>
      </div>
      <div className='mt-2 h-2 rounded-full bg-gray-200 dark:bg-white/10' aria-hidden='true'>
        {!unlimited && (
          <div
            className={`h-2 rounded-full ${full ? 'bg-red-500' : 'bg-blue-600 dark:bg-blue-400'}`}
            style={{ width: `${percent}%` }}
          />
        )}
      </div>
    </div>
  );
}

function PendingInvoice({ invoice, instructions, onPaid }) {
  const [receipt, setReceipt] = useState('');
  const [phone, setPhone] = useState('');
  const mutation = useMutation({
    mutationFn: () => subscriptionService.submitPayment(invoice.id, { mpesa_receipt: receipt, payer_phone: phone }),
    onSuccess: () => {
      onPaid();
      Swal.fire({
        icon: 'success',
        title: 'Payment submitted',
        text: 'We will confirm the M-Pesa payment against the Paybill statement and activate the plan.',
      });
    },
    onError: (error) => Swal.fire({ icon: 'error', title: 'Payment not submitted', text: getApiErrorMessage(error) }),
  });

  if (invoice.status === 'PAYMENT_SUBMITTED') {
    return (
      <Card className='p-6'>
        <h2 className='text-lg font-semibold'>Payment awaiting confirmation</h2>
        <p className='mt-2 text-sm text-gray-600 dark:text-gray-300'>
          Invoice {invoice.number} ({formatKes(invoice.total)}) — M-Pesa code {invoice.mpesa_receipt}. The plan
          activates once the payment is confirmed.
        </p>
      </Card>
    );
  }

  return (
    <Card className='p-6'>
      <div className='flex items-center gap-2'>
        <Smartphone size={20} className='text-green-700 dark:text-green-400' aria-hidden='true' />
        <h2 className='text-lg font-semibold'>Pay invoice {invoice.number}</h2>
      </div>
      <dl className='mt-4 grid gap-3 text-sm sm:grid-cols-2'>
        <div><dt className='text-gray-500 dark:text-gray-400'>Plan</dt><dd className='font-medium'>{invoice.plan_name} ({invoice.billing_cycle.toLowerCase()})</dd></div>
        <div><dt className='text-gray-500 dark:text-gray-400'>Amount excl. VAT</dt><dd className='font-medium'>{formatKes(invoice.amount_excl_vat)}{Number(invoice.proration_credit) > 0 && ` (after ${formatKes(invoice.proration_credit)} credit for unused time)`}</dd></div>
        <div><dt className='text-gray-500 dark:text-gray-400'>VAT {Number(invoice.vat_rate)}%</dt><dd className='font-medium'>{formatKes(invoice.vat_amount)}</dd></div>
        <div><dt className='text-gray-500 dark:text-gray-400'>Total to pay</dt><dd className='text-base font-bold'>{formatKes(invoice.total)}</dd></div>
      </dl>
      <ol className='mt-5 list-decimal space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-200'>
        <li>M-Pesa → Lipa na M-Pesa → Pay Bill.</li>
        <li>Business number: <strong>{instructions?.paybill || 'provided by the platform'}</strong></li>
        <li>Account number: <strong>{invoice.number}</strong></li>
        <li>Amount: <strong>{formatKes(invoice.total)}</strong>, then enter the confirmation code below.</li>
      </ol>
      <form
        className='mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end'
        onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}
      >
        <label className='text-sm'>
          <span className='mb-1 block font-medium'>M-Pesa confirmation code</span>
          <input className={inputClass} value={receipt} onChange={(e) => setReceipt(e.target.value.toUpperCase())} maxLength={10} placeholder='e.g. SIB7XK2LQ9' required />
        </label>
        <label className='text-sm'>
          <span className='mb-1 block font-medium'>Paying phone number</span>
          <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder='07XX XXX XXX' inputMode='tel' />
        </label>
        <button type='submit' className={primaryButton} disabled={mutation.isPending || receipt.length !== 10}>
          {mutation.isPending ? 'Submitting…' : 'Submit payment'}
        </button>
      </form>
    </Card>
  );
}

function PlanCard({ plan, cycle, current, onChoose, busy }) {
  const price = cycle === 'ANNUAL' ? plan.annual_price : plan.monthly_price;
  return (
    <Card className={`flex flex-col p-6 ${current ? 'ring-2 ring-blue-500' : ''}`}>
      <div className='flex items-start justify-between gap-2'>
        <h3 className='text-xl font-bold'>{plan.name}</h3>
        {current && <span className='rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-500/20 dark:text-blue-200'>Current</span>}
      </div>
      <p className='mt-1 min-h-10 text-sm text-gray-600 dark:text-gray-300'>{plan.tagline}</p>
      <p className='mt-4 text-3xl font-bold'>
        {formatKes(price)}
        <span className='text-sm font-medium text-gray-500 dark:text-gray-400'> /{cycle === 'ANNUAL' ? 'year' : 'month'} + VAT</span>
      </p>
      <ul className='mt-4 space-y-1 text-sm'>
        {Object.entries(plan.limits).map(([key, value]) => (
          <li key={key}><strong>{formatLimit(value)}</strong> {LIMIT_LABELS[key].toLowerCase()}</li>
        ))}
      </ul>
      <ul className='mt-4 flex-1 space-y-2 text-sm'>
        {plan.features.map((feature) => (
          <li key={feature.code} className={`flex gap-2 ${feature.included ? '' : 'text-gray-400 dark:text-gray-500'}`}>
            {feature.included
              ? <Check size={16} className='mt-0.5 shrink-0 text-green-600' aria-label='Included' />
              : <Minus size={16} className='mt-0.5 shrink-0' aria-label='Not included' />}
            {feature.label}
          </li>
        ))}
      </ul>
      <button type='button' className={`${primaryButton} mt-6`} onClick={() => onChoose(plan)} disabled={busy}>
        {current ? 'Renew this plan' : `Choose ${plan.name}`}
      </button>
    </Card>
  );
}

export default function AdminSubscriptionPage() {
  const queryClient = useQueryClient();
  const { subscription, isLoading, isError } = useSubscription();
  const [cycle, setCycle] = useState('MONTHLY');
  const plansQuery = useQuery({ queryKey: ['subscription', 'plans'], queryFn: subscriptionService.getPlans });
  const invoicesQuery = useQuery({ queryKey: INVOICES_QUERY_KEY, queryFn: subscriptionService.getInvoices });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY });
  };

  const invoiceMutation = useMutation({
    mutationFn: (plan) => subscriptionService.requestInvoice({ plan_code: plan.code, billing_cycle: cycle }),
    onSuccess: refresh,
    onError: (error) => Swal.fire({ icon: 'error', title: 'Cannot change plan', text: getApiErrorMessage(error) }),
  });

  if (isLoading) {
    return <div className='flex min-h-[420px] items-center justify-center'>Loading subscription…</div>;
  }
  if (isError || !subscription) {
    return <div className='flex min-h-[420px] items-center justify-center'>Failed to load the subscription.</div>;
  }

  const invoices = invoicesQuery.data?.invoices || [];
  const pending = invoices.find((invoice) => ['ISSUED', 'PAYMENT_SUBMITTED'].includes(invoice.status));
  const plans = plansQuery.data?.plans || [];
  const periodLabel = subscription.effective_status === 'TRIALING' ? 'Trial ends' : 'Current period ends';
  const periodDate = subscription.effective_status === 'TRIALING' ? subscription.trial_ends_at : subscription.current_period_end;

  return (
    <div className='space-y-8 p-4 sm:p-6'>
      <SectionHeading
        title='Subscription'
        subtitle='Your firm’s plan, usage and M-Pesa billing. Prices are in Kenya shillings and exclude 16% VAT.'
        size='hero'
        as='h1'
      />

      <Card className='p-6'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <p className='text-sm text-gray-500 dark:text-gray-400'>Current plan</p>
            <p className='text-2xl font-bold'>{subscription.plan.name}</p>
            <p className='mt-1 text-sm'>{STATUS_LABELS[subscription.effective_status] || subscription.effective_status}</p>
          </div>
          <div className='text-sm sm:text-right'>
            <p className='text-gray-500 dark:text-gray-400'>{periodLabel}</p>
            <p className='font-semibold'>{periodDate ? formatSubscriptionDate(periodDate) : 'No expiry'}</p>
            <p className='mt-1 text-gray-500 dark:text-gray-400'>Billed {subscription.billing_cycle.toLowerCase()}</p>
          </div>
        </div>
        <div className='mt-6 grid gap-5 sm:grid-cols-2'>
          {Object.keys(LIMIT_LABELS).map((key) => (
            <UsageMeter key={key} label={LIMIT_LABELS[key]} used={subscription.usage[key]} limit={subscription.plan.limits[key]} />
          ))}
        </div>
      </Card>

      {pending && (
        <PendingInvoice invoice={pending} instructions={subscription.payment_instructions} onPaid={refresh} />
      )}

      <section aria-labelledby='plans-heading' className='space-y-4'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <h2 id='plans-heading' className='text-xl font-bold'>Plans</h2>
          <div role='group' aria-label='Billing cycle' className='inline-flex rounded-lg border border-border-light p-1 dark:border-border-dark'>
            {[['MONTHLY', 'Monthly'], ['ANNUAL', 'Annual (2 months free)']].map(([value, label]) => (
              <button
                key={value}
                type='button'
                aria-pressed={cycle === value}
                onClick={() => setCycle(value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${cycle === value ? 'bg-brand-primary text-white dark:bg-blue-500' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className='grid gap-6 md:grid-cols-2 xl:grid-cols-4'>
          {plans.map((plan) => (
            <PlanCard
              key={plan.code}
              plan={plan}
              cycle={cycle}
              current={plan.code === subscription.plan.code}
              busy={invoiceMutation.isPending}
              onChoose={(chosen) => invoiceMutation.mutate(chosen)}
            />
          ))}
        </div>
        {plansQuery.data?.included_in_every_plan && (
          <Card className='p-6'>
            <h3 className='font-semibold'>Included in every plan</h3>
            <p className='mt-1 text-sm text-gray-600 dark:text-gray-300'>
              Statutory and professional obligations are never tiered.
            </p>
            <ul className='mt-3 grid gap-2 text-sm sm:grid-cols-2'>
              {plansQuery.data.included_in_every_plan.map((line) => (
                <li key={line} className='flex gap-2'>
                  <Check size={16} className='mt-0.5 shrink-0 text-green-600' aria-hidden='true' />
                  {line}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      {invoices.length > 0 && (
        <Card className='overflow-x-auto p-6'>
          <h2 className='mb-4 text-lg font-semibold'>Invoices</h2>
          <table className='w-full min-w-[640px] text-left text-sm'>
            <thead className='text-gray-500 dark:text-gray-400'>
              <tr>
                <th className='py-2 pr-4 font-medium'>Number</th>
                <th className='py-2 pr-4 font-medium'>Plan</th>
                <th className='py-2 pr-4 font-medium'>Date</th>
                <th className='py-2 pr-4 text-right font-medium'>Total</th>
                <th className='py-2 pr-4 font-medium'>M-Pesa code</th>
                <th className='py-2 font-medium'>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className='border-t border-border-light dark:border-border-dark'>
                  <td className='py-2 pr-4 font-medium'>{invoice.number}</td>
                  <td className='py-2 pr-4'>{invoice.plan_name} ({invoice.billing_cycle.toLowerCase()})</td>
                  <td className='py-2 pr-4'>{formatSubscriptionDate(invoice.created_at)}</td>
                  <td className='py-2 pr-4 text-right tabular-nums'>{formatKes(invoice.total)}</td>
                  <td className='py-2 pr-4'>{invoice.mpesa_receipt || '—'}</td>
                  <td className='py-2'>{invoice.status_label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
