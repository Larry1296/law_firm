import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import ChatWorkspace from '@/modules/communications/components/ChatWorkspace';
import {
  useAdminThreads,
  useSendThreadMessage,
  useThreadMessages,
} from '@/modules/communications/hooks/useCommunications';

import Card from '@/components/ui/Card';

export default function AdminClientCommunicationPage() {
  const { id } = useParams();

  const { data, isLoading, refetch } = useAdminThreads({
    thread_type: 'CASE_CLIENT',
  });

  // ✅ Fix Warning — stable reference for threads
  const threads = useMemo(() => {
    const allThreads = data?.threads || [];
    return allThreads.filter(
      (thread) => String(thread.case?.client?.id) === String(id),
    );
  }, [data?.threads, id]);

  // ✅ Fix Error — derive selectedThreadId without useEffect
  // Priority: keep existing valid selection → first thread → null
  const defaultThreadId = useMemo(() => {
    if (!threads.length) return null;
    return threads[0].id;
  }, [threads]);

  const [selectedThreadId, setSelectedThreadId] = useState(defaultThreadId);

  // ✅ Resolve case where selected thread no longer exists in the list
  // (e.g. client filter changed) — derived safely via useMemo
  const resolvedThreadId = useMemo(() => {
    if (!threads.length) return null;
    const stillExists = threads.some(
      (thread) => String(thread.id) === String(selectedThreadId),
    );
    return stillExists ? selectedThreadId : threads[0].id;
  }, [threads, selectedThreadId]);

  const messagesQuery = useThreadMessages(resolvedThreadId);
  const sendMessage = useSendThreadMessage();

  // ✅ Both useEffect blocks removed — no more cascading renders

  const handleSendMessage = async (body) => {
    await sendMessage.mutateAsync({ threadId: resolvedThreadId, body });
  };

  return (
    <div className='space-y-6 p-4 md:p-6 animate-fadeIn'>
      {!threads.length && !isLoading && (
        <Card className='p-5 text-sm text-slate-500 dark:text-slate-300'>
          No case communication threads exist for this client yet. Threads are
          created per case when the client or firm opens case communication.
        </Card>
      )}

      <ChatWorkspace
        title='Client Case Communication'
        subtitle='Admin view of all case-specific communication threads for this client.'
        threads={threads}
        selectedThreadId={resolvedThreadId}
        onSelectThread={(thread) => setSelectedThreadId(thread.id)}
        messages={messagesQuery.data?.messages || []}
        onSendMessage={handleSendMessage}
        isLoadingThreads={isLoading}
        isLoadingMessages={messagesQuery.isLoading}
        isSending={sendMessage.isPending}
        onRefresh={refetch}
        emptyThreadMessage='No communication threads for this client.'
      />
    </div>
  );
}
