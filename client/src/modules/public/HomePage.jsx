import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import FloatingAIChat from '@/components/ai/FloatingAIChat';
import { formatKes } from '@/modules/admin/subscription/utils/subscriptionFormatting';
import FeaturesSection from '@/modules/public/sections/FeaturesSection';
import HeroSection from '@/modules/public/sections/HeroSection';
import HowItWorksSection from '@/modules/public/sections/HowItWorksSection';
import LegalAssistantSection from '@/modules/public/sections/LegalAssistantSection';
import PricingSection from '@/modules/public/sections/PricingSection';
import subscriptionService from '@/modules/subscription/services/subscriptionService';

export default function HomePage() {
  const plansQuery = useQuery({ queryKey: ['subscription', 'plans'], queryFn: subscriptionService.getPlans, retry: 1 });
  const plans = plansQuery.data?.plans || [];
  const cheapest = plans.reduce((low, plan) => (low === null || Number(plan.monthly_price) < low ? Number(plan.monthly_price) : low), null);

  return (
    <div className='public-home overflow-x-hidden bg-background-light text-text-primary-light dark:bg-background-dark dark:text-text-primary-dark'>
      <FloatingAIChat mode='platform' />

      <section id='home'>
        <HeroSection startingPrice={cheapest !== null ? formatKes(cheapest) : null} />
      </section>
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection plans={plans} includedInEveryPlan={plansQuery.data?.included_in_every_plan || []} loading={plansQuery.isLoading} />
      <LegalAssistantSection />

      <section className='bg-surface-light py-16 dark:bg-surface-dark'>
        <div className='mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 text-center sm:px-6'>
          <h2 className='text-2xl font-bold sm:text-3xl'>Ready to bring your firm onto Sheria Master?</h2>
          <p className='max-w-2xl text-text-muted-light dark:text-text-muted-dark'>
            Register your firm and we will set up its workspace. Already registered? Sign in and you will go straight to your firm.
          </p>
          <div className='flex flex-wrap justify-center gap-3'>
            <Link to='/register-firm' className='rounded-xl bg-brand-primary px-6 py-3 font-bold text-white hover:bg-[#0e2c47] dark:bg-sky-600 dark:hover:bg-sky-500'>Register your firm</Link>
            <Link to='/login' className='rounded-xl border border-border-light px-6 py-3 font-semibold hover:bg-background-light dark:border-border-dark dark:hover:bg-background-dark'>Sign in</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
