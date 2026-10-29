import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import axiosInstance from '@/core/api/axios';
import { Button, EmptyState, ErrorNotice, PageHeader, Panel } from '@/modules/platform/components/ui';
import { formatDateTime } from '@/modules/platform/components/styles';

export default function PlatformNotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const notifications = useQuery({
    queryKey: ['platform-notifications'],
    queryFn: async () => (await axiosInstance.get('/notifications/')).data,
    refetchInterval: 10000,
  });
  const rows = notifications.data?.notifications || [];
  const unreadCount = notifications.data?.unread_count || 0;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['platform-notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
  };
  const markRead = useMutation({ mutationFn: (id) => axiosInstance.post(`/notifications/${id}/read/`), onSuccess: refresh });
  const markAllRead = useMutation({ mutationFn: () => axiosInstance.post('/notifications/mark-all-read/'), onSuccess: refresh });

  const open = async (notification) => {
    if (!notification.is_read) await markRead.mutateAsync(notification.id);
    if (notification.action_url) navigate(notification.action_url);
  };

  return (
    <>
      <PageHeader
        title='Notifications'
        description='Registration requests, new firm sign-ups and M-Pesa payments waiting for confirmation.'
        actions={(
          <Button variant='secondary' disabled={!unreadCount || markAllRead.isPending} onClick={() => markAllRead.mutate()}>
            Mark all read
          </Button>
        )}
      />
      <Panel bodyClassName='p-0'>
        {(notifications.error && !notifications.error?.isActionCancelled) && <div className='p-4'><ErrorNotice error={notifications.error} /></div>}
        {notifications.isLoading ? (
          <p role='status' className='p-5 text-sm text-text-muted-light dark:text-text-muted-dark'>Loading notifications…</p>
        ) : rows.length === 0 ? (
          <EmptyState>No notifications yet.</EmptyState>
        ) : (
          <ul className='divide-y divide-border-light dark:divide-border-dark'>
            {rows.map((notification) => (
              <li key={notification.id}>
                <button
                  type='button'
                  onClick={() => open(notification)}
                  className={`block w-full px-5 py-4 text-left transition hover:bg-surface-light dark:hover:bg-surface-dark ${notification.is_read ? '' : 'bg-brand-primary/5 dark:bg-sky-400/5'}`}
                >
                  <div className='flex items-start justify-between gap-3'>
                    <p className={`min-w-0 ${notification.is_read ? '' : 'font-semibold'}`}>{notification.title}</p>
                    <span className='shrink-0 text-xs text-text-muted-light dark:text-text-muted-dark'>{formatDateTime(notification.created_at)}</span>
                  </div>
                  <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>{notification.message}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
