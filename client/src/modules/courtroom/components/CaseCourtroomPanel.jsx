import { Radio } from 'lucide-react';

import Card from '@/components/ui/Card';
import { formatDateTime } from '@/core/utils/dateFormatter';
import { useCourtroomSessions } from '@/modules/courtroom/hooks/useCourtroom';
import CourtroomLauncher from '@/modules/courtroom/components/CourtroomLauncher';

export default function CaseCourtroomPanel({
  caseId,
  title = 'Courtroom',
  emptyMessage = 'No courtroom session has been attached to this case yet.',
}) {
  const { data: sessions = [], isLoading, refetch } = useCourtroomSessions({ case_id: caseId });

  return (
    <Card className='p-5'>
      <div className='mb-4 flex items-center justify-between gap-3'>
        <div className='flex items-center gap-3'>
          <Radio size={20} className='text-emerald-500' />
          <div>
            <h2 className='text-lg font-bold text-slate-900 dark:text-white'>{title}</h2>
            <p className='text-sm text-slate-500 dark:text-slate-300'>
              Prepare for and securely join your interactive court appearance.
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
        <p className='text-sm text-slate-500 dark:text-slate-300'>Loading courtroom session...</p>
      )}

      {!isLoading && sessions.length === 0 && (
        <p className='rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-300'>
          {emptyMessage}
        </p>
      )}

      <div className='space-y-4'>
        {sessions.map((session) => (
          <div key={session.id} className='space-y-3'>
            <CourtroomLauncher session={session} client />
            <div className='grid gap-2 text-sm text-slate-500 dark:text-slate-300 md:grid-cols-3'>
              <p><strong className='text-slate-700 dark:text-slate-100'>When:</strong> {session.event_summary?.starts_at ? formatDateTime(session.event_summary.starts_at) : 'Not set'}</p>
              <p><strong className='text-slate-700 dark:text-slate-100'>Court:</strong> {session.event_summary?.court_station || 'Not set'}</p>
              <p><strong className='text-slate-700 dark:text-slate-100'>Room:</strong> {session.event_summary?.courtroom || 'Not set'}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
