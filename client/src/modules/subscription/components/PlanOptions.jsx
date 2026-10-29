import { formatKes, formatLimit, LIMIT_LABELS } from '@/modules/admin/subscription/utils/subscriptionFormatting';

const per = (plan) => (plan.pricing_basis === 'ADVOCATE' ? ' per advocate' : ' per firm');

/**
 * Plan cards to choose from, each with its price, limits and which features it
 * includes, so a firm sees the differences the same way wherever it registers.
 */
export default function PlanOptions({ plans, value, onChange, name = 'plan', noneLabel, includedInEveryPlan = [] }) {
  const card = (selected) => `block cursor-pointer rounded-xl border p-4 text-left transition ${selected
    ? 'border-brand-primary ring-2 ring-brand-primary dark:border-sky-500 dark:ring-sky-500'
    : 'border-border-light hover:bg-background-light dark:border-border-dark dark:hover:bg-background-dark'}`;

  return (
    <div className='space-y-4'>
      <div className='grid gap-4 md:grid-cols-2'>
        {plans.map((plan) => {
          const selected = value === plan.code;
          return (
            <label key={plan.code} className={card(selected)}>
              <input type='radio' name={name} value={plan.code} checked={selected} onChange={() => onChange(plan.code)} className='sr-only' />
              <span className='flex items-baseline justify-between gap-2'>
                <span className='text-base font-bold'>{plan.name}</span>
                <span className='text-sm font-semibold tabular-nums'>{formatKes(plan.monthly_price)}<span className='font-normal text-text-muted-light dark:text-text-muted-dark'> / month{per(plan)}</span></span>
              </span>
              <span className='mt-1 block text-xs text-text-muted-light dark:text-text-muted-dark'>{plan.tagline}</span>
              <span className='mt-1 block text-xs text-text-muted-light dark:text-text-muted-dark'>or {formatKes(plan.annual_price)} a year{per(plan)} · prices exclude VAT</span>
              <ul className='mt-3 space-y-1 text-xs'>
                {Object.entries(plan.limits).map(([key, limit]) => (
                  <li key={key}>{LIMIT_LABELS[key]}: <strong>{formatLimit(limit)}</strong></li>
                ))}
                {plan.features.map((feature) => (
                  <li key={feature.code} className={feature.included ? '' : 'text-text-muted-light line-through dark:text-text-muted-dark'}>
                    <span aria-hidden='true'>{feature.included ? '✓' : '✗'}</span>
                    <span className='sr-only'>{feature.included ? 'Included: ' : 'Not included: '}</span> {feature.label}
                  </li>
                ))}
              </ul>
            </label>
          );
        })}
        {noneLabel && (
          <label className={card(value === '')}>
            <input type='radio' name={name} value='' checked={value === ''} onChange={() => onChange('')} className='sr-only' />
            <span className='text-base font-bold'>{noneLabel}</span>
            <span className='mt-1 block text-xs text-text-muted-light dark:text-text-muted-dark'>The platform team will help you choose.</span>
          </label>
        )}
      </div>
      {includedInEveryPlan.length > 0 && (
        <div className='rounded-xl border border-border-light p-4 text-xs dark:border-border-dark'>
          <p className='font-semibold'>Included in every plan</p>
          <ul className='mt-2 grid gap-1 sm:grid-cols-2'>
            {includedInEveryPlan.map((line) => <li key={line}>✓ {line}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
