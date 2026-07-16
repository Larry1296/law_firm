import Card from '@/components/ui/Card';
import { formatDateTime } from '@/core/utils/dateFormatter';

export default function DashboardNotifications({
  notifications = [],
  emptyMessage = 'No notifications yet.',
  onOpen,
}) {
  const items = Array.isArray(notifications) ? notifications.slice(0, 5) : [];

  return (
    <Card className='mt-6 min-w-0 p-4 sm:p-5'>
      <div className='mb-4 flex min-w-0 items-center justify-between gap-3'>
        <h3 className='min-w-0 text-base font-semibold text-text-primary-light dark:text-text-primary-dark sm:text-lg'>
          Latest Notifications
        </h3>
      </div>

      {items.length === 0 ? (
        <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>
          {emptyMessage}
        </p>
      ) : (
        <div className='space-y-3'>
          {items.map((notification) => (
            <button
              key={notification.id}
              type='button'
              onClick={() => onOpen?.(notification)}
              className='w-full min-w-0 rounded-lg border border-border-light bg-surface-light p-3 text-left transition hover:border-brand-primary dark:border-border-dark dark:bg-surface-dark sm:p-4'
            >
              <div className='flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4'>
                <div className='min-w-0'>
                  <p className='break-words font-semibold text-text-primary-light dark:text-text-primary-dark'>
                    {notification.title}
                  </p>
                  <p className='mt-1 break-words text-sm text-text-muted-light dark:text-text-muted-dark'>
                    {notification.description || notification.message}
                  </p>
                </div>
                {!notification.is_read && (
                  <span className='w-fit shrink-0 rounded-full bg-brand-primary px-2 py-1 text-xs font-semibold text-white'>
                    New
                  </span>
                )}
              </div>

              <p className='mt-2 text-xs text-text-muted-light dark:text-text-muted-dark'>
                {formatDateTime(notification.created_at)}
              </p>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
