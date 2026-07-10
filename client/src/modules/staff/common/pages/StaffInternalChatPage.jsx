import { useMemo, useState } from 'react';

import ChatWorkspace from '@/modules/communications/components/ChatWorkspace';
import {
  useSendThreadMessage,
  useThreadMessages,
  useThreads,
} from '@/modules/communications/hooks/useCommunications';

const directStaffParams = { thread_type: 'DIRECT_STAFF' };

export default function StaffInternalChatPage({
  title = 'Staff Chat',
  subtitle = 'Private internal messages with admin.',
}) {
  const [selectedThreadId, setSelectedThreadId] = useState(null);

  const threadsQuery = useThreads(directStaffParams);
  const sendMessage = useSendThreadMessage();

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

  const handleSendMessage = async (body) => {
    await sendMessage.mutateAsync({ threadId: resolvedThreadId, body });
  };

  const sidebarExtra = (
    <div className='mt-3 rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:bg-blue-950/50 dark:text-blue-200'>
      Internal communication with admin appears here.
    </div>
  );

  return (
    <div className='p-4 md:p-6 animate-fadeIn'>
      <ChatWorkspace
        title={title}
        subtitle={subtitle}
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
        emptyThreadMessage='No internal staff chats yet.'
      />
    </div>
  );
}
