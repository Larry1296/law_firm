import { useMemo, useState } from 'react';
import { Megaphone, Send, Users } from 'lucide-react';

import { getApiErrorMessage } from '@/core/utils/errorMessages';
import { formatDateTime } from '@/core/utils/dateFormatter';
import { useAdminStaff } from '@/modules/admin/staff/hooks/useAdminStaff';
import {
  useAdminAnnouncements,
  useCreateAnnouncement,
} from '@/modules/communications/hooks/useCommunications';

import Button3D from '@/components/ui/Button3D';
import Card from '@/components/ui/Card';
import { Input3D } from '@/components/ui/Input3D';
import SectionHeading from '@/components/ui/SectionHeading';

const initialForm = {
  title: '',
  body: '',
  audience_type: 'ALL_STAFF',
  target_user_ids: [],
};

export default function AdminAnnouncementsPage() {
  const [form, setForm] = useState(initialForm);
  const [staffSearch, setStaffSearch] = useState('');
  const [feedback, setFeedback] = useState(null);

  const { staff, isLoading: staffLoading } = useAdminStaff();
  const { data, isLoading, refetch } = useAdminAnnouncements();
  const createAnnouncement = useCreateAnnouncement();

  const announcements = data?.announcements || [];

  const activeStaff = useMemo(
    () =>
      (staff || [])
        .filter((member) => member.is_active !== false)
        .filter((member) => {
          const term = staffSearch.toLowerCase();
          if (!term) return true;
          return (
            member.full_name?.toLowerCase().includes(term) ||
            member.email?.toLowerCase().includes(term) ||
            member.role?.toLowerCase().includes(term)
          );
        }),
    [staff, staffSearch],
  );

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const toggleTarget = (userId) => {
    setForm((current) => {
      const exists = current.target_user_ids.includes(userId);
      return {
        ...current,
        target_user_ids: exists
          ? current.target_user_ids.filter((id) => id !== userId)
          : [...current.target_user_ids, userId],
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback(null);

    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      audience_type: form.audience_type,
      target_user_ids:
        form.audience_type === 'TARGETED' ? form.target_user_ids : [],
    };

    if (!payload.title || !payload.body) {
      setFeedback({ type: 'error', text: 'Title and message are required.' });
      return;
    }

    if (
      payload.audience_type === 'TARGETED' &&
      !payload.target_user_ids.length
    ) {
      setFeedback({
        type: 'error',
        text: 'Select at least one staff recipient.',
      });
      return;
    }

    try {
      await createAnnouncement.mutateAsync(payload);
      setForm(initialForm);
      setStaffSearch('');
      setFeedback({ type: 'success', text: 'Announcement sent successfully.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getApiErrorMessage(error, 'Could not send announcement.'),
      });
    }
  };

  return (
    <div className='space-y-6 p-4 md:p-6 animate-fadeIn'>
      <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
        <SectionHeading
          title='Announcements'
          subtitle='Send no-reply announcements to all staff or selected staff members.'
        />

        <Button3D variant='outlineLight' onClick={refetch}>
          Refresh
        </Button3D>
      </div>

      <div className='grid gap-6 xl:grid-cols-[420px_1fr]'>
        <Card className='p-5'>
          <div className='mb-4 flex items-center gap-2'>
            <Megaphone size={20} />
            <h2 className='text-lg font-bold text-slate-900 dark:text-white'>
              New announcement
            </h2>
          </div>

          <form onSubmit={handleSubmit} className='space-y-4'>
            <Input3D
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
              placeholder='Announcement title'
            />

            <textarea
              value={form.body}
              onChange={(event) => updateField('body', event.target.value)}
              rows={5}
              placeholder='Write announcement message...'
              autoComplete='on'
              autoCorrect='on'
              autoCapitalize='sentences'
              spellCheck
              className='w-full resize-none rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-border-dark dark:bg-slate-900 dark:text-white'
            />

            <div className='grid gap-3 sm:grid-cols-2'>
              {[
                ['ALL_STAFF', 'All staff'],
                ['TARGETED', 'Selected staff'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type='button'
                  onClick={() => updateField('audience_type', value)}
                  className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                    form.audience_type === value
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-border-light bg-white text-slate-700 hover:border-blue-400 dark:border-border-dark dark:bg-slate-900 dark:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {form.audience_type === 'TARGETED' && (
              <div className='rounded-2xl border border-border-light p-3 dark:border-border-dark'>
                <div className='mb-3 flex items-center gap-2 text-sm font-semibold'>
                  <Users size={16} />
                  Select recipients ({form.target_user_ids.length})
                </div>

                <Input3D
                  value={staffSearch}
                  onChange={(event) => setStaffSearch(event.target.value)}
                  placeholder='Search staff...'
                />

                <div className='mt-3 max-h-64 space-y-2 overflow-y-auto pr-1'>
                  {staffLoading && (
                    <p className='text-sm text-slate-500'>Loading staff...</p>
                  )}
                  {!staffLoading &&
                    activeStaff.map((member) => (
                      <label
                        key={member.user_id || member.id}
                        className='flex cursor-pointer items-start gap-3 rounded-xl border border-border-light p-3 hover:bg-slate-50 dark:border-border-dark dark:hover:bg-slate-800/70'
                      >
                        <input
                          type='checkbox'
                          className='mt-1'
                          checked={form.target_user_ids.includes(
                            member.user_id || member.id,
                          )}
                          onChange={() =>
                            toggleTarget(member.user_id || member.id)
                          }
                        />
                        <span>
                          <span className='block font-semibold text-slate-900 dark:text-white'>
                            {member.full_name || member.email}
                          </span>
                          <span className='block text-xs text-slate-500 dark:text-slate-300'>
                            {member.email} • {member.role}
                          </span>
                        </span>
                      </label>
                    ))}
                </div>
              </div>
            )}

            {feedback && (
              <div
                className={`rounded-xl px-4 py-3 text-sm ${
                  feedback.type === 'success'
                    ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-200'
                    : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200'
                }`}
              >
                {feedback.text}
              </div>
            )}

            <Button3D
              type='submit'
              disabled={createAnnouncement.isPending}
              className='w-full'
            >
              <Send size={16} />
              {createAnnouncement.isPending
                ? 'Sending...'
                : 'Send announcement'}
            </Button3D>
          </form>
        </Card>

        <Card className='p-5'>
          <div className='mb-4 flex items-center justify-between gap-3'>
            <div>
              <h2 className='text-lg font-bold text-slate-900 dark:text-white'>
                Sent announcements
              </h2>
              <p className='text-sm text-slate-500 dark:text-slate-300'>
                Track delivery and read status.
              </p>
            </div>
            <span className='rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-200'>
              {announcements.length} total
            </span>
          </div>

          {isLoading && (
            <p className='text-sm text-slate-500'>Loading announcements...</p>
          )}
          {!isLoading && !announcements.length && (
            <p className='rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-300'>
              No announcements have been sent yet.
            </p>
          )}

          <div className='space-y-4'>
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className='rounded-2xl border border-border-light p-4 dark:border-border-dark'
              >
                <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
                  <div>
                    <div className='flex flex-wrap items-center gap-2'>
                      <h3 className='font-bold text-slate-900 dark:text-white'>
                        {announcement.title}
                      </h3>
                      <span className='rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200'>
                        {announcement.audience_type === 'ALL_STAFF'
                          ? 'All staff'
                          : 'Targeted'}
                      </span>
                    </div>
                    <p className='mt-2 text-sm text-slate-600 dark:text-slate-300'>
                      {announcement.body}
                    </p>
                    <p className='mt-2 text-xs text-slate-400'>
                      {formatDateTime(announcement.created_at)}
                    </p>
                  </div>

                  <div className='grid grid-cols-2 gap-2 text-center text-xs'>
                    <div className='rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900'>
                      <p className='font-bold text-slate-900 dark:text-white'>
                        {announcement.recipient_count}
                      </p>
                      <p className='text-slate-500'>Recipients</p>
                    </div>
                    <div className='rounded-xl bg-green-50 px-3 py-2 dark:bg-green-950/40'>
                      <p className='font-bold text-green-700 dark:text-green-200'>
                        {announcement.read_count}
                      </p>
                      <p className='text-green-700 dark:text-green-200'>Read</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
