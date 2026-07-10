import React from 'react';
import { useParams } from 'react-router-dom';

import StatsCard from '@/components/ui/StatsCard';
import SectionHeading from '@/components/ui/SectionHeading';
import BackLink from '@/components/ui/BackLink';
import Card from '@/components/ui/Card';
import { formatDateTime } from '@/core/utils/dateFormatter';
import ChatWorkspace from '@/modules/communications/components/ChatWorkspace';
import {
  useCaseThread,
  useCaseMessages,
  useSendCaseMessage,
} from '@/modules/communications/hooks/useCommunications';

import useSecretaryCaseDetails from '@/modules/staff/secretary/cases/hooks/useSecretaryCaseDetails';

export default function SecretaryCaseDetailsPage() {
  const { id } = useParams();

  const { caseData, loading, error } = useSecretaryCaseDetails(id);
  const caseThreadQuery = useCaseThread(id);
  const caseMessagesQuery = useCaseMessages(id);
  const sendCaseMessage = useSendCaseMessage();

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
  const pageTitle = safe(caseData.title, safe(caseData.case_number, 'Case Details'));
  const caseThread = caseThreadQuery.data?.thread;
  const caseThreads = caseThread ? [caseThread] : [];

  const handleSendCaseMessage = async (body) => {
    await sendCaseMessage.mutateAsync({ caseId: id, body });
  };

  return (
    <div className='space-y-6 p-4 md:p-6 animate-fadeIn'>
      <BackLink label='Back to Cases' fallbackPath='/staff/secretary/cases' />

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
              <strong>Status:</strong> {safe(caseData.status)}
            </p>
            <p>
              <strong>Priority:</strong> {safe(caseData.priority)}
            </p>
            <p>
              <strong>Type:</strong> {safe(caseData.case_type)}
            </p>
            <p>
              <strong>Court:</strong> {safe(caseData.court_name)}
            </p>
          </div>

          <div className='space-y-2 text-text-primary-light dark:text-text-primary-dark'>
            <p>
              <strong>Court Location:</strong> {safe(caseData.court_location)}
            </p>
            <p>
              <strong>Filing Date:</strong> {safe(caseData.filing_date)}
            </p>
            <p>
              <strong>Assigned Lawyer:</strong>{' '}
              {safe(caseData.assigned_lawyer?.full_name)}
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
          Client Information
        </h3>

        <div className='grid gap-6 md:grid-cols-2'>
          <div className='space-y-2 text-text-primary-light dark:text-text-primary-dark'>
            <p>
              <strong>Name:</strong> {safe(caseData.client?.full_name)}
            </p>
            <p>
              <strong>Email:</strong> {safe(caseData.client?.email)}
            </p>
            <p>
              <strong>Phone:</strong> {safe(caseData.client?.phone_number)}
            </p>
            <p>
              <strong>Type:</strong> {safe(caseData.client?.client_type)}
            </p>
            <p>
              <strong>Status:</strong> {safe(caseData.client?.lifecycle_status)}
            </p>
          </div>

          <div className='space-y-2 text-text-primary-light dark:text-text-primary-dark'>
            <p>
              <strong>Plaintiff:</strong> {safe(caseData.plaintiff)}
            </p>
            <p>
              <strong>Defendant:</strong> {safe(caseData.defendant)}
            </p>
          </div>
        </div>
      </Card>

      <div className='grid gap-4 sm:grid-cols-3'>
        <StatsCard title='Case Progress' value={caseData.stage_progress || 0} />
        <StatsCard title='Status' value={safe(caseData.status)} />
        <StatsCard title='Priority' value={safe(caseData.priority)} />
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
        subtitle='Case-specific client-firm communication thread.'
        threads={caseThreads}
        selectedThreadId={caseThread?.id}
        onSelectThread={() => {}}
        messages={caseMessagesQuery.data?.messages || []}
        onSendMessage={handleSendCaseMessage}
        isLoadingThreads={caseThreadQuery.isLoading}
        isLoadingMessages={caseMessagesQuery.isLoading}
        isSending={sendCaseMessage.isPending}
        onRefresh={() => {
          caseThreadQuery.refetch();
          caseMessagesQuery.refetch();
        }}
        emptyThreadMessage='No case communication thread yet.'
      />
    </div>
  );
}
