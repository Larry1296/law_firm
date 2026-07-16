import { Bell, CheckCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import axiosInstance from '@/core/api/axios';
import { formatDateTime } from '@/core/utils/dateFormatter';
import useUnreadNotifications from '@/modules/notifications/hooks/useUnreadNotifications';

export default function NotificationBellDropdown({
  className = '',
  fallbackPath = '/notifications',
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const wrapperRef = useRef(null);
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useUnreadNotifications();
  const notifications = data?.notifications || [];
  const unreadCount = data?.unread_count ?? notifications.length;

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const markRead = useMutation({
    mutationFn: (id) => axiosInstance.post(`/notifications/${id}/read/`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['notifications', 'unread-count'],
      });
      queryClient.invalidateQueries({ queryKey: ['client-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['lawyer-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['secretary-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => axiosInstance.post('/notifications/mark-all-read/'),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['notifications', 'unread-count'],
      });
      queryClient.invalidateQueries({ queryKey: ['client-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['lawyer-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['secretary-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
  });

  const openNotification = async (notification) => {
    await markRead.mutateAsync(notification.id);
    setOpen(false);
    navigate(notification.action_url || fallbackPath);
  };

  return (
    <div ref={wrapperRef} className='relative'>
      <button
        type='button'
        onClick={() => setOpen((value) => !value)}
        className={`relative p-2 rounded ${className}`}
        aria-label='Notifications'
        aria-expanded={open}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className='absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white'>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className='absolute right-0 z-50 mt-3 w-[min(92vw,360px)] overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-xl'>
          <div className='flex items-center justify-between border-b border-[color:var(--border)] px-4 py-3'>
            <div>
              <p className='text-sm font-semibold text-[color:var(--text-primary)]'>
                New notifications
              </p>
              <p className='text-xs text-[color:var(--text-muted)]'>
                {unreadCount} unread
              </p>
            </div>
            <button
              type='button'
              disabled={!unreadCount || markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
              className='inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[color:var(--brand-primary)] hover:bg-[color:var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-50'
            >
              <CheckCheck size={14} />
              Mark all
            </button>
          </div>

          <div className='max-h-[420px] overflow-y-auto'>
            {isLoading && (
              <p className='px-4 py-5 text-sm text-[color:var(--text-muted)]'>
                Loading notifications...
              </p>
            )}

            {!isLoading &&
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type='button'
                  onClick={() => openNotification(notification)}
                  className='block w-full border-b border-[color:var(--border)] px-4 py-3 text-left last:border-b-0 hover:bg-[color:var(--surface-muted)]'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <p className='line-clamp-1 text-sm font-semibold text-[color:var(--text-primary)]'>
                      {notification.title}
                    </p>
                    <span className='shrink-0 text-[10px] text-[color:var(--text-muted)]'>
                      {formatDateTime(notification.created_at)}
                    </span>
                  </div>
                  <p className='mt-1 line-clamp-2 text-xs text-[color:var(--text-muted)]'>
                    {notification.message}
                  </p>
                  {notification.notification_type === 'CHAT_MESSAGE' && (
                    <p className='mt-2 text-xs font-semibold text-[color:var(--brand-primary)]'>
                      Open conversation
                    </p>
                  )}
                </button>
              ))}

            {!isLoading && !notifications.length && (
              <p className='px-4 py-5 text-sm text-[color:var(--text-muted)]'>
                No unread notifications.
              </p>
            )}
          </div>

          <button
            type='button'
            onClick={() => {
              setOpen(false);
              navigate(fallbackPath);
            }}
            className='block w-full border-t border-[color:var(--border)] px-4 py-3 text-center text-sm font-semibold text-[color:var(--brand-primary)] hover:bg-[color:var(--surface-muted)]'
          >
            View notification center
          </button>
        </div>
      )}
    </div>
  );
}
