import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { formatKes, formatSubscriptionDate } from '@/modules/admin/subscription/utils/subscriptionFormatting';
import platformService from '@/modules/platform/services/platformService';
import { Button, ErrorNotice, Panel, StatusBadge } from '@/modules/platform/components/ui';

const KIND_LABELS = {
  UPGRADE: 'Upgrade',
  DOWNGRADE: 'Downgrade',
  RENEWAL: 'Renew early',
  CYCLE_CHANGE: 'Change billing',
  SUBSCRIBE: 'Start paid plan',
};

const CYCLES = [['MONTHLY', 'Monthly'], ['ANNUAL', 'Annual']];

function Breakdown({ quote, cycle }) {
  const rows = [
    [`${cycle === 'ANNUAL' ? 'Year' : 'Month'} on this plan`, formatKes(quote.list_price)],
    Number(quote.unused_value) > 0 && ['Less unused paid time', `− ${formatKes(quote.unused_value)}`],
    Number(quote.credit_balance_used) > 0 && ['Less credit balance', `− ${formatKes(quote.credit_balance_used)}`],
    [`VAT ${Number(quote.vat_rate)}%`, formatKes(quote.vat_amount)],
  ].filter(Boolean);
  return (
    <dl className='mt-2 space-y-0.5 text-xs text-text-muted-light dark:text-text-muted-dark'>
      {rows.map(([label, value]) => (
        <div key={label} className='flex justify-between gap-3'><dt>{label}</dt><dd className='tabular-nums'>{value}</dd></div>
      ))}
      <div className='flex justify-between gap-3'><dt>New period</dt><dd>{formatSubscriptionDate(quote.period_start)} – {formatSubscriptionDate(quote.period_end)}</dd></div>
      {Number(quote.credit_carried_forward) > 0 && (
        <div className='flex justify-between gap-3 font-medium text-emerald-700 dark:text-emerald-300'>
          <dt>Kept as credit for the next invoice</dt><dd className='tabular-nums'>{formatKes(quote.credit_carried_forward)}</dd>
        </div>
      )}
    </dl>
  );
}

/** What the firm can move to, what each move costs today and whether it qualifies. */
export default function PlanChangePanel({ firmId, onChanged }) {
  const queryClient = useQueryClient();
  const key = ['platform', 'firm', firmId, 'plan-change'];
  const options = useQuery({ queryKey: key, queryFn: () => platformService.getPlanChange(firmId) });
  const [cycle, setCycle] = useState(null);
  const [result, setResult] = useState(null);

  const issue = useMutation({
    mutationFn: (choice) => platformService.issuePlanChange(firmId, choice),
    onSuccess: (data) => {
      queryClient.setQueryData(key, data);
      setResult(data.invoice);
      onChanged?.();
    },
  });

  if (options.isLoading) return <Panel title='Change plan'><p className='text-sm'>Working out the options…</p></Panel>;
  if (options.error) return <Panel title='Change plan'><ErrorNotice error={options.error} /></Panel>;

  const { current, open_invoice: openInvoice, blockers, options: rows } = options.data;
  const shownCycle = cycle || current.billing_cycle;
  const shown = rows.filter((row) => row.billing_cycle === shownCycle);

  return (
    <Panel
      title='Change plan'
      description='Prices today, after crediting the unused part of the paid period. The firm pays by M-Pesa and the plan changes when you confirm the payment.'
    >
      <div className='mb-4 grid gap-3 rounded-xl bg-background-light p-4 text-sm dark:bg-background-dark sm:grid-cols-2'>
        <p>
          <span className='font-semibold'>{current.plan.name}</span>, {current.billing_cycle === 'ANNUAL' ? 'annual' : 'monthly'}{' '}
          <StatusBadge status={current.effective_status} />
        </p>
        <p>
          {current.period_end
            ? <>Paid {formatSubscriptionDate(current.period_start)} – {formatSubscriptionDate(current.period_end)} · {current.days_left} days left</>
            : current.effective_status === 'TRIALING' ? `Trial ends ${formatSubscriptionDate(current.trial_ends_at)}` : 'No paid period running'}
        </p>
        <p>Unused paid time worth <strong className='tabular-nums'>{formatKes(current.unused_value)}</strong></p>
        <p>Credit balance <strong className='tabular-nums'>{formatKes(current.credit_balance)}</strong></p>
      </div>

      {blockers.map((line) => <ErrorNotice key={line}>{line}</ErrorNotice>)}
      {openInvoice && !blockers.length && (
        <p className='mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-100'>
          {openInvoice.number} for {openInvoice.plan_name} ({formatKes(openInvoice.total)}) is awaiting payment. Issuing another invoice voids it.
        </p>
      )}
      {result && (
        <p role='status' className='mb-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950/60 dark:text-emerald-100'>
          {result.status === 'PAID'
            ? `Credit covered ${result.plan_name} in full, so the firm is on it now.`
            : `${result.number} issued: ${formatKes(result.total)} for ${result.plan_name}. The owner has been notified to pay by M-Pesa.`}
        </p>
      )}
      <ErrorNotice error={issue.error} />

      <div role='group' aria-label='Billing cycle' className='mb-4 inline-flex rounded-lg border border-border-light p-1 dark:border-border-dark'>
        {CYCLES.map(([value, label]) => (
          <button
            key={value}
            type='button'
            aria-pressed={shownCycle === value}
            onClick={() => setCycle(value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${shownCycle === value ? 'bg-brand-primary text-white dark:bg-sky-700' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      <ul className='grid gap-3 md:grid-cols-2'>
        {shown.map((row) => (
          <li key={`${row.plan.code}-${row.billing_cycle}`} className={`rounded-xl border p-4 ${row.is_current ? 'border-brand-primary dark:border-sky-500' : 'border-border-light dark:border-border-dark'}`}>
            <div className='flex items-baseline justify-between gap-2'>
              <span className='font-bold'>{row.plan.name}</span>
              <span className='rounded-full bg-background-light px-2 py-0.5 text-xs font-semibold dark:bg-background-dark'>
                {row.is_current && row.kind === 'RENEWAL' ? 'Current · renew early' : KIND_LABELS[row.kind]}
              </span>
            </div>
            <p className='mt-1 text-lg font-bold tabular-nums'>
              {formatKes(row.quote.total)} <span className='text-xs font-normal text-text-muted-light dark:text-text-muted-dark'>due now, VAT included</span>
            </p>
            <Breakdown quote={row.quote} cycle={row.billing_cycle} />
            {row.blockers.length > 0 && (
              <ul className='mt-2 space-y-1 text-xs text-red-700 dark:text-red-300'>
                {row.blockers.map((line) => <li key={line}>{line}</li>)}
              </ul>
            )}
            <Button
              size='sm'
              className='mt-3'
              variant={row.eligible ? 'primary' : 'secondary'}
              disabled={!row.eligible || issue.isPending}
              onClick={() => issue.mutate({ plan_code: row.plan.code, billing_cycle: row.billing_cycle })}
            >
              {Number(row.quote.total) === 0 ? 'Apply now (no payment due)' : 'Issue invoice'}
            </Button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
