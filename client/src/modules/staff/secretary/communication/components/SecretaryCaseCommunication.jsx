import { useState } from 'react';

import useAuth from '@/core/hooks/useAuth';
import ChatWorkspace from '@/modules/communications/components/ChatWorkspace';
import {
  useCaseLawyerThread,
  useCaseThread,
  useForwardMessageToClient,
  useForwardMessageToLawyer,
  useSendThreadMessage,
  useThreadMessages,
} from '@/modules/communications/hooks/useCommunications';

export default function SecretaryCaseCommunication({ caseId, caseNumber, hasAssignedLawyer }) {
  const { user } = useAuth() || {};
  const [channel, setChannel] = useState('client');
  const clientThreadQuery = useCaseThread(caseId);
  const clientThread = clientThreadQuery.data?.thread;
  const lawyerThreadQuery = useCaseLawyerThread(hasAssignedLawyer ? caseId : null);
  const lawyerThread = lawyerThreadQuery.data?.thread;
  const activeThread = channel === 'client' ? clientThread : lawyerThread;
  const messagesQuery = useThreadMessages(activeThread?.id);
  const sendMessage = useSendThreadMessage();
  const forwardToLawyer = useForwardMessageToLawyer();
  const forwardToClient = useForwardMessageToClient();

  const getMessageActions = (message) => {
    const isOtherSender = !message.is_system_message
      && String(message.sender?.id) !== String(user?.id);
    if (!isOtherSender || message.has_been_forwarded) return [];

    if (channel === 'client') {
      return [{
        key: 'forward-lawyer',
        label: 'Forward to advocate',
        disabled: forwardToLawyer.isPending,
        onClick: () => forwardToLawyer.mutate({
          messageId: message.id,
          caseId,
          threadId: clientThread?.id,
        }),
      }];
    }

    return [{
      key: 'forward-client',
      label: 'Forward to client',
      disabled: forwardToClient.isPending,
      onClick: () => forwardToClient.mutate({
        messageId: message.id,
        caseId,
        threadId: lawyerThread?.id,
      }),
    }];
  };

  return (
    <section className='space-y-3'>
      <div className='flex flex-wrap gap-2 border-b border-border-light pb-2 dark:border-border-dark'>
        <button
          type='button'
          onClick={() => setChannel('client')}
          className={`px-4 py-2 text-sm font-semibold ${channel === 'client' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-slate-600 dark:text-slate-300'}`}
        >
          Client conversation
        </button>
        <button
          type='button'
          disabled={!hasAssignedLawyer}
          onClick={() => setChannel('lawyer')}
          className={`px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${channel === 'lawyer' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-slate-600 dark:text-slate-300'}`}
        >
          Assigned advocate coordination
        </button>
      </div>

      <ChatWorkspace
        title={channel === 'client' ? `${caseNumber} — Client communication` : `${caseNumber} — Advocate coordination`}
        subtitle={channel === 'client'
          ? 'Reply as the firm and forward client instructions to the assigned advocate when legal input is required.'
          : 'Private case coordination with the assigned advocate. Forward only an approved response to the client.'}
        threads={activeThread ? [activeThread] : []}
        selectedThreadId={activeThread?.id}
        onSelectThread={() => {}}
        messages={messagesQuery.data?.messages || []}
        onSendMessage={(body) => sendMessage.mutateAsync({ threadId: activeThread.id, body })}
        isLoadingThreads={channel === 'client' ? clientThreadQuery.isLoading : lawyerThreadQuery.isLoading}
        isLoadingMessages={messagesQuery.isLoading}
        isSending={sendMessage.isPending}
        onRefresh={() => {
          if (channel === 'client') clientThreadQuery.refetch();
          else lawyerThreadQuery.refetch();
          messagesQuery.refetch();
        }}
        hideSingleThreadSidebarOnMobile
        emptyThreadMessage={hasAssignedLawyer || channel === 'client'
          ? 'Preparing the matter conversation…'
          : 'An advocate must be assigned before private coordination can begin.'}
        getMessageActions={getMessageActions}
      />
    </section>
  );
}
