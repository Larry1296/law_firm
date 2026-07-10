import { useMemo } from 'react';

import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import { useStaffItems } from '@/modules/staff/common/hooks/useStaffWorkspace';

export default function StaffWorkspacePage({
  config,
  endpoint,
  responseKey,
  title,
  description,
  icon: Icon,
}) {
  const { data, isLoading, isError } = useStaffItems(config, endpoint);
  const items = useMemo(() => data?.[responseKey] || [], [data, responseKey]);

  return (
    <div className='p-4 sm:p-6 lg:p-8 space-y-6'>
      <SectionHeading
        title={title}
        subtitle={description}
        icon={Icon}
      />

      {isLoading && (
        <Card className='p-6'>
          <p className='text-sm text-[color:var(--text-muted)]'>Loading workspace...</p>
        </Card>
      )}

      {isError && (
        <Card className='p-6'>
          <p className='text-sm text-red-600 dark:text-red-300'>
            Could not load this workspace.
          </p>
        </Card>
      )}

      {!isLoading && !isError && (
        <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
          {items.map((item) => (
            <Card key={item.id} className='p-5'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <p className='text-xs uppercase tracking-widest text-[color:var(--text-muted)]'>
                    {item.status || 'Ready'}
                  </p>
                  <h3 className='mt-2 font-semibold text-lg'>{item.title}</h3>
                </div>

                {Icon && (
                  <div className='rounded-lg bg-[color:var(--surface-muted)] p-3 text-[color:var(--brand-primary)] dark:text-blue-300'>
                    <Icon size={20} />
                  </div>
                )}
              </div>
            </Card>
          ))}

          {!items.length && (
            <Card className='p-6 md:col-span-2 xl:col-span-3'>
              <p className='text-sm text-[color:var(--text-muted)]'>
                No records are available in this workspace yet.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
