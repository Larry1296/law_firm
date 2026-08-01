import ChatWorkspace from '@/modules/communications/components/ChatWorkspace';
import {
  useCaseLawyerThread,
  useSendThreadMessage,
  useThreadMessages,
} from '@/modules/communications/hooks/useCommunications';
import LawyerDocumentsPage from '@/modules/staff/lawyer/documents/pages/LawyerDocumentsPage';

export default function AssignedAdvocateMatterDesk({ caseId }) {
  const threadQuery = useCaseLawyerThread(caseId);
  const thread = threadQuery.data?.thread;
  const messagesQuery = useThreadMessages(thread?.id);
  const sendMessage = useSendThreadMessage();

  return (
    <section className='space-y-6 border-t border-border-light pt-6 dark:border-border-dark'>
      <div>
        <h2 className='text-xl font-bold text-text-primary-light dark:text-text-primary-dark'>My advocate work desk</h2>
        <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>
          You are the responsible advocate on this matter. These are advocate functions, separate from firm-owner administration.
        </p>
      </div>

      <ChatWorkspace
        title='Secretary coordination'
        subtitle='Private matter instructions with the assigned secretary. Client-facing communication remains secretary-mediated.'
        threads={thread ? [thread] : []}
        selectedThreadId={thread?.id}
        onSelectThread={() => {}}
        messages={messagesQuery.data?.messages || []}
        onSendMessage={(body) => sendMessage.mutateAsync({ threadId: thread.id, body })}
        isLoadingThreads={threadQuery.isLoading}
        isLoadingMessages={messagesQuery.isLoading}
        isSending={sendMessage.isPending}
        onRefresh={() => {
          threadQuery.refetch();
          messagesQuery.refetch();
        }}
        hideSingleThreadSidebarOnMobile
        emptyThreadMessage='Assign a secretary to begin matter coordination.'
      />

      <LawyerDocumentsPage caseId={caseId} compact />
    </section>
  );
}
