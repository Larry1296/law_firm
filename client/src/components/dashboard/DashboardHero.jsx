import { ShieldCheck } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';

const DashboardHero = ({
  badge = 'Dashboard',
  title,
  description,
  statusTitle,
  statusDescription,
  icon: Icon = ShieldCheck,
  compactMobile = false,
}) => {
  const IconComponent = Icon || ShieldCheck;

  return (
    <section className={`shell-surface dashboard-hero relative m-0 w-full min-w-0 overflow-hidden rounded-none border border-white/20 text-white shadow-[0_14px_34px_rgba(0,0,0,0.28)] ring-1 ring-inset ring-white/10 sm:px-7 sm:py-9 lg:px-10 lg:py-11 ${compactMobile ? 'px-4 py-5' : 'px-5 py-7'}`}>
      <div className='pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl' />
      <div className='relative flex min-w-0 flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8'>
        <div className='min-w-0'>
          <p className='mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-100 sm:text-sm'>
            {badge}
          </p>

          <SectionHeading
            title={`${title} 👋`}
            subtitle={description}
            size='dashboard'
            variant='dark'
            as='h1'
            hero={false}
            className='max-w-2xl min-w-0 [&_h1]:font-extrabold [&_p]:text-blue-100'
          />
        </div>

        {compactMobile && (
          <details className='group w-full rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-xl sm:hidden'>
            <summary className='flex min-h-11 cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden'>
              <IconComponent className='shrink-0 text-brand-accent' size={23} />
              <span className='min-w-0 flex-1'>
                <span className='block text-xs text-blue-100'>Account status</span>
                <span className='block truncate text-sm font-bold'>{statusTitle}</span>
              </span>
              <span className='text-xs font-bold text-blue-100 group-open:hidden'>View</span>
              <span className='hidden text-xs font-bold text-blue-100 group-open:inline'>Hide</span>
            </summary>
            <p className='mt-3 border-t border-white/15 pt-3 text-sm leading-6 text-blue-100'>
              {statusDescription}
            </p>
          </details>
        )}

        <div className={`w-full min-w-0 rounded-2xl border border-white/20 bg-white/10 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-6 lg:w-auto lg:min-w-[290px] ${compactMobile ? 'hidden sm:block' : ''}`}>
          <div className='flex items-center gap-3 mb-4'>
            <IconComponent className='text-brand-accent' size={28} />

            <div>
              <p className='text-sm text-blue-100'>Status</p>

              <h3 className='font-semibold text-lg'>{statusTitle}</h3>
            </div>
          </div>

          <p className='text-sm text-blue-100'>{statusDescription}</p>
        </div>
      </div>
    </section>
  );
};

export default DashboardHero;
