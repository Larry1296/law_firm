import { Link } from 'react-router-dom';
import useAuth from '@/core/hooks/useAuth';
import ClientQueueBoard from './ClientQueueBoard';
import { useClientQueue, useQueueAction } from './useClientQueue';

export default function ClientQueueDashboard({ path }) {
  const { user } = useAuth();
  // This component is mounted only on advocate, admin and intake dashboards.
  return user ? <QueueContent path={path} /> : null;
}

function QueueContent({ path }) {
  const { data, isPending, isError } = useClientQueue();
  const action = useQueueAction();
  return <div className='my-6 space-y-3 px-4 md:px-6'>
    {isPending ? <p className='form-hint'>Loading client queue…</p> : <>
      {isError && <p role='alert' className='form-alert'>Queue updates are unavailable. Refresh before calling a client.</p>}
      {data && <ClientQueueBoard data={data} pending={action.isPending || isError} onAction={(id, value) => action.mutate({ id, action: value })} />}
      <Link className='btn btn-secondary' to={path}>{data && !data.can_receive ? 'Open my consultations' : 'Open client arrivals & intake'}</Link>
    </>}
  </div>;
}
