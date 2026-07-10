import { Megaphone } from 'lucide-react';

import { formatDateTime } from '@/core/utils/dateFormatter';
import {
  useAnnouncementInbox,
  useMarkAnnouncementRead,
} from '@/modules/communications/hooks/useCommunications';

import Button3D from '@/components/ui/Button3D';
import Card from '@/components/ui/Card';

export default function AnnouncementInboxCard({ compact = false }) {
  const { data, isLoading } = useAnnouncementInbox();
  const markRead = useMarkAnnouncementRead();
  const announcements = data?.announcements || [];
  const visibleAnnouncements = compact
    ? announcements.slice(0, 3)
    : announcements;

  return (
    <Card className='p-4'>
      <div className='mb-3 flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <Megaphone size={18} />
          <h2 className='font-semibold text-slate-900 dark:text-white'>
            Admin Announcements
          </h2>
        </div>
        <span className='rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-200'>
          {announcements.filter((item) => !item.is_read).length} unread
        </span>
      </div>

      {isLoading && (
        <p className='text-sm text-slate-500'>Loading announcements...</p>
      )}

      {!isLoading && !visibleAnnouncements.length && (
        <p className='text-sm text-slate-500 dark:text-slate-300'>
          No announcements yet.
        </p>
      )}

      <div className='space-y-3'>
        {visibleAnnouncements.map((item) => {
          const announcement = item.announcement || {};

          return (
            <div
              key={item.id}
              className={`rounded-xl border p-3 ${
                item.is_read
                  ? 'border-border-light bg-slate-50 dark:border-border-dark dark:bg-slate-900/50'
                  : 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40'
              }`}
            >
              <div className='flex flex-col gap-2 md:flex-row md:items-start md:justify-between'>
                <div>
                  <p className='font-semibold text-slate-900 dark:text-white'>
                    {announcement.title}
                  </p>
                  <p className='mt-1 text-sm text-slate-600 dark:text-slate-300'>
                    {announcement.body}
                  </p>
                  <p className='mt-2 text-xs text-slate-400'>
                    {formatDateTime(announcement.created_at)}
                  </p>
                </div>

                {!item.is_read && (
                  <Button3D
                    size='sm'
                    variant='outlineLight'
                    disabled={markRead.isPending}
                    onClick={() => markRead.mutate(announcement.id)}
                  >
                    Mark read
                  </Button3D>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
