import { Link } from 'react-router-dom';
import { Check, Minus } from 'lucide-react';

import { formatKes, formatLimit, LIMIT_LABELS } from '@/modules/admin/subscription/utils/subscriptionFormatting';
import SectionIntro from '@/modules/public/sections/SectionIntro';

export default function PricingSection({ plans, includedInEveryPlan, loading }) {
  const featured = plans.length > 1 ? plans[plans.length - 1].code : null;

  return (
    <section id='plans' className='scroll-mt-28 bg-background-light py-20 dark:bg-background-dark sm:py-24'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <SectionIntro
          eyebrow='Plans'
          title='Simple monthly pricing'
          text='Pay by M-Pesa, monthly or yearly. Prices exclude 16% VAT. Statutory compliance features come with every plan.'
        />

        {loading && <p role='status' className='mt-10 text-center text-sm text-text-muted-light'>Loading plans…</p>}

        <div className='mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2'>
          {plans.map((plan) => {
            const isFeatured = plan.code === featured;
            return (
              <article
                key={plan.code}
                className={`flex flex-col rounded-3xl border bg-surface-light p-8 dark:bg-surface-dark ${isFeatured ? 'border-brand-accent shadow-strong ring-1 ring-brand-accent' : 'border-border-light dark:border-border-dark'}`}
              >
                <div className='flex items-center justify-between gap-3'>
                  <h3 className='text-xl font-bold text-text-primary-light dark:text-text-primary-dark'>{plan.name}</h3>
                  {isFeatured && <span className='rounded-full bg-brand-accent/15 px-3 py-1 text-xs font-bold text-[#7a5a14] dark:text-brand-accent'>All features</span>}
                </div>
                <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>{plan.tagline}</p>
                <p className='mt-6'>
                  <span className='text-4xl font-extrabold tabular-nums text-text-primary-light dark:text-text-primary-dark'>{formatKes(plan.monthly_price)}</span>
                  <span className='text-sm text-text-muted-light dark:text-text-muted-dark'> / month</span>
                </p>
                <p className='mt-1 text-xs text-text-muted-light dark:text-text-muted-dark'>or {formatKes(plan.annual_price)} a year</p>

                <ul className='mt-6 space-y-2 text-sm'>
                  {Object.entries(plan.limits).map(([key, value]) => (
                    <li key={key} className='flex items-center gap-2 text-text-primary-light dark:text-text-primary-dark'>
                      <Check size={16} className='shrink-0 text-success' aria-hidden='true' />
                      {value === null ? `Unlimited ${LIMIT_LABELS[key].toLowerCase()}` : `Up to ${formatLimit(value)} ${LIMIT_LABELS[key].toLowerCase()}`}
                    </li>
                  ))}
                  {plan.features.map((feature) => (
                    <li key={feature.code} className={`flex items-start gap-2 ${feature.included ? 'text-text-primary-light dark:text-text-primary-dark' : 'text-text-muted-light dark:text-text-muted-dark'}`}>
                      {feature.included
                        ? <Check size={16} className='mt-0.5 shrink-0 text-success' aria-hidden='true' />
                        : <Minus size={16} className='mt-0.5 shrink-0' aria-hidden='true' />}
                      <span><span className='sr-only'>{feature.included ? 'Included: ' : 'Not included: '}</span>{feature.label}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to={`/register-firm?plan=${plan.code}`}
                  className={`mt-8 inline-flex justify-center rounded-xl px-5 py-3 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${isFeatured ? 'bg-brand-accent text-[#1a1203] hover:bg-[#cf9d35]' : 'bg-brand-primary text-white hover:bg-[#0e2c47] dark:bg-sky-600 dark:hover:bg-sky-500'}`}
                >
                  Register with {plan.name}
                </Link>
              </article>
            );
          })}
        </div>

        {includedInEveryPlan.length > 0 && (
          <div className='mx-auto mt-10 max-w-4xl rounded-2xl border border-border-light bg-surface-light p-6 dark:border-border-dark dark:bg-surface-dark'>
            <h3 className='font-semibold text-text-primary-light dark:text-text-primary-dark'>Included in every plan</h3>
            <ul className='mt-4 grid gap-2 text-sm text-text-muted-light dark:text-text-muted-dark sm:grid-cols-2'>
              {includedInEveryPlan.map((line) => (
                <li key={line} className='flex items-start gap-2'>
                  <Check size={16} className='mt-0.5 shrink-0 text-success' aria-hidden='true' />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
