import { BellRing, DoorOpen, Users } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button3D from '@/components/ui/Button3D';
import Swal from '@/core/utils/themedSwal';

export default function ClientQueueBoard({ data, pending = false, onAction }) {
  const queues = data.queues || [];
  return <section aria-label='Live client queues' className='space-y-4 text-[color:var(--text-primary)]'>
    <div className='flex flex-wrap items-center justify-between gap-3'>
      <h2 className='flex items-center gap-2 text-xl font-semibold'><Users size={21} aria-hidden='true' />Client queue</h2>
      <span role='status' className='rounded-full bg-[color:var(--form-primary-soft)] px-4 py-2 text-sm font-semibold'>
        {data.waiting_count ?? 0} waiting across {queues.length} {queues.length === 1 ? 'advocate' : 'advocates'}
      </span>
    </div>
    <p className='form-hint text-sm'>Updates every 3 seconds. Clients are called in arrival order; an admin may call a different client.</p>
    {!queues.length && <Card className='p-5'><p>No advocates are available in your queue coverage. Ask the admin to check active advocates and secretary assignments.</p></Card>}
    <div className='grid gap-4 lg:grid-cols-2 xl:grid-cols-3'>
      {queues.map((queue) => {
        const waiting = (data.visits || []).filter((visit) => visit.advocate === queue.advocate && visit.status === 'WAITING');
        const intakePending = queue.next?.intake_handler === 'RECEPTIONIST' && !queue.next?.intake_completed_at && data.has_receptionist;
        return <Card key={queue.advocate} className='flex flex-col gap-4 p-5'>
          <div className='flex items-start justify-between gap-3'>
            <div><h3 className='font-semibold'>{queue.advocate_name}</h3><p className='form-hint mt-1 flex items-center gap-1 text-sm'><DoorOpen size={15} aria-hidden='true' />{queue.office_location || 'Office not assigned'}</p></div>
            <span className='rounded-full border border-[color:var(--border)] px-3 py-1 text-sm' aria-label={`${queue.waiting_count} waiting for ${queue.advocate_name}`}>{queue.waiting_count} waiting</span>
          </div>
          <dl className='grid gap-3 text-sm'>
            <div><dt className='form-hint'>In consultation</dt><dd className='mt-1 font-medium'>{queue.current?.visitor_name || 'No client in the office'}</dd></div>
            <div><dt className='form-hint'>Next in arrival order</dt><dd className='mt-1 font-medium'>{queue.next?.visitor_name || 'No further clients waiting'}</dd></div>
          </dl>
          {waiting.length > 0 && <details className='rounded-lg border border-[color:var(--border)] p-3 text-sm'>
            <summary className='cursor-pointer font-medium'>View waiting clients ({waiting.length})</summary>
            <ol className='mt-3 space-y-3'>
              {waiting.map((visit, index) => <li key={visit.id} className='flex items-center justify-between gap-2'>
                <span>{index + 1}. {visit.visitor_name}</span>
                {data.role === 'ADMIN' && <Button3D size='sm' variant='outlineLight' disabled={pending || !!queue.current || !!queue.called} onClick={async () => {

                  onAction(visit.id, 'CALL');
                }}>Call client</Button3D>}
              </li>)}
            </ol>
          </details>}
          {queue.called && <div role='status' className='space-y-2 rounded-xl border border-emerald-600/30 bg-emerald-500/10 p-4'>
            <p className='flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300'><BellRing size={17} aria-hidden='true' />Ready to usher in</p>
            <p className='font-semibold'>{queue.called.visitor_name}</p>
            <p className='text-sm'>To {queue.advocate_name} · {queue.office_location}</p>
            {queue.called.can_usher && <Button3D size='sm' disabled={pending} onClick={() => onAction(queue.called.id, 'USHER')}>Client ushered in</Button3D>}
            {queue.can_call && <Button3D variant='outlineLight' size='sm' disabled={pending} onClick={() => onAction(queue.called.id, 'START')}>Client is in office</Button3D>}
          </div>}
          {queue.can_call && <div className='mt-auto space-y-2 border-t border-[color:var(--border)] pt-4'>
            {queue.current ? <>
              <Button3D className='w-full' disabled={pending || !queue.current.intake_completed_at} onClick={() => onAction(queue.current.id, 'COMPLETE')}>Complete consultation</Button3D>
              {!queue.current.intake_completed_at && <p className='form-hint text-xs'>Record intake in Client arrivals before completing this consultation.</p>}
            </> : !queue.called && <>
              <Button3D className='w-full gap-2' disabled={pending || !queue.next || !queue.office_location || intakePending} onClick={() => onAction(queue.next.id, 'CALL')}><BellRing size={17} aria-hidden='true' />Ready for next client</Button3D>
              {!queue.office_location && <p className='form-hint text-xs'>The admin must assign an office before a client can be called.</p>}
              {intakePending && <p className='form-hint text-xs'>Reception must finish this client’s preliminary intake first.</p>}
            </>}
          </div>}
        </Card>;
      })}
    </div>
  </section>;
}
