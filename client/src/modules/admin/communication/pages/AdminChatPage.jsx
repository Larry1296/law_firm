import { useMemo, useState } from 'react';
import { MessageSquare, Send, UserRound, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import Button3D from '@/components/ui/Button3D';
import Card from '@/components/ui/Card';
import ChatWorkspace from '@/modules/communications/components/ChatWorkspace';
import {
  useAdminThreads,
  useSendThreadMessage,
  useSendStaffBulkMessage,
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

const roleLabels = {
  LAWYER: 'Lawyers',
  SECRETARY: 'Secretaries',
  ACCOUNTANT: 'Accountants',
  HR: 'HR',
  IT: 'IT',
};

const groupStaffByRole = (staff) =>
  staff.reduce((groups, member) => {
    const role = member.firm_role || 'STAFF';
    return {
      ...groups,
      [role]: [...(groups[role] || []), member],
    };
  }, {});

export default function AdminChatPage() {
  const [searchParams] = useSearchParams();
  const [targetMode, setTargetMode] = useState('single');
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(
    () => searchParams.get('thread') || null,
  );
  const [message, setMessage] = useState('');
  const [feedback, setFeedback] = useState(null);

  const contactsQuery = useStaffContacts();
  const threadsQuery = useAdminThreads(directStaffParams);
  const startThread = useStartStaffThread();
  const sendBulkMessage = useSendStaffBulkMessage();
  const sendMessage = useSendThreadMessage();

  const staff = useMemo(
    () => contactsQuery.data?.staff || [],
    [contactsQuery.data?.staff],
  );
  const threads = useMemo(
    () => threadsQuery.data?.threads || [],
    [threadsQuery.data?.threads],
  );
  const groupedStaff = useMemo(() => groupStaffByRole(staff), [staff]);

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

  const selectedStaffId = selectedStaffIds[0] || '';

  const handleStaffSelect = (event) => {
    const values = Array.from(event.target.selectedOptions).map(
      (option) => option.value,
    );
    setSelectedStaffIds(targetMode === 'single' ? values.slice(0, 1) : values);
  };

  const buildBulkPayload = () => {
    const trimmedMessage = message.trim();
    if (targetMode === 'all') {
      return { include_all_staff: true, message: trimmedMessage };
    }
    if (targetMode === 'lawyers') {
      return { target_roles: ['LAWYER'], message: trimmedMessage };
    }
    if (targetMode === 'secretaries') {
      return { target_roles: ['SECRETARY'], message: trimmedMessage };
    }
    return { staff_user_ids: selectedStaffIds, message: trimmedMessage };
  };

  const handleOpenThread = async () => {
    if (!selectedStaffId || targetMode !== 'single') {
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

  const handleBulkSend = async () => {
    if (!message.trim()) {
      setFeedback({ type: 'error', text: 'Type a message to send.' });
      return;
    }
    if (
      ['single', 'selected'].includes(targetMode) &&
      selectedStaffIds.length === 0
    ) {
      setFeedback({ type: 'error', text: 'Choose at least one staff member.' });
      return;
    }

    setFeedback(null);

    try {
      if (targetMode === 'single' && selectedStaffIds.length === 1) {
        const response = await startThread.mutateAsync({
          staff_user_id: selectedStaffId,
          message: message.trim(),
        });
        setSelectedThreadId(response.thread?.id);
        setFeedback({ type: 'success', text: 'Message sent to 1 staff member.' });
      } else {
        const response = await sendBulkMessage.mutateAsync(buildBulkPayload());
        setSelectedThreadId(response.deliveries?.[0]?.thread?.id || null);
        setFeedback({
          type: 'success',
          text: `Message sent to ${response.delivery_count || 0} staff member${
            response.delivery_count === 1 ? '' : 's'
          }.`,
        });
      }
      setMessage('');
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getApiErrorMessage(error, 'Could not send staff message.'),
      });
    }
  };

  const handleSendMessage = async (body) => {
    await sendMessage.mutateAsync({ threadId: resolvedThreadId, body });
  };

  const sidebarExtra = (
    <div className='mt-3 rounded-xl bg-blue-50 px-3 py-3 text-xs text-blue-800 dark:bg-blue-950/50 dark:text-blue-200'>
      Group sends are delivered as private admin chats. Staff only see their own
      thread and can reply privately.
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

        <div className='grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)]'>
          <select
            value={targetMode}
            onChange={(event) => {
              setTargetMode(event.target.value);
              setSelectedStaffIds([]);
            }}
            className='h-12 rounded-2xl border border-border-light bg-white px-4 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-border-dark dark:bg-slate-900 dark:text-white'
          >
            <option value='single'>One staff member</option>
            <option value='selected'>Selected staff</option>
            <option value='lawyers'>All lawyers</option>
            <option value='secretaries'>All secretaries</option>
            <option value='all'>All staff</option>
          </select>

          <select
            value={targetMode === 'single' ? selectedStaffId : selectedStaffIds}
            onChange={handleStaffSelect}
            multiple={targetMode === 'selected'}
            disabled={!['single', 'selected'].includes(targetMode)}
            className={`rounded-2xl border border-border-light bg-white px-4 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-border-dark dark:bg-slate-900 dark:text-white ${
              targetMode === 'selected' ? 'min-h-28 py-3' : 'h-12'
            }`}
          >
            <option value=''>
              {contactsQuery.isLoading
                ? 'Loading staff...'
                : targetMode === 'selected'
                  ? 'Use Ctrl/Cmd to select staff'
                  : 'Choose staff'}
            </option>
            {Object.entries(groupedStaff).map(([role, members]) => (
              <optgroup key={role} label={roleLabels[role] || role}>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name || member.email} ({member.email})
                  </option>
                ))}
              </optgroup>
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
        </div>

        <div className='mt-3 flex flex-wrap gap-3'>
          <Button3D
            onClick={handleOpenThread}
            disabled={
              startThread.isPending || targetMode !== 'single' || !selectedStaffId
            }
          >
            <UserRound size={16} />
            {startThread.isPending ? 'Opening...' : 'Open Chat'}
          </Button3D>

          <Button3D
            onClick={handleBulkSend}
            disabled={sendBulkMessage.isPending || startThread.isPending}
          >
            {['selected', 'lawyers', 'secretaries', 'all'].includes(targetMode) ? (
              <Users size={16} />
            ) : (
              <Send size={16} />
            )}
            {sendBulkMessage.isPending || startThread.isPending
              ? 'Sending...'
              : 'Send Message'}
          </Button3D>
        </div>

        {feedback && (
          <div
            className={`mt-4 rounded-xl px-4 py-3 text-sm ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200'
                : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200'
            }`}
          >
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
