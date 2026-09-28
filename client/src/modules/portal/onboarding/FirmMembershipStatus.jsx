import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Circle, CircleDot } from 'lucide-react';

import axiosInstance from '@/core/api/axios';
import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import { getApiErrorMessage } from '@/core/utils/errorMessages';

const STATE = {
  completed: { Icon: CheckCircle2, className: 'text-green-700 dark:text-green-400', label: 'Done' },
  current: { Icon: CircleDot, className: 'text-blue-700 dark:text-blue-300', label: 'In progress' },
  upcoming: { Icon: Circle, className: 'text-gray-400 dark:text-gray-500', label: 'Not started' },
};

export default function FirmMembershipStatus() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['client-onboarding-status'],
    queryFn: async () => (await axiosInstance.get('/client/onboarding-status/')).data,
  });

  return (
    <div className='space-y-6 p-4 md:p-6'>
      <SectionHeading
        title='My instructions'
        subtitle='Before an advocate can act, the firm must clear a conflict-of-interest check, accept your instructions, verify your identity and agree an engagement letter with you.'
        hero={false}
        align='left'
        size='compact'
      />

      {isLoading && <Card className='p-6'>Loading your progress…</Card>}
      {error && <Card className='p-6 text-red-700 dark:text-red-300'>{getApiErrorMessage(error, 'Could not load your progress.')}</Card>}
      {!isLoading && !error && data.instructions.length === 0 && (
        <Card className='p-6'>No instructions are recorded yet. The firm records your instructions after your first meeting with an advocate.</Card>
      )}

      {data?.instructions.map((item) => (
        <Card key={item.reference} className='p-6'>
          <div className='flex flex-wrap items-start justify-between gap-2'>
            <div>
              <h2 className='text-lg font-semibold'>{item.title}</h2>
              <p className='text-sm text-[color:var(--text-muted)]'>Reference {item.reference} · received {new Date(item.received_on).toLocaleDateString('en-KE')}</p>
            </div>
            {item.matter && <span className='rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800 dark:bg-green-500/20 dark:text-green-200'>Matter {item.matter.case_number} open</span>}
          </div>
          {item.outcome && <p role='status' className='mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/60 dark:text-amber-100'>{item.outcome}</p>}
          <ol className='mt-5 space-y-3'>
            {item.steps.map((step) => {
              const { Icon, className, label } = STATE[step.state];
              return (
                <li key={step.label} className='flex items-center gap-3'>
                  <Icon size={20} className={className} aria-hidden='true' />
                  <span className={step.state === 'upcoming' ? 'text-[color:var(--text-muted)]' : 'font-medium'}>{step.label}</span>
                  <span className='sr-only'>— {label}</span>
                </li>
              );
            })}
          </ol>
          <p className='mt-4 text-sm text-[color:var(--text-muted)]'>Engagement letter: {item.engagement_status}</p>
        </Card>
      ))}

      {data?.firm && (
        <Card className='p-6 text-sm'>
          <h2 className='font-semibold'>Questions?</h2>
          <p className='mt-1'>Contact {data.firm.name}{data.firm.phone_number && ` on ${data.firm.phone_number}`}{data.firm.email && ` or ${data.firm.email}`}. Once your matter is opened you can follow it from your <Link className='font-semibold text-blue-700 hover:underline dark:text-blue-300' to='/portal/dashboard'>dashboard</Link>.</p>
        </Card>
      )}
    </div>
  );
}
