import { ExternalLink, Video } from 'lucide-react';

import DashboardTile from '@/components/dashboard/DashboardTile';
import { formatDateTime } from '@/core/utils/dateFormatter';
import { useTodayCourtroomEvents } from '@/modules/courtroom/hooks/useCourtroom';

export default function CourtroomTodayPanel({
  title = "Today's Virtual Courtrooms",
  emptyMessage = 'No virtual courtroom links are available today.',
}) {
  const { data, isLoading, refetch } = useTodayCourtroomEvents();
  const events = data?.events || [];

  return (
    <section className='mt-6'>
      <DashboardTile
        size='full'
        variant='courtroom'
        rounded='xl'
        shadow
        className='min-h-[260px] p-5 sm:p-6'
      >
        <div className='mb-4 flex items-center justify-between gap-3'>
          <div className='flex items-center gap-3'>
            <div className='rounded-2xl border border-white/20 bg-white/15 p-3 text-white backdrop-blur-sm'>
              <Video size={20} />
            </div>
            <div>
              <h2 className='text-lg font-bold text-white'>
                {title}
              </h2>
              <p className='text-sm text-white/75'>
                Open active court links for your scheduled appearances.
              </p>
            </div>
          </div>
          <button
            type='button'
            onClick={refetch}
            className='rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20'
          >
            Refresh
          </button>
        </div>

        {isLoading && (
          <p className='rounded-xl bg-black/25 p-4 text-sm text-white/75 backdrop-blur-md'>Loading courtroom links...</p>
        )}

        {!isLoading && events.length === 0 && (
          <p className='rounded-xl border border-white/15 bg-black/25 p-4 text-sm text-white/75 backdrop-blur-md'>
            {emptyMessage}
          </p>
        )}

        <div className='space-y-3'>
          {events.map((event) => (
            <div
              key={event.id}
              className='rounded-2xl border border-white/20 bg-black/30 p-4 shadow-lg backdrop-blur-md'
            >
              <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
                <div className='min-w-0'>
                  <p className='font-semibold text-white'>
                    {event.case?.case_number} - {event.title}
                  </p>
                  <p className='mt-1 text-sm text-white/75'>
                    {formatDateTime(event.starts_at)} · {event.court_station || 'Court not set'} · {event.courtroom || 'Room not set'}
                  </p>
                  <p className='mt-1 text-xs text-white/55'>
                    {event.virtual_courtroom_label || 'Virtual courtroom'}
                  </p>
                </div>

                {event.virtual_courtroom_url && event.virtual_courtroom_is_available ? (
                  <a
                    href={event.virtual_courtroom_url}
                    target='_blank'
                    rel='noreferrer'
                    className='inline-flex w-fit items-center gap-2 rounded-xl border border-white/25 bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/25'
                  >
                    <ExternalLink size={15} />
                    Open Courtroom
                  </a>
                ) : (
                  <span className='w-fit rounded-xl border border-amber-200/25 bg-amber-400/20 px-4 py-2 text-sm font-semibold text-amber-100'>
                    Link not active yet
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </DashboardTile>
    </section>
  );
}
