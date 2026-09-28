import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import { getApiErrorMessage } from '@/core/utils/errorMessages';

const priorityClass = {
  URGENT: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200',
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200',
  HIGH: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
};

function formatDue(value) {
  return new Date(value).toLocaleString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function MyWorkList({ queryKey, queryFn, caseBasePath, subtitle }) {
  const { data, isLoading, error } = useQuery({ queryKey, queryFn });
  const items = data?.tasks || [];
  const overdue = items.filter((item) => item.overdue).length;

  return (
    <div className='space-y-6 p-4 md:p-6'>
      <SectionHeading title='Tasks and deadlines' subtitle={subtitle} hero={false} align='left' size='compact' />

      {!isLoading && !error && (
        <div className='grid gap-3 sm:grid-cols-3'>
          {[['Open items', items.length], ['Overdue', overdue], ['Court and filing deadlines', items.filter((item) => item.kind === 'DEADLINE').length]].map(([label, value]) => (
            <Card key={label} className='p-4'>
              <p className='text-sm text-[color:var(--text-muted)]'>{label}</p>
              <p className={`text-2xl font-bold ${label === 'Overdue' && value ? 'text-red-700 dark:text-red-300' : ''}`}>{value}</p>
            </Card>
          ))}
        </div>
      )}

      <Card className='p-4 sm:p-6'>
        {isLoading && <p>Loading your work…</p>}
        {error && <p className='text-red-700 dark:text-red-300'>{getApiErrorMessage(error, 'Failed to load tasks.')}</p>}
        {!isLoading && !error && items.length === 0 && (
          <p className='text-[color:var(--text-muted)]'>Nothing is assigned to you right now.</p>
        )}
        <ul className='divide-y divide-border-light dark:divide-border-dark'>
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`} className='flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between'>
              <div className='min-w-0'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:bg-white/10 dark:text-gray-200'>
                    {item.kind === 'DEADLINE' ? 'Deadline' : 'Task'}
                  </span>
                  {priorityClass[item.priority] && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${priorityClass[item.priority]}`}>{item.priority.toLowerCase()}</span>
                  )}
                  <strong>{item.title}</strong>
                </div>
                {item.description && <p className='mt-1 text-sm text-[color:var(--text-muted)]'>{item.description}</p>}
                <Link to={`${caseBasePath}/${item.case_id}`} className='mt-1 inline-block text-sm font-medium text-blue-700 hover:underline dark:text-blue-300'>
                  {item.case_number} · {item.client_name}
                </Link>
              </div>
              <p className={`shrink-0 text-sm font-medium ${item.overdue ? 'text-red-700 dark:text-red-300' : 'text-[color:var(--text-muted)]'}`}>
                {item.due_at ? `${item.overdue ? 'Overdue · ' : 'Due '}${formatDue(item.due_at)}` : 'No due date'}
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
