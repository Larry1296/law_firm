import { ExternalLink, Video } from 'lucide-react';

import Card from '@/components/ui/Card';
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
      <Card className='p-5'>
        <div className='mb-4 flex items-center justify-between gap-3'>
          <div className='flex items-center gap-3'>
            <div className='rounded-2xl bg-blue-600/10 p-3 text-blue-700 dark:text-blue-200'>
              <Video size={20} />
            </div>
            <div>
              <h2 className='text-lg font-bold text-slate-900 dark:text-white'>
                {title}
              </h2>
              <p className='text-sm text-slate-500 dark:text-slate-300'>
                Open active court links for your scheduled appearances.
              </p>
            </div>
          </div>
          <button
            type='button'
            onClick={refetch}
            className='rounded-xl border border-border-light px-3 py-2 text-sm font-semibold text-slate-700 dark:border-border-dark dark:text-slate-100'
          >
            Refresh
          </button>
        </div>

        {isLoading && (
          <p className='text-sm text-slate-500 dark:text-slate-300'>Loading courtroom links...</p>
        )}

        {!isLoading && events.length === 0 && (
          <p className='rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-300'>
            {emptyMessage}
          </p>
        )}

        <div className='space-y-3'>
          {events.map((event) => (
            <div
              key={event.id}
              className='rounded-2xl border border-border-light p-4 dark:border-border-dark'
            >
              <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
                <div className='min-w-0'>
                  <p className='font-semibold text-slate-900 dark:text-white'>
                    {event.case?.case_number} - {event.title}
                  </p>
                  <p className='mt-1 text-sm text-slate-500 dark:text-slate-300'>
                    {formatDateTime(event.starts_at)} · {event.court_station || 'Court not set'} · {event.courtroom || 'Room not set'}
                  </p>
                  <p className='mt-1 text-xs text-slate-400'>
                    {event.virtual_courtroom_label || 'Virtual courtroom'}
                  </p>
                </div>

                {event.virtual_courtroom_url && event.virtual_courtroom_is_available ? (
                  <a
                    href={event.virtual_courtroom_url}
                    target='_blank'
                    rel='noreferrer'
                    className='inline-flex w-fit items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white'
                  >
                    <ExternalLink size={15} />
                    Open Courtroom
                  </a>
                ) : (
                  <span className='w-fit rounded-xl bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-200'>
                    Link not active yet
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
