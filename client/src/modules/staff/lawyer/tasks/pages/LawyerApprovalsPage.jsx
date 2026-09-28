import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import { getApiErrorMessage } from '@/core/utils/errorMessages';
import lawyerTasksService from '@/modules/staff/lawyer/tasks/services/lawyerTasksService';

const KIND_LABELS = {
  CONFLICT_CHECK: 'Conflict check',
  INSTRUCTIONS: 'Instructions',
  CLIENT_DOCUMENT: 'Client document',
  MATTER_CLOSURE: 'Matter closure',
};

export default function LawyerApprovalsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['lawyer-approvals'],
    queryFn: lawyerTasksService.getApprovals,
  });
  const approvals = data?.approvals || [];

  return (
    <div className='space-y-6 p-4 md:p-6'>
      <SectionHeading
        title='Approvals'
        subtitle='Decisions waiting on you: conflict checks, accepting instructions, client documents and matter closures.'
        hero={false}
        align='left'
        size='compact'
      />
      <Card className='p-4 sm:p-6'>
        {isLoading && <p>Loading approvals…</p>}
        {error && <p className='text-red-700 dark:text-red-300'>{getApiErrorMessage(error, 'Failed to load approvals.')}</p>}
        {!isLoading && !error && approvals.length === 0 && (
          <p className='text-[color:var(--text-muted)]'>Nothing is waiting for your decision.</p>
        )}
        <ul className='divide-y divide-border-light dark:divide-border-dark'>
          {approvals.map((item) => (
            <li key={item.id} className='flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between'>
              <div className='min-w-0'>
                <span className='rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:bg-white/10 dark:text-gray-200'>
                  {KIND_LABELS[item.kind] || item.kind}
                </span>
                <p className='mt-1 font-semibold'>{item.title}</p>
                <p className='text-sm text-[color:var(--text-muted)]'>{item.subtitle}</p>
              </div>
              <Link
                to={item.link}
                className='inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white dark:bg-blue-500'
              >
                Review
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
