import { useEffect, useMemo, useState } from 'react';

import useAuth from '@/core/hooks/useAuth';
import ChatWorkspace from '@/modules/communications/components/ChatWorkspace';
import {
  useForwardMessageToLawyer,
  useForwardMessageToClient,
  useCaseLawyerThread,
  useSecretaryCaseThreads,
  useSendThreadMessage,
  useThreadMessages,
} from '@/modules/communications/hooks/useCommunications';
import StaffInternalChatPage from '@/modules/staff/common/pages/StaffInternalChatPage';

export default function SecretaryChat() {
  const { user } = useAuth() || {};
  const [view, setView] = useState('clients');
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [caseChannel, setCaseChannel] = useState('client');
  const threadsQuery = useSecretaryCaseThreads();
  const threads = useMemo(() => threadsQuery.data?.threads || [], [threadsQuery.data]);
  const messagesQuery = useThreadMessages(selectedThreadId);
  const selectedThread = threads.find((item) => String(item.id) === String(selectedThreadId));
  const selectedCaseId = selectedThread?.case?.id;
  const lawyerThreadQuery = useCaseLawyerThread(selectedCaseId);
  const lawyerThread = lawyerThreadQuery.data?.thread;
  const lawyerMessagesQuery = useThreadMessages(caseChannel === 'lawyer' ? lawyerThread?.id : null);
  const sendMessage = useSendThreadMessage();
  const forwardToLawyer = useForwardMessageToLawyer();
  const forwardToClient = useForwardMessageToClient();

  useEffect(() => {
    if (!selectedThreadId && threads.length) setSelectedThreadId(threads[0].id);
  }, [selectedThreadId, threads]);

  if (view === 'staff') {
    return (
      <div className='space-y-4 p-4 md:p-6'>
        <button type='button' className='rounded-xl border px-4 py-2 text-sm font-semibold' onClick={() => setView('clients')}>
          Back to client communication
        </button>
        <StaffInternalChatPage title='Secretary Staff Chat' subtitle='Private internal messages with admin.' />
      </div>
    );
  }

  return (
    <div className='space-y-4 p-4 md:p-6'>
      <div className='flex justify-end'>
        <button type='button' className='rounded-xl border px-4 py-2 text-sm font-semibold' onClick={() => setView('staff')}>
          Open internal staff chat
        </button>
      </div>
      <div className='flex flex-wrap gap-2 rounded-2xl border p-2 dark:border-border-dark'>
        <button type='button' onClick={() => setCaseChannel('client')} className={`rounded-xl px-4 py-2 text-sm font-semibold ${caseChannel === 'client' ? 'bg-brand-primary text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
          Client conversation
        </button>
        <button type='button' disabled={!selectedCaseId} onClick={() => setCaseChannel('lawyer')} className={`rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50 ${caseChannel === 'lawyer' ? 'bg-brand-primary text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
          Assigned advocate coordination
        </button>
      </div>
      {caseChannel === 'client' ? <ChatWorkspace
        title='Client–Firm Communication Desk'
        subtitle='You are the communication moderator. Reply to clients as the firm and forward client instructions to the assigned advocate where legal input is required.'
        threads={threads}
        selectedThreadId={selectedThreadId}
        onSelectThread={(thread) => setSelectedThreadId(thread.id)}
        messages={messagesQuery.data?.messages || []}
        onSendMessage={(body) => sendMessage.mutateAsync({ threadId: selectedThreadId, body })}
        isLoadingThreads={threadsQuery.isLoading}
        isLoadingMessages={messagesQuery.isLoading}
        isSending={sendMessage.isPending}
        onRefresh={() => threadsQuery.refetch()}
        emptyThreadMessage='No client matter conversations yet. A thread appears when the client writes or when you dispatch a matter communication.'
        getMessageActions={(message) => {
          const isClientMessage = !message.is_system_message && String(message.sender?.id) !== String(user?.id);
          if (!isClientMessage || message.has_been_forwarded) return [];
          return [{
            key: 'forward-lawyer',
            label: message.has_been_forwarded ? 'Forwarded to advocate' : 'Forward to advocate',
            disabled: forwardToLawyer.isPending || message.has_been_forwarded,
            onClick: () => forwardToLawyer.mutate({ messageId: message.id, caseId: selectedThread?.case?.id, threadId: selectedThreadId }),
          }];
        }}
      /> : <ChatWorkspace
        title={selectedThread?.case ? `${selectedThread.case.case_number} — Secretary and assigned advocate` : 'Assigned advocate coordination'}
        subtitle='Private case coordination. Forward the advocate’s approved response to the client conversation when ready.'
        threads={lawyerThread ? [lawyerThread] : []}
        selectedThreadId={lawyerThread?.id}
        onSelectThread={() => {}}
        messages={lawyerMessagesQuery.data?.messages || []}
        onSendMessage={(body) => sendMessage.mutateAsync({ threadId: lawyerThread.id, body })}
        isLoadingThreads={lawyerThreadQuery.isLoading}
        isLoadingMessages={lawyerMessagesQuery.isLoading}
        isSending={sendMessage.isPending}
        onRefresh={() => { lawyerThreadQuery.refetch(); lawyerMessagesQuery.refetch(); }}
        hideSingleThreadSidebarOnMobile
        emptyThreadMessage='Select a client case first.'
        getMessageActions={(message) => {
          const isAdvocateMessage = !message.is_system_message && String(message.sender?.id) !== String(user?.id);
          if (!isAdvocateMessage || message.has_been_forwarded) return [];
          return [{
            key: 'forward-client',
            label: message.has_been_forwarded ? 'Forwarded to client' : 'Forward to client',
            disabled: forwardToClient.isPending || message.has_been_forwarded,
            onClick: () => forwardToClient.mutate({ messageId: message.id, caseId: selectedCaseId, threadId: lawyerThread?.id }),
          }];
        }}
      />}
    </div>
  );
}
