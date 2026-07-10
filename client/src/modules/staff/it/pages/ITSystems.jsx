import { MonitorCog } from 'lucide-react';

import SectionHeading from '@/components/ui/SectionHeading';
import Card from '@/components/ui/Card';
import SystemHealthReport from '@/components/it/SystemHealthReport';
import { useStaffItems } from '@/modules/staff/common/hooks/useStaffWorkspace';
import { staffRoleConfigs } from '@/modules/staff/common/config/staffRoleConfigs';

export default function ITSystems() {
  const { data, isLoading, isError } = useStaffItems(
    staffRoleConfigs.it,
    'systems',
  );
  const report = data?.report;

  return (
    <div className='space-y-6 p-4 sm:p-6 lg:p-8'>
      <SectionHeading
        title='System Health'
        subtitle='Monitor all dashboards, identify problems, and guide repair work.'
        size='hero'
        as='h1'
      />

      {isLoading && (
        <Card className='p-6'>
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            Loading system health...
          </p>
        </Card>
      )}

      {isError && (
        <Card className='p-6'>
          <p className='text-sm text-red-600 dark:text-red-300'>
            Could not load system health.
          </p>
        </Card>
      )}

      {report && (
        <>
          <Card className='p-5'>
            <div className='flex items-start gap-3'>
              <div className='rounded-lg bg-cyan-500/10 p-3 text-cyan-600 dark:text-cyan-200'>
                <MonitorCog size={22} />
              </div>
              <div>
                <h3 className='font-semibold text-gray-900 dark:text-white'>
                  IT Department Responsibility
                </h3>
                <p className='mt-1 text-sm text-gray-600 dark:text-gray-300'>
                  {report.ownership?.message}
                </p>
              </div>
            </div>
          </Card>

          <SystemHealthReport report={report} />
        </>
      )}
    </div>
  );
}
