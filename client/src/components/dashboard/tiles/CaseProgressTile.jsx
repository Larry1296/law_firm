import { Scale, CheckCircle2 } from 'lucide-react';

export default function CaseProgressTile() {
  const progress = 72;

  return (
    <div className='relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 p-6 text-white shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl'>
      <div className='absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-3xl' />
      <div className='absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-black/10 blur-3xl' />

      <div className='relative z-10 flex h-full flex-col justify-between'>
        <div className='flex min-w-0 items-start justify-between gap-3 sm:gap-4'>
          <div className='min-w-0'>
            <p className='text-sm text-white/80'>Case Progress</p>

            <h2 className='mt-2 text-4xl font-bold'>{progress}%</h2>

            <p className='text-sm text-white/80'>Overall Completion</p>
          </div>

          <div className='rounded-2xl bg-white/15 p-3 backdrop-blur-sm'>
            <Scale size={24} />
          </div>
        </div>

        <div className='mt-6'>
          <div className='mb-3 flex justify-between text-sm'>
            <span>Milestones Achieved</span>
            <span>5 / 7</span>
          </div>

          <div className='h-3 overflow-hidden rounded-full bg-white/20'>
            <div
              className='h-full rounded-full bg-white'
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className='mt-5 flex items-center gap-2 text-sm'>
            <CheckCircle2 size={16} />
            <span>Evidence review completed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
