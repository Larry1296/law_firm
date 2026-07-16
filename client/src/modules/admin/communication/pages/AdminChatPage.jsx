import { useMemo, useState } from 'react';
import { MessageSquare, UserRound } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import Button3D from '@/components/ui/Button3D';
import Card from '@/components/ui/Card';
import ChatWorkspace from '@/modules/communications/components/ChatWorkspace';
import {
  useAdminThreads,
  useSendThreadMessage,
  useStaffContacts,
  useStartStaffThread,
  useThreadMessages,
} from '@/modules/communications/hooks/useCommunications';
import { getApiErrorMessage } from '@/core/utils/errorMessages';

const directStaffParams = { thread_type: 'DIRECT_STAFF' };

const getStaffThread = (threads, staffUserId) =>
  threads.find((thread) =>
    thread.participants?.some(
      (participant) => String(participant.user?.id) === String(staffUserId),
    ),
  );

export default function AdminChatPage() {
  const [searchParams] = useSearchParams();
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedThreadId, setSelectedThreadId] = useState(
    () => searchParams.get('thread') || null,
  );
  const [message, setMessage] = useState('');
  const [feedback, setFeedback] = useState(null);

  const contactsQuery = useStaffContacts();
  const threadsQuery = useAdminThreads(directStaffParams);
  const startThread = useStartStaffThread();
  const sendMessage = useSendThreadMessage();

  const staff = useMemo(
    () => contactsQuery.data?.staff || [],
    [contactsQuery.data?.staff],
  );
  const threads = useMemo(
    () => threadsQuery.data?.threads || [],
    [threadsQuery.data?.threads],
  );

  const resolvedThreadId = useMemo(() => {
    if (
      selectedThreadId &&
      threads.some((thread) => String(thread.id) === String(selectedThreadId))
    ) {
      return selectedThreadId;
    }

    return threads[0]?.id || null;
  }, [selectedThreadId, threads]);

  const messagesQuery = useThreadMessages(resolvedThreadId);

  const handleStartThread = async () => {
    if (!selectedStaffId) {
      setFeedback({ type: 'error', text: 'Choose a staff member first.' });
      return;
    }

    setFeedback(null);

    const existingThread = getStaffThread(threads, selectedStaffId);
    if (existingThread && !message.trim()) {
      setSelectedThreadId(existingThread.id);
      return;
    }

    try {
      const response = await startThread.mutateAsync({
        staff_user_id: selectedStaffId,
        message: message.trim(),
      });
      setSelectedThreadId(response.thread?.id);
      setMessage('');
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
    <div className='mt-3 rounded-xl bg-blue-50 px-3 py-3 text-xs text-blue-800 dark:bg-blue-950/50 dark:text-blue-200'>
      One private thread per staff member. Select a staff member above to open
      or create the thread.
    </div>
  );

  return (
    <div className='space-y-6 p-4 md:p-6 animate-fadeIn'>
      <Card className='p-5'>
        <div className='mb-4 flex items-center gap-2'>
          <MessageSquare size={20} />
          <div>
            <h1 className='text-xl font-bold text-slate-900 dark:text-white'>
              Staff Chat
            </h1>
            <p className='text-sm text-slate-500 dark:text-slate-300'>
              Start a private internal conversation with any staff member.
            </p>
          </div>
        </div>

        <div className='grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]'>
          <select
            value={selectedStaffId}
            onChange={(event) => setSelectedStaffId(event.target.value)}
            className='h-12 rounded-2xl border border-border-light bg-white px-4 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-border-dark dark:bg-slate-900 dark:text-white'
          >
            <option value=''>
              {contactsQuery.isLoading ? 'Loading staff...' : 'Choose staff'}
            </option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.full_name || member.email} ({member.firm_role})
              </option>
            ))}
          </select>

          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder='Optional opening message'
            autoComplete='on'
            autoCorrect='on'
            autoCapitalize='sentences'
            spellCheck
            className='h-12 rounded-2xl border border-border-light bg-white px-4 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-border-dark dark:bg-slate-900 dark:text-white'
          />

          <Button3D
            onClick={handleStartThread}
            disabled={startThread.isPending || !selectedStaffId}
          >
            <UserRound size={16} />
            {startThread.isPending ? 'Opening...' : 'Open Chat'}
          </Button3D>
        </div>

        {feedback && (
          <div className='mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200'>
            {feedback.text}
          </div>
        )}
      </Card>

      <ChatWorkspace
        title='Internal Staff Communication'
        subtitle='Private admin-to-staff chat threads.'
        threads={threads}
        selectedThreadId={resolvedThreadId}
        onSelectThread={(thread) => setSelectedThreadId(thread.id)}
        messages={messagesQuery.data?.messages || []}
        onSendMessage={handleSendMessage}
        isLoadingThreads={threadsQuery.isLoading}
        isLoadingMessages={messagesQuery.isLoading}
        isSending={sendMessage.isPending}
        onRefresh={threadsQuery.refetch}
        sidebarExtra={sidebarExtra}
        emptyThreadMessage='No staff chat threads yet. Choose a staff member above to begin.'
      />
    </div>
  );
}
