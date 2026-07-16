import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Button3D from '@/components/ui/Button3D';
import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import axiosInstance from '@/core/api/axios';
import { formatDateTime } from '@/core/utils/dateFormatter';

export default function AdminNotificationsCenterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [view, setView] = useState('received');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-notifications', view],
    queryFn: async () => {
      const response = await axiosInstance.get('/notifications/', {
        params: view === 'sent' ? { sent: true } : undefined,
      });
      return response.data;
    },
    refetchInterval: 10000,
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unread_count || 0;

  const refreshNotifications = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
  };

  const markRead = useMutation({
    mutationFn: (id) => axiosInstance.post(`/notifications/${id}/read/`),
    onSuccess: refreshNotifications,
  });

  const markAllRead = useMutation({
    mutationFn: () => axiosInstance.post('/notifications/mark-all-read/'),
    onSuccess: refreshNotifications,
  });

  const openNotification = async (notification) => {
    if (!notification.is_read) {
      await markRead.mutateAsync(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  return (
    <div className='space-y-6 p-4 md:p-6 animate-fadeIn'>
      <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
        <SectionHeading
          title='Notifications'
          subtitle='Firm alerts, assignments, and unread chat messages.'
          icon={Bell}
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

      <div className='flex gap-2'>
        {[
          ['received', 'Received'],
          ['sent', 'Sent'],
        ].map(([key, label]) => (
          <button
            key={key}
            type='button'
            onClick={() => setView(key)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              view === key
                ? 'bg-[color:var(--brand-primary)] text-white'
                : 'bg-[color:var(--surface)] text-[color:var(--text-primary)] hover:bg-[color:var(--surface-muted)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading && <Card className='p-6'>Loading notifications...</Card>}

      {isError && (
        <Card className='p-6 text-red-600 dark:text-red-300'>
          Could not load notifications.
        </Card>
      )}

      {!isLoading && !isError && (
        <div className='space-y-3'>
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type='button'
              onClick={() => openNotification(notification)}
              disabled={view === 'sent'}
              className={`w-full rounded-lg border p-4 text-left transition hover:-translate-y-0.5 ${
                notification.is_read
                  ? 'border-[color:var(--border)] bg-[color:var(--surface)]'
                  : 'border-blue-400/40 bg-blue-500/10'
              } disabled:cursor-default disabled:hover:translate-y-0`}
            >
              <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
                <div>
                  <h3 className='font-semibold'>{notification.title}</h3>
                  <p className='mt-1 text-sm text-[color:var(--text-muted)]'>
                    {notification.message}
                  </p>
                  {notification.case_number && (
                    <p className='mt-2 text-xs font-semibold text-[color:var(--brand-primary)]'>
                      Case {notification.case_number}
                    </p>
                  )}
                  {view === 'sent' && (
                    <p className='mt-2 text-xs text-[color:var(--text-muted)]'>
                      To {notification.recipient_name || notification.recipient_email}
                      {notification.read_at
                        ? ` • Read ${formatDateTime(notification.read_at)}`
                        : ' • Not read yet'}
                    </p>
                  )}
                </div>
                <div className='text-xs text-[color:var(--text-muted)]'>
                  <p>{formatDateTime(notification.created_at)}</p>
                  {notification.is_read && notification.read_at && (
                    <p className='mt-1'>Read {formatDateTime(notification.read_at)}</p>
                  )}
                </div>
              </div>
            </button>
          ))}

          {!notifications.length && (
            <Card className='p-6 text-sm text-[color:var(--text-muted)]'>
              No notifications yet.
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
