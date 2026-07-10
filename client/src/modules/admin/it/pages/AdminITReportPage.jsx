import { useQuery } from '@tanstack/react-query';

import SectionHeading from '@/components/ui/SectionHeading';
import Card from '@/components/ui/Card';
import SystemHealthReport from '@/components/it/SystemHealthReport';
import adminFirmService from '@/modules/admin/firm/services/adminFirmService';

export default function AdminITReportPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-it-report'],
    queryFn: adminFirmService.getITReport,
  });

  return (
    <div className='space-y-6 p-4 md:p-6'>
      <SectionHeading
        title='IT Report'
        subtitle='Twice-monthly IT department report, system health, and repair needs.'
        size='hero'
        as='h1'
      />

      {isLoading && (
        <Card className='p-6'>
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            Loading IT report...
          </p>
        </Card>
      )}

      {isError && (
        <Card className='p-6'>
          <p className='text-sm text-red-600 dark:text-red-300'>
            Could not load IT report.
          </p>
        </Card>
      )}

      {data && (
        <>
          <Card className='p-5'>
            <p className='text-sm text-gray-600 dark:text-gray-300'>
              {data.ownership?.message}
            </p>
            <p className='mt-2 text-xs uppercase tracking-widest text-gray-400'>
              Report frequency: {data.reporting?.frequency}
            </p>
          </Card>

          <SystemHealthReport report={data} />
        </>
      )}
    </div>
  );
}
