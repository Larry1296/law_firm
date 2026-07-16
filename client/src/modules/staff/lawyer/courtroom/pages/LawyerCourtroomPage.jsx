import { MonitorUp, RefreshCw } from 'lucide-react';

import Card from '@/components/ui/Card';
import { formatDateTime } from '@/core/utils/dateFormatter';
import CourtroomVideoPlayer from '@/modules/courtroom/components/CourtroomVideoPlayer';
import { useCourtroomSessions } from '@/modules/courtroom/hooks/useCourtroom';

export default function LawyerCourtroomPage() {
  const { data: sessions = [], isLoading, refetch } = useCourtroomSessions({ scope: 'today' });

  return (
    <div className='space-y-6 p-4 md:p-6'>
      <Card className='p-5'>
        <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <div className='flex items-center gap-3'>
            <MonitorUp size={22} className='text-blue-600' />
            <div>
              <h1 className='text-xl font-bold text-slate-900 dark:text-white'>
                Courtroom Monitor
              </h1>
              <p className='text-sm text-slate-500 dark:text-slate-300'>
                Follow today’s assigned courtrooms from one screen.
              </p>
            </div>
          </div>
          <button
            type='button'
            onClick={refetch}
            className='inline-flex w-fit items-center gap-2 rounded-xl border border-border-light px-3 py-2 text-sm font-semibold text-slate-700 dark:border-border-dark dark:text-slate-100'
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>
      </Card>

      {isLoading && (
        <p className='text-sm text-slate-500 dark:text-slate-300'>Loading courtroom sessions...</p>
      )}

      {!isLoading && sessions.length === 0 && (
        <Card className='p-5'>
          <p className='text-sm text-slate-500 dark:text-slate-300'>
            No assigned courtroom sessions are available today.
          </p>
        </Card>
      )}

      <div className='grid gap-5 xl:grid-cols-2'>
        {sessions.map((session) => (
          <Card key={session.id} className='p-4'>
            <CourtroomVideoPlayer
              url={session.join_url}
              title={`${session.event?.case?.case_number || 'Case'} - ${session.event?.title || 'Courtroom'}`}
              status={session.status}
              providerName={session.provider_name}
            />
            <div className='mt-3 space-y-1 text-sm text-slate-500 dark:text-slate-300'>
              <p className='font-semibold text-slate-800 dark:text-slate-100'>
                {session.event?.case?.title || 'Assigned matter'}
              </p>
              <p>{session.event?.starts_at ? formatDateTime(session.event.starts_at) : 'Time not set'}</p>
              <p>{session.event?.court_station || 'Court not set'} · {session.event?.courtroom || 'Room not set'}</p>
              <p>{session.attendance_count || 0} attendance logs · {session.recording_count || 0} recordings</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
