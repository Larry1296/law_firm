import Card from '@/components/ui/Card';
import StatsCard from '@/components/ui/StatsCard';

const statusStyles = {
  HEALTHY: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200',
  WATCH: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200',
  NEEDS_REPAIR: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-200',
};

export default function SystemHealthReport({ report, showTasks = true }) {
  const dashboards = report?.dashboards || [];
  const issues = report?.issues || [];
  const tasks = report?.tasks || [];

  return (
    <div className='space-y-6'>
      <div className='grid gap-4 md:grid-cols-3'>
        <StatsCard
          title='Overall Health'
          value={`${report?.overall_health_percentage ?? 0}%`}
        />
        <StatsCard title='System Status' value={report?.status || 'UNKNOWN'} />
        <StatsCard
          title='IT Ownership'
          value={
            report?.ownership?.source === 'it_department'
              ? 'IT Department'
              : 'Admin Fallback'
          }
        />
      </div>

      <Card className='p-5'>
        <div className='mb-4'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
            Dashboard Health
          </h3>
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            Live health is recalculated from the current system state.
          </p>
        </div>

        <div className='grid gap-4 lg:grid-cols-2'>
          {dashboards.map((dashboard) => (
            <div
              key={dashboard.name}
              className='rounded-lg border border-border-light p-4 dark:border-border-dark'
            >
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <h4 className='font-semibold text-gray-900 dark:text-white'>
                    {dashboard.name}
                  </h4>
                  <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                    {dashboard.checks_passed}/{dashboard.checks_total} checks passing
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    statusStyles[dashboard.status] || statusStyles.WATCH
                  }`}
                >
                  {dashboard.status}
                </span>
              </div>

              <div className='mt-4 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700'>
                <div
                  className='h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600'
                  style={{ width: `${dashboard.health_percentage}%` }}
                />
              </div>
              <p className='mt-2 text-sm font-semibold text-gray-700 dark:text-gray-200'>
                {dashboard.health_percentage}%
              </p>

              {dashboard.issues?.length > 0 && (
                <ul className='mt-3 space-y-1 text-sm text-red-600 dark:text-red-300'>
                  {dashboard.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </Card>

      <div className='grid gap-4 lg:grid-cols-2'>
        <Card className='p-5'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
            Problems To Repair
          </h3>
          {issues.length > 0 ? (
            <ul className='mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300'>
              {issues.map((issue) => (
                <li key={issue} className='rounded-lg bg-red-500/10 px-3 py-2'>
                  {issue}
                </li>
              ))}
            </ul>
          ) : (
            <p className='mt-3 text-sm text-gray-500 dark:text-gray-400'>
              No current system problems detected.
            </p>
          )}
        </Card>

        {showTasks && (
          <Card className='p-5'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
              IT Department Work
            </h3>
            <div className='mt-3 space-y-3'>
              {tasks.map((task) => (
                <div key={task.name}>
                  <p className='font-medium text-gray-900 dark:text-white'>
                    {task.name}
                  </p>
                  <p className='text-sm text-gray-500 dark:text-gray-400'>
                    {task.description}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

