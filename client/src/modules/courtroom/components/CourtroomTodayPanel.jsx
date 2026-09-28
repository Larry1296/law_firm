import { ExternalLink, Video } from 'lucide-react';

import DashboardTile from '@/components/dashboard/DashboardTile';
import { formatDateTime } from '@/core/utils/dateFormatter';
import { useCourtroomSessions } from '@/modules/courtroom/hooks/useCourtroom';
import useCourtroomLaunch from '@/modules/courtroom/hooks/useCourtroomLaunch';

function JoinButton({ session }) {
  const { launch, busy, error, fallbackUrl } = useCourtroomLaunch(session.id);
  const opensAt = session.client_access_from
    ? new Date(session.client_access_from).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  if (session.can_join === false) {
    return (
      <span className='w-fit rounded-xl border border-amber-200/25 bg-amber-400/20 px-4 py-2 text-sm font-semibold text-amber-100'>
        Join opens at {opensAt}
      </span>
    );
  }

  return (
    <div className='flex flex-col gap-2'>
      <button
        type='button'
        onClick={launch}
        disabled={busy}
        className='inline-flex w-fit items-center gap-2 rounded-xl border border-white/25 bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/25 disabled:opacity-50'
      >
        <ExternalLink size={15} />
        {busy ? 'Preparing…' : 'Join Virtual Court'}
      </button>
      {fallbackUrl && (
        <a href={fallbackUrl} target='_blank' rel='noopener noreferrer' className='text-sm font-semibold text-white underline'>
          Tab blocked. Open the courtroom
        </a>
      )}
      {error && <p role='alert' className='text-sm text-red-200'>{error}</p>}
    </div>
  );
}

export default function CourtroomTodayPanel({
  title = "Today's Virtual Courtrooms",
  emptyMessage = 'No virtual courtroom links are available today.',
  className = 'mt-0',
}) {
  const { data: sessions = [], isLoading, refetch } = useCourtroomSessions({ scope: 'today' });

  return (
    <section className={className}>
      <DashboardTile
        size='full'
        variant='courtroom'
        rounded='xl'
        shadow
        className='min-h-[260px] p-5 sm:p-6'
      >
        <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
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
            className='min-h-11 w-full rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 sm:w-auto'
          >
            Refresh
          </button>
        </div>

        {isLoading && (
          <p className='rounded-xl bg-black/25 p-4 text-sm text-white/75 backdrop-blur-md'>Loading courtroom links...</p>
        )}

        {!isLoading && sessions.length === 0 && (
          <p className='rounded-xl border border-white/15 bg-black/25 p-4 text-sm text-white/75 backdrop-blur-md'>
            {emptyMessage}
          </p>
        )}

        <div className='space-y-3'>
          {sessions.map((session) => {
            const summary = session.event_summary || {};
            return (
              <div
                key={session.id}
                className='rounded-2xl border border-white/20 bg-black/30 p-4 shadow-lg backdrop-blur-md'
              >
                <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
                  <div className='min-w-0'>
                    <p className='font-semibold text-white'>
                      {summary.internal_matter_number} - {summary.appearance_type}
                    </p>
                    <p className='mt-1 text-sm text-white/75'>
                      {formatDateTime(summary.starts_at)} · {summary.court_station || summary.court || 'Court not set'} · {summary.courtroom || 'Room not set'}
                    </p>
                    <p className='mt-1 text-xs text-white/55'>
                      {session.client_attendance_requirement === 'REQUIRED' ? 'Your attendance is required' : 'You may follow the proceedings'}
                    </p>
                  </div>
                  <JoinButton session={session} />
                </div>
              </div>
            );
          })}
        </div>
      </DashboardTile>
    </section>
  );
}
