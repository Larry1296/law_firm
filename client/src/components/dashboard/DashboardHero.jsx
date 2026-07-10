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
    <section className='rounded-none bg-gradient-to-r from-brand-primary to-blue-700 text-white px-6 py-6 shadow-medium lg:px-8 lg:py-8'>
      <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6'>
        <div>
          <p className='text-sm uppercase tracking-widest text-blue-100 mb-2'>
            {badge}
          </p>

          <SectionHeading
            title={title}
            subtitle={description}
            size='hero'
            variant='dark'
            as='h1'
            className='max-w-2xl [&_p]:text-blue-100'
          />
        </div>

        <div className='bg-white/10 backdrop-blur-md rounded-none p-5 min-w-[260px] border border-white/10'>
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
