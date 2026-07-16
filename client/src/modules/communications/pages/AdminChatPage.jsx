import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquarePlus, Megaphone } from 'lucide-react';

import { getApiErrorMessage } from '@/core/utils/errorMessages';
import { useAdminStaff } from '@/modules/admin/staff/hooks/useAdminStaff';
import ChatWorkspace from '@/modules/communications/components/ChatWorkspace';
import {
  useAdminThreads,
  useSendThreadMessage,
  useStartStaffThread,
  useThreadMessages,
} from '@/modules/communications/hooks/useCommunications';

import Button3D from '@/components/ui/Button3D';
import Card from '@/components/ui/Card';
import { Input3D } from '@/components/ui/Input3D';

const initialThreadForm = {
  staff_user_id: '',
  subject: '',
  message: '',
};

export default function AdminChatPage() {
  const [threadType, setThreadType] = useState('ALL');
  const [form, setForm] = useState(initialThreadForm);
  const [feedback, setFeedback] = useState(null);

  const { staff } = useAdminStaff();
  const params = threadType === 'ALL' ? {} : { thread_type: threadType };
  const { data, isLoading, refetch } = useAdminThreads(params);
  const startThread = useStartStaffThread();

  // ✅ Fix Warning — wrap threads in useMemo for stable reference
  const threads = useMemo(() => data?.threads || [], [data?.threads]);

  const activeStaff = useMemo(
    () => (staff || []).filter((member) => member.is_active !== false),
    [staff],
  );

  // ✅ Fix Error — derive selectedThreadId without useEffect
  // Initialise to first thread if available
  const defaultThreadId = useMemo(
    () => (threads.length ? threads[0].id : null),
    [threads],
  );

  // User can still manually change thread via sidebar or after starting a new one
  const [selectedThreadId, setSelectedThreadId] = useState(defaultThreadId);

  // ✅ Ensure selectedThreadId is always valid within current threads list
  // Replaces the second if-block that was inside the old useEffect
  const resolvedThreadId = useMemo(() => {
    if (!threads.length) return null;
    const stillExists = threads.some(
      (thread) => String(thread.id) === String(selectedThreadId),
    );
    return stillExists ? selectedThreadId : (threads[0]?.id ?? null);
  }, [threads, selectedThreadId]);

  const messagesQuery = useThreadMessages(resolvedThreadId);
  const sendMessage = useSendThreadMessage();

  // ✅ useEffect block removed — no more cascading renders

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleStartThread = async (event) => {
    event.preventDefault();
    setFeedback(null);

    if (!form.staff_user_id) {
      setFeedback({ type: 'error', text: 'Choose a staff member first.' });
      return;
    }

    try {
      const response = await startThread.mutateAsync({
        staff_user_id: form.staff_user_id,
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
      setForm(initialThreadForm);
      setSelectedThreadId(response.thread?.id);
      setThreadType('ALL');
      setFeedback({ type: 'success', text: 'Staff chat opened successfully.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getApiErrorMessage(error, 'Could not open staff chat.'),
      });
    }
  };

  const handleSendMessage = async (body) => {
    await sendMessage.mutateAsync({ threadId: resolvedThreadId, body });
  };

  const sidebarExtra = (
    <div className='mt-3 flex flex-wrap gap-2'>
      {[
        ['ALL', 'All'],
        ['DIRECT_STAFF', 'Staff'],
        ['CASE_CLIENT', 'Cases'],
      ].map(([value, label]) => (
        <button
          key={value}
          type='button'
          onClick={() => {
            setThreadType(value);
            setSelectedThreadId(null);
          }}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            threadType === value
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div className='space-y-6 p-4 md:p-6 animate-fadeIn'>
      <div className='grid gap-4 xl:grid-cols-[420px_1fr]'>
        <Card className='p-5'>
          <div className='mb-4 flex items-center gap-2'>
            <MessageSquarePlus size={20} />
            <h2 className='text-lg font-bold text-slate-900 dark:text-white'>
              Start staff chat
            </h2>
          </div>

          <form onSubmit={handleStartThread} className='space-y-4'>
            <select
              value={form.staff_user_id}
              onChange={(event) =>
                updateForm('staff_user_id', event.target.value)
              }
              className='h-12 w-full rounded-2xl border border-border-light bg-white px-4 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-border-dark dark:bg-slate-900 dark:text-white'
            >
              <option value=''>Choose staff member</option>
              {activeStaff.map((member) => (
                <option
                  key={member.user_id || member.id}
                  value={member.user_id || member.id}
                >
                  {member.full_name || member.email} — {member.role}
                </option>
              ))}
            </select>

            <Input3D
              value={form.subject}
              onChange={(event) => updateForm('subject', event.target.value)}
              placeholder='Subject e.g. Court filing update'
            />

            <textarea
              value={form.message}
              onChange={(event) => updateForm('message', event.target.value)}
              rows={4}
              placeholder='Optional opening message...'
              autoComplete='on'
              autoCorrect='on'
              autoCapitalize='sentences'
              spellCheck
              className='w-full resize-none rounded-2xl border border-border-light bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-border-dark dark:bg-slate-900 dark:text-white'
            />

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
              disabled={startThread.isPending}
              className='w-full'
            >
              {startThread.isPending ? 'Opening...' : 'Open chat'}
            </Button3D>
          </form>
        </Card>

        <Card className='p-5'>
          <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
            <div className='flex items-center gap-2'>
              <Megaphone size={20} />
              <div>
                <h2 className='font-bold text-slate-900 dark:text-white'>
                  Need to broadcast?
                </h2>
                <p className='text-sm text-slate-500 dark:text-slate-300'>
                  Announcements are no-reply messages to all or selected staff.
                </p>
              </div>
            </div>

            <Link to='/admin/communication/announcements'>
              <Button3D variant='outlineLight'>Go to announcements</Button3D>
            </Link>
          </div>
        </Card>
      </div>

      <ChatWorkspace
        title='Admin Communication Center'
        subtitle='View all chat threads, reply to case communication, and privately chat with staff.'
        threads={threads}
        selectedThreadId={resolvedThreadId}
        onSelectThread={(thread) => setSelectedThreadId(thread.id)}
        messages={messagesQuery.data?.messages || []}
        onSendMessage={handleSendMessage}
        isLoadingThreads={isLoading}
        isLoadingMessages={messagesQuery.isLoading}
        isSending={sendMessage.isPending}
        onRefresh={refetch}
        sidebarExtra={sidebarExtra}
        emptyThreadMessage='No chat threads yet. Start a staff chat or wait for case communication.'
      />
    </div>
  );
}
