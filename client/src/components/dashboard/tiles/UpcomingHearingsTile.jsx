import { CalendarDays, Clock, MapPin, ArrowUpRight } from 'lucide-react';

export default function UpcomingHearingsTile() {
  const nextHearing = {
    title: 'Commercial Dispute Hearing',
    date: '24 Jun 2026',
    time: '09:30 AM',
    location: 'Milimani Law Courts',
  };

  return (
    <div className='relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 p-6 text-white shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl'>
      {/* Decorative blur */}
      <div className='absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-3xl' />
      <div className='absolute -left-12 -bottom-12 h-40 w-40 rounded-full bg-black/10 blur-3xl' />

      <div className='relative z-10 flex h-full flex-col justify-between'>
        <div className='flex min-w-0 items-start justify-between gap-3 sm:gap-4'>
          <div className='min-w-0'>
            <p className='text-sm font-medium text-white/80'>
              Upcoming Hearing
            </p>

            <h3 className='mt-2 text-lg font-bold sm:text-xl'>{nextHearing.title}</h3>
          </div>

          <div className='rounded-2xl bg-white/15 p-3 backdrop-blur-sm'>
            <CalendarDays size={24} />
          </div>
        </div>

        <div className='mt-6 space-y-3'>
          <div className='flex items-center gap-3 text-sm'>
            <Clock size={16} />
            <span>
              {nextHearing.date} • {nextHearing.time}
            </span>
          </div>

          <div className='flex items-center gap-3 text-sm'>
            <MapPin size={16} />
            <span>{nextHearing.location}</span>
          </div>
        </div>

        <div className='mt-6 flex items-center justify-between border-t border-white/20 pt-4'>
          <div className='min-w-0'>
            <p className='text-xs text-white/70'>Days Remaining</p>
            <p className='text-lg font-bold'>9 Days</p>
          </div>

          <button className='flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur-sm transition hover:bg-white/20'>
            View Details
            <ArrowUpRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
