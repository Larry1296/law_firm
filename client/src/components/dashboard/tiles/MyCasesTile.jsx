import { Briefcase, ArrowUpRight } from 'lucide-react';

export default function MyCasesTile() {
  const activeCases = 12;
  const ongoingCases = 8;
  const completedCases = 4;

  return (
    <div className='relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 p-6 text-white shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl'>
      {/* Decorative Blur */}
      <div className='absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-3xl' />
      <div className='absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-black/10 blur-3xl' />

      <div className='relative z-10 flex h-full flex-col justify-between'>
        <div className='flex min-w-0 items-start justify-between gap-3 sm:gap-4'>
          <div className='min-w-0'>
            <p className='text-sm font-medium text-white/80'>My Cases</p>

            <h2 className='mt-2 text-4xl font-bold'>{activeCases}</h2>

            <p className='mt-1 text-sm text-white/80'>Active Legal Matters</p>
          </div>

          <div className='rounded-2xl bg-white/15 p-3 backdrop-blur-sm'>
            <Briefcase size={24} />
          </div>
        </div>

        <div className='mt-6'>
          <div className='mb-3 flex justify-between text-sm'>
            <span>Ongoing</span>
            <span>{ongoingCases}</span>
          </div>

          <div className='mb-4 h-2 overflow-hidden rounded-full bg-white/20'>
            <div
              className='h-full rounded-full bg-white'
              style={{ width: '67%' }}
            />
          </div>

          <div className='flex items-center justify-between'>
            <div>
              <p className='text-xs text-white/70'>Completed Cases</p>
              <p className='font-semibold'>{completedCases}</p>
            </div>

            <button className='flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur-sm transition hover:bg-white/20'>
              View Cases
              <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
