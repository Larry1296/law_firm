import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Briefcase, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import axiosInstance from '@/core/api/axios';

const formatDate = (value) => {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

export default function SecretaryNotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['secretary-notifications'],
    queryFn: async () => {
      const response = await axiosInstance.get('/staff/secretary/notifications/');
      return response.data;
    },
  });
  const notifications = data?.notifications || [];

  const markRead = useMutation({
    mutationFn: (id) => axiosInstance.post(`/notifications/${id}/read/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secretary-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['secretary-dashboard'] });
    },
  });

  const openNotification = async (notification) => {
    if (!notification.is_read) {
      await markRead.mutateAsync(notification.id);
    }
    if (notification.case) {
      navigate(`/secretary/cases/${notification.case}`);
    }
  };

  return (
    <div className='p-4 sm:p-6 lg:p-8 space-y-6'>
      <SectionHeading
        title='Notifications'
        subtitle='Case assignments and administrative updates.'
        icon={Bell}
      />

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
              className={`w-full text-left rounded-lg border p-4 transition hover:-translate-y-0.5 ${
                notification.is_read
                  ? 'border-[color:var(--border)] bg-[color:var(--surface)]'
                  : 'border-blue-400/40 bg-blue-500/10'
              }`}
            >
              <div className='flex items-start justify-between gap-4'>
                <div className='flex gap-3'>
                  <div className='rounded-lg bg-[color:var(--surface-muted)] p-2 text-[color:var(--brand-primary)]'>
                    <Briefcase size={18} />
                  </div>
                  <div>
                    <h3 className='font-semibold'>{notification.title}</h3>
                    <p className='mt-1 text-sm text-[color:var(--text-muted)]'>
                      {notification.message}
                    </p>
                    <p className='mt-2 text-xs text-[color:var(--text-muted)]'>
                      {formatDate(notification.created_at)}
                    </p>
                  </div>
                </div>
                {notification.is_read && <CheckCheck size={18} />}
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
