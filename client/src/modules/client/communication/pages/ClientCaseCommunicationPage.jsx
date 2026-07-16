import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Briefcase, MessageCircle } from 'lucide-react';

import { getApiErrorMessage } from '@/core/utils/errorMessages';
import { useClientCases } from '@/modules/client/cases/hooks/useClientCases';
import ChatWorkspace from '@/modules/communications/components/ChatWorkspace';
import {
  useCaseMessages,
  useSendCaseMessage,
} from '@/modules/communications/hooks/useCommunications';

import Button3D from '@/components/ui/Button3D';
import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';

const toCaseThread = (caseItem) => ({
  id: caseItem.id,
  thread_type: 'CASE_CLIENT',
  subject: `${caseItem.case_number || 'Case'} - ${caseItem.title || 'Untitled case'}`,
    case: {
      id: caseItem.id,
      case_number: caseItem.case_number,
      title: caseItem.title,
      status: caseItem.status,
      client: caseItem.client,
      firm: caseItem.firm,
    },
  participants: [],
  unread_count: 0,
  can_reply: true,
  last_message_at: caseItem.updated_at || caseItem.created_at,
});

export default function ClientCaseCommunicationPage() {
  const params = useParams();
  const routeCaseId = params.id || params.caseId;

  const { data: cases = [], isLoading, refetch } = useClientCases();

  // ✅ Fix Warning 3 & 4 — wrap safeCases in useMemo for stable reference
  const safeCases = useMemo(() => (Array.isArray(cases) ? cases : []), [cases]);

  // ✅ Fix Errors 1 & 2 — derive selectedCaseId without useEffect
  // Priority: routeCaseId from URL → first case in list → null
  const defaultCaseId = useMemo(() => {
    if (routeCaseId) return routeCaseId;
    if (safeCases.length) return safeCases[0].id;
    return null;
  }, [routeCaseId, safeCases]);

  // Keep useState so the user can still manually change the selected case
  // via the dropdown, but initialise it from the derived default
  const [selectedCaseId, setSelectedCaseId] = useState(defaultCaseId);
  const [feedback, setFeedback] = useState(null);

  const threads = useMemo(() => safeCases.map(toCaseThread), [safeCases]);

  const selectedCase = useMemo(
    () => safeCases.find((c) => String(c.id) === String(selectedCaseId)),
    [safeCases, selectedCaseId],
  );

  const messagesQuery = useCaseMessages(selectedCaseId);
  const sendMessage = useSendCaseMessage();

  // ✅ Both useEffect blocks removed — no more cascading renders

  const handleSendMessage = async (body) => {
    setFeedback(null);
    try {
      await sendMessage.mutateAsync({ caseId: selectedCaseId, body });
    } catch (error) {
      setFeedback({
        type: 'error',
        text: getApiErrorMessage(error, 'Could not send message.'),
      });
      throw error;
    }
  };

  return (
    <div className='space-y-6 p-4 md:p-6 animate-fadeIn'>
      <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
        <SectionHeading
          title='Case Communication'
          subtitle='Send and receive case-related communication with the firm.'
        />
        <Button3D variant='outlineLight' onClick={refetch}>
          Refresh cases
        </Button3D>
      </div>

      <Card className='p-5'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <div className='flex items-start gap-3'>
            <div className='rounded-2xl bg-blue-50 p-3 text-blue-700 dark:bg-blue-950 dark:text-blue-200'>
              <MessageCircle size={22} />
            </div>
            <div>
              <h2 className='font-bold text-slate-900 dark:text-white'>
                One thread per case
              </h2>
              <p className='text-sm text-slate-500 dark:text-slate-300'>
                Each case has its own communication history with the firm.
              </p>
            </div>
          </div>

          <div className='flex min-w-full flex-col gap-2 md:min-w-[360px] md:flex-row lg:min-w-[460px]'>
            <select
              value={selectedCaseId || ''}
              onChange={(event) => setSelectedCaseId(event.target.value)}
              className='h-12 flex-1 rounded-2xl border border-border-light bg-white px-4 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-border-dark dark:bg-slate-900 dark:text-white'
            >
              <option value=''>Choose case</option>
              {safeCases.map((caseItem) => (
                <option key={caseItem.id} value={caseItem.id}>
                  {caseItem.case_number} — {caseItem.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedCase && (
          <div className='mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-900 md:grid-cols-3'>
            <div>
              <p className='text-slate-500 dark:text-slate-300'>Case</p>
              <p className='font-semibold text-slate-900 dark:text-white'>
                {selectedCase.case_number}
              </p>
            </div>
            <div>
              <p className='text-slate-500 dark:text-slate-300'>Status</p>
              <p className='font-semibold text-slate-900 dark:text-white'>
                {selectedCase.status || 'N/A'}
              </p>
            </div>
            <div>
              <p className='text-slate-500 dark:text-slate-300'>Priority</p>
              <p className='font-semibold text-slate-900 dark:text-white'>
                {selectedCase.priority || 'N/A'}
              </p>
            </div>
          </div>
        )}

        {feedback && (
          <div className='mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200'>
            {feedback.text}
          </div>
        )}
      </Card>

      {isLoading ? (
        <Card className='p-6 text-sm text-slate-500'>Loading cases...</Card>
      ) : safeCases.length ? (
        <ChatWorkspace
          title='Messages'
          subtitle='Choose a case and communicate with the firm about that matter.'
          threads={threads}
          selectedThreadId={selectedCaseId}
          onSelectThread={(thread) => setSelectedCaseId(thread.id)}
          messages={messagesQuery.data?.messages || []}
          onSendMessage={handleSendMessage}
          isLoadingThreads={isLoading}
          isLoadingMessages={messagesQuery.isLoading}
          isSending={sendMessage.isPending}
          emptyThreadMessage='No cases available for communication.'
        />
      ) : (
        <Card className='p-6 text-center text-slate-500 dark:text-slate-300'>
          <Briefcase size={38} className='mx-auto mb-3 opacity-50' />
          <p className='font-semibold'>No cases available</p>
          <p className='text-sm'>
            Case communication will appear when your firm opens a case for you.
          </p>
        </Card>
      )}
    </div>
  );
}
