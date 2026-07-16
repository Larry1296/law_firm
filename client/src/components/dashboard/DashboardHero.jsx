import { ShieldCheck } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';

const DashboardHero = ({
  badge = 'Dashboard',
  title,
  description,
  statusTitle,
  statusDescription,
  icon: Icon = ShieldCheck,
}) => {
  const IconComponent = Icon || ShieldCheck;

  return (
    <section className='w-full min-w-0 rounded-none bg-gradient-to-r from-brand-primary to-blue-700 px-4 py-5 text-white shadow-medium sm:px-6 sm:py-6 lg:px-8 lg:py-8'>
      <div className='flex min-w-0 flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-6'>
        <div className='min-w-0'>
          <p className='text-sm uppercase tracking-widest text-blue-100 mb-2'>
            {badge}
          </p>

          <SectionHeading
            title={title}
            subtitle={description}
            size='hero'
            variant='dark'
            as='h1'
            className='max-w-2xl min-w-0 [&_p]:text-blue-100'
          />
        </div>

        <div className='w-full min-w-0 rounded-none border border-white/10 bg-white/10 p-4 backdrop-blur-md sm:p-5 lg:w-auto lg:min-w-[260px]'>
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
