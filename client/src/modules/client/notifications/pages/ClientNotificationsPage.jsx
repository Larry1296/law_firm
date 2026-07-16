import { useMemo, useState } from 'react';
import { Bell, CheckCheck, Clock3 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import axiosInstance from '@/core/api/axios';
import Card from '@/components/ui/Card';
import Button3D from '@/components/ui/Button3D';
import SectionHeading from '@/components/ui/SectionHeading';
import { formatDateTime } from '@/core/utils/dateFormatter';

export default function ClientNotificationsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['client-notifications'],
    queryFn: async () => {
      const response = await axiosInstance.get('/notifications/');
      return response.data;
    },
    refetchInterval: 10000,
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unread_count || 0;

  const markRead = useMutation({
    mutationFn: (id) => axiosInstance.post(`/notifications/${id}/read/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => axiosInstance.post('/notifications/mark-all-read/'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const visibleNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((notification) => !notification.is_read);
    }
    return notifications;
  }, [filter, notifications]);

  const openNotification = async (notification) => {
    if (!notification.is_read) {
      await markRead.mutateAsync(notification.id);
    }
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  return (
    <div className='space-y-6 p-4 md:p-6 animate-fadeIn'>
      <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
        <SectionHeading
          title='Notifications'
          subtitle='Live updates from your firm about your legal matters.'
        />

        <Button3D
          variant='secondary'
          disabled={!unreadCount || markAllRead.isPending}
          onClick={() => markAllRead.mutate()}
        >
          <CheckCheck size={16} />
          Mark all read
        </Button3D>
      </div>

      <div className='grid gap-4 sm:grid-cols-2'>
        <Card className='p-5'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>
                Total Notifications
              </p>
              <p className='mt-2 text-3xl font-bold text-text-primary-light dark:text-text-primary-dark'>
                {notifications.length}
              </p>
            </div>
            <Bell className='text-brand-primary' size={28} />
          </div>
        </Card>

        <Card className='p-5'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>
                Unread
              </p>
              <p className='mt-2 text-3xl font-bold text-warning'>
                {unreadCount}
              </p>
            </div>
            <Clock3 className='text-warning' size={28} />
          </div>
        </Card>
      </div>

      <div className='flex gap-2'>
        {['all', 'unread'].map((item) => (
          <button
            key={item}
            type='button'
            onClick={() => setFilter(item)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              filter === item
                ? 'bg-brand-primary text-white'
                : 'bg-surface-light text-text-primary-light hover:bg-background-light dark:bg-surface-dark dark:text-text-primary-dark dark:hover:bg-background-dark'
            }`}
          >
            {item === 'all' ? 'All' : 'Unread'}
          </button>
        ))}
      </div>

      {isLoading && <Card className='p-6'>Loading notifications...</Card>}

      {isError && (
        <Card className='p-6 text-error'>Could not load notifications.</Card>
      )}

      {!isLoading && !isError && (
        <div className='space-y-3'>
          {visibleNotifications.map((notification) => (
            <button
              key={notification.id}
              type='button'
              onClick={() => openNotification(notification)}
              className='w-full text-left'
            >
              <Card
                className={`p-4 transition hover:shadow-md ${
                  notification.is_read
                    ? ''
                    : 'border-l-4 border-l-brand-primary bg-brand-primary/5'
                }`}
              >
                <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
                  <div>
                    <p className='font-semibold text-text-primary-light dark:text-text-primary-dark'>
                      {notification.title}
                    </p>
                    <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>
                      {notification.message}
                    </p>
                    {notification.case_number && (
                      <p className='mt-2 text-xs font-semibold text-brand-primary'>
                        Case {notification.case_number}
                      </p>
                    )}
                  </div>
                  <p className='text-xs text-text-muted-light dark:text-text-muted-dark'>
                    {formatDateTime(notification.created_at)}
                  </p>
                </div>
              </Card>
            </button>
          ))}

          {!visibleNotifications.length && (
            <Card className='p-6 text-text-muted-light dark:text-text-muted-dark'>
              No notifications yet.
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
