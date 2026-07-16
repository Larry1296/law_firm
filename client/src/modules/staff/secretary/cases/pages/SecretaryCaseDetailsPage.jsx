import React from 'react';
import { useParams } from 'react-router-dom';

import StatsCard from '@/components/ui/StatsCard';
import SectionHeading from '@/components/ui/SectionHeading';
import BackLink from '@/components/ui/BackLink';
import Card from '@/components/ui/Card';
import useAuth from '@/core/hooks/useAuth';
import { formatDate, formatDateTime } from '@/core/utils/dateFormatter';
import { displayEnum } from '@/core/utils/textFormatter';
import ChatWorkspace from '@/modules/communications/components/ChatWorkspace';
import {
  useCaseMessages,
  useCaseLawyerThread,
  useCaseThread,
  useForwardMessageToClient,
  useForwardMessageToLawyer,
  useSendCaseMessage,
  useThreadMessages,
  useSendThreadMessage,
} from '@/modules/communications/hooks/useCommunications';

import useSecretaryCaseDetails from '@/modules/staff/secretary/cases/hooks/useSecretaryCaseDetails';
import CaseProcedurePanels from '@/modules/cases/shared/CaseProcedurePanels';

export default function SecretaryCaseDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth() || {};

  const { caseData, loading, error } = useSecretaryCaseDetails(id);
  const clientThreadQuery = useCaseThread(id);
  const clientThread = clientThreadQuery.data?.thread;
  const clientMessagesQuery = useCaseMessages(id);
  const sendCaseMessage = useSendCaseMessage();
  const lawyerThreadQuery = useCaseLawyerThread(id);
  const lawyerThread = lawyerThreadQuery.data?.thread;
  const lawyerMessagesQuery = useThreadMessages(lawyerThread?.id);
  const sendThreadMessage = useSendThreadMessage();
  const forwardToLawyer = useForwardMessageToLawyer();
  const forwardToClient = useForwardMessageToClient();

  if (loading) {
    return (
      <div className='p-6 text-text-primary-light dark:text-text-primary-dark'>
        <p>Loading case details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='p-6 text-error'>
        <p>Failed to load case details.</p>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className='p-6 text-text-primary-light dark:text-text-primary-dark'>
        <p>Case not found.</p>
      </div>
    );
  }

  const safe = (value, fallback = 'N/A') =>
    value !== null && value !== undefined && value !== '' ? value : fallback;
  const friendly = (value, fallback = 'N/A') =>
    value !== null && value !== undefined && value !== ''
      ? displayEnum(value)
      : fallback;
  const firstValue = (...values) =>
    values.find((value) => value !== null && value !== undefined && value !== '') || '';
  const pageTitle = safe(caseData.title, safe(caseData.case_number, 'Case Details'));
  const courtName = firstValue(caseData.court_name, caseData.court_station, caseData.registry);
  const courtLocation = firstValue(caseData.court_location, caseData.court_station, caseData.registry);
  const clientThreads = clientThread ? [clientThread] : [];
  const lawyerThreads = lawyerThread ? [lawyerThread] : [];

  const handleSendClientMessage = async (body) => {
    await sendCaseMessage.mutateAsync({ caseId: id, body });
  };

  const handleSendLawyerMessage = async (body) => {
    if (!lawyerThread?.id) return;
    await sendThreadMessage.mutateAsync({ threadId: lawyerThread.id, body });
  };

  const handleForwardToLawyer = async (message) => {
    await forwardToLawyer.mutateAsync({
      messageId: message.id,
      caseId: id,
      threadId: lawyerThread?.id,
    });
    lawyerThreadQuery.refetch();
    lawyerMessagesQuery.refetch();
  };

  const handleForwardToClient = async (message) => {
    await forwardToClient.mutateAsync({
      messageId: message.id,
      caseId: id,
      threadId: lawyerThread?.id,
    });
    clientMessagesQuery.refetch();
  };

  const getClientMessageActions = (message) => {
    const isForwardableClientMessage =
      message.sender?.role === 'OFFICIAL_CLIENT' &&
      !message.is_forwarded &&
      !message.has_been_forwarded;

    if (!isForwardableClientMessage) {
      return [];
    }

    return [
      {
        key: `forward-lawyer-${message.id}`,
        label: forwardToLawyer.isPending ? 'Forwarding...' : 'Forward to lawyer',
        disabled: forwardToLawyer.isPending,
        onClick: () => handleForwardToLawyer(message),
      },
    ];
  };

  const getLawyerMessageActions = (message) => {
    const isForwardableLawyerResponse =
      message.sender?.role !== 'OFFICIAL_CLIENT' &&
      String(message.sender?.id) !== String(user?.id) &&
      !message.is_forwarded &&
      !message.has_been_forwarded &&
      message.forward_direction !== 'TO_LAWYER';

    if (!isForwardableLawyerResponse) {
      return [];
    }

    return [
      {
        key: `forward-client-${message.id}`,
        label: forwardToClient.isPending ? 'Forwarding...' : 'Forward to client',
        disabled: forwardToClient.isPending,
        onClick: () => handleForwardToClient(message),
      },
    ];
  };

  return (
    <div className='space-y-6 p-4 md:p-6 animate-fadeIn'>
      <BackLink label='Back to Cases' fallbackPath='/secretary/cases' />

      <SectionHeading
        title={pageTitle}
        subtitle='Assigned legal matter overview'
      />

      <Card className='p-6'>
        <div className='grid gap-6 md:grid-cols-2'>
          <div className='space-y-2 text-text-primary-light dark:text-text-primary-dark'>
            <p>
              <strong>Case Number:</strong> {safe(caseData.case_number)}
            </p>
            <p>
              <strong>Title:</strong> {safe(caseData.title)}
            </p>
            <p>
              <strong>Status:</strong> {friendly(caseData.status)}
            </p>
            <p>
              <strong>Priority:</strong> {friendly(caseData.priority)}
            </p>
            <p>
              <strong>Type:</strong> {friendly(caseData.case_type)}
            </p>
            <p>
              <strong>Court:</strong> {safe(courtName, 'Not Set')}
            </p>
          </div>

          <div className='space-y-2 text-text-primary-light dark:text-text-primary-dark'>
            <p>
              <strong>Court Location:</strong> {safe(courtLocation, 'Not Set')}
            </p>
            <p>
              <strong>Filing Date:</strong> {caseData.filing_date ? formatDate(caseData.filing_date) : 'Not Set'}
            </p>
            <p>
              <strong>Assigned Lawyer:</strong>{' '}
              {safe(caseData.assigned_lawyer?.full_name, 'Not Assigned')}
            </p>
            <p>
              <strong>Created:</strong> {formatDateTime(caseData.created_at)}
            </p>
            <p>
              <strong>Updated:</strong> {formatDateTime(caseData.updated_at)}
            </p>
          </div>
        </div>

        <div className='mt-6'>
          <p className='font-semibold text-text-primary-light dark:text-text-primary-dark'>
            Description
          </p>
          <p className='mt-2 text-text-muted-light dark:text-text-muted-dark'>
            {safe(caseData.description)}
          </p>
        </div>
      </Card>

      <Card className='p-6'>
        <h3 className='mb-4 text-lg font-semibold text-text-primary-light dark:text-text-primary-dark'>
          Kenyan Court Registry
        </h3>

        <div className='grid gap-6 md:grid-cols-2'>
          <div className='space-y-2 text-text-primary-light dark:text-text-primary-dark'>
            <p><strong>Procedure Track:</strong> {friendly(caseData.procedure_track, 'Not Set')}</p>
            <p><strong>Court Division:</strong> {friendly(caseData.court_division, 'Not Set')}</p>
            <p><strong>Court Station:</strong> {safe(caseData.court_station, 'Not Set')}</p>
            <p><strong>Registry:</strong> {safe(caseData.registry, 'Not Set')}</p>
          </div>
          <div className='space-y-2 text-text-primary-light dark:text-text-primary-dark'>
            <p><strong>Courtroom:</strong> {safe(caseData.courtroom, 'Not Set')}</p>
            <p><strong>Judicial Officer:</strong> {safe(caseData.judicial_officer, 'Not Set')}</p>
            <p><strong>Next Court Date:</strong> {caseData.next_court_date ? formatDateTime(caseData.next_court_date) : 'Not Set'}</p>
            <p><strong>Next Action:</strong> {safe(caseData.next_action, 'Not Set')}</p>
          </div>
        </div>

        <div className='mt-4 grid gap-6 md:grid-cols-3'>
          <p><strong>eFiling Ref:</strong> {safe(caseData.efiling_reference, 'Not Set')}</p>
          <p><strong>CTS Ref:</strong> {safe(caseData.cts_reference, 'Not Set')}</p>
          <p><strong>Payment Ref:</strong> {safe(caseData.payment_reference, 'Not Set')}</p>
        </div>
      </Card>

      <Card className='p-6'>
        <h3 className='mb-4 text-lg font-semibold text-text-primary-light dark:text-text-primary-dark'>
          Parties
        </h3>

        {caseData.parties?.length ? (
          <div className='grid gap-4 md:grid-cols-2'>
            {caseData.parties.map((party) => (
              <div key={party.id} className='rounded-xl border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark'>
                <p className='font-semibold text-text-primary-light dark:text-text-primary-dark'>{safe(party.name)}</p>
                <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>
                  {party.role_label || friendly(party.party_role)}
                  {party.is_our_client ? ' • Firm Client' : ''}
                </p>
                <p className='mt-2 text-sm text-text-muted-light dark:text-text-muted-dark'>
                  {safe(party.email)} {party.phone_number ? `• ${party.phone_number}` : ''}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className='text-text-muted-light dark:text-text-muted-dark'>No structured party records yet.</p>
        )}
      </Card>

      <CaseProcedurePanels caseData={caseData} />

      <div className='grid gap-4 sm:grid-cols-3'>
        <StatsCard title='Case Progress' value={caseData.stage_progress || 0} />
        <StatsCard title='Status' value={friendly(caseData.status)} />
        <StatsCard title='Priority' value={friendly(caseData.priority)} />
      </div>

      <Card className='p-6'>
        <h3 className='text-lg font-semibold text-text-primary-light dark:text-text-primary-dark'>
          Case Overview
        </h3>

        <p className='mt-2 text-text-muted-light dark:text-text-muted-dark'>
          This case is currently being handled by the assigned legal team. All
          updates, filings, and communications will be reflected here as they
          are recorded in the system.
        </p>
      </Card>

      <ChatWorkspace
        title='Client Case Communication'
        subtitle='Case-attached communication with the client or represented party, sent from the firm.'
        threads={clientThreads}
        selectedThreadId={clientThread?.id}
        onSelectThread={() => {}}
        messages={clientMessagesQuery.data?.messages || []}
        onSendMessage={handleSendClientMessage}
        isLoadingThreads={clientThreadQuery.isLoading}
        isLoadingMessages={clientMessagesQuery.isLoading}
        isSending={sendCaseMessage.isPending}
        onRefresh={() => {
          clientThreadQuery.refetch();
          clientMessagesQuery.refetch();
        }}
        emptyThreadMessage='No client communication thread yet.'
        getMessageActions={getClientMessageActions}
      />

      <ChatWorkspace
        title='Assigned Lawyer Coordination'
        subtitle='Internal case chat with the assigned lawyer.'
        threads={lawyerThreads}
        selectedThreadId={lawyerThread?.id}
        onSelectThread={() => {}}
        messages={lawyerMessagesQuery.data?.messages || []}
        onSendMessage={handleSendLawyerMessage}
        isLoadingThreads={lawyerThreadQuery.isLoading}
        isLoadingMessages={lawyerMessagesQuery.isLoading}
        isSending={sendThreadMessage.isPending}
        onRefresh={() => {
          lawyerThreadQuery.refetch();
          lawyerMessagesQuery.refetch();
        }}
        emptyThreadMessage='No assigned lawyer coordination thread yet.'
        getMessageActions={getLawyerMessageActions}
      />
    </div>
  );
}
