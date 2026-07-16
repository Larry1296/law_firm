import React from 'react';
import { useParams } from 'react-router-dom';

import StatsCard from '@/components/ui/StatsCard';
import SectionHeading from '@/components/ui/SectionHeading';
import BackLink from '@/components/ui/BackLink';
import Card from '@/components/ui/Card';
import { formatDate, formatDateTime } from '@/core/utils/dateFormatter';
import { displayEnum } from '@/core/utils/textFormatter';
import ChatWorkspace from '@/modules/communications/components/ChatWorkspace';
import {
  useCaseThread,
  useCaseMessages,
  useSendCaseMessage,
} from '@/modules/communications/hooks/useCommunications';

import { useClientCaseDetails } from '@/modules/client/cases/hooks/useClientCaseDetails';
import CaseProcedurePanels from '@/modules/cases/shared/CaseProcedurePanels';

export default function ClientCaseDetailsPage() {
  const { id } = useParams();

  const { caseData, loading, error } = useClientCaseDetails(id);
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
  const friendly = (value, fallback = 'N/A') =>
    value !== null && value !== undefined && value !== ''
      ? displayEnum(value)
      : fallback;
  const firstValue = (...values) =>
    values.find((value) => value !== null && value !== undefined && value !== '') || '';
  const pageTitle = safe(caseData.title, safe(caseData.case_number, 'Case Details'));
  const courtName = firstValue(caseData.court_name, caseData.court_station, caseData.registry);
  const courtLocation = firstValue(caseData.court_location, caseData.court_station, caseData.registry);
  const caseThread = caseThreadQuery.data?.thread;
  const caseThreads = caseThread ? [caseThread] : [];

  const handleSendCaseMessage = async (body) => {
    await sendCaseMessage.mutateAsync({ caseId: id, body });
  };

  return (
    <div className='space-y-6 p-4 md:p-6 animate-fadeIn'>
      <BackLink label='Back to Cases' fallbackPath='/client/cases' />

      <SectionHeading
        title={pageTitle}
        subtitle='Your legal matter overview'
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
              <strong>Firm:</strong> {safe(caseData.firm?.name, 'Not Set')}
            </p>
            <p>
              <strong>Firm Email:</strong> {safe(caseData.firm?.email, 'Not Set')}
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
          Court Registry
        </h3>

        <div className='grid gap-6 md:grid-cols-2'>
          <div className='space-y-2 text-text-primary-light dark:text-text-primary-dark'>
            <p><strong>Procedure:</strong> {friendly(caseData.procedure_track, 'Not Set')}</p>
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

        <div className='mt-4 grid gap-6 md:grid-cols-2'>
          <p><strong>eFiling Ref:</strong> {safe(caseData.efiling_reference, 'Not Set')}</p>
          <p><strong>CTS Ref:</strong> {safe(caseData.cts_reference, 'Not Set')}</p>
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
                  {party.is_our_client ? ' • Your Party' : ''}
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
          This is your case overview. You can track updates, documents, and
          legal progress as your firm works on your matter.
        </p>
      </Card>

      <ChatWorkspace
        title='Case Communication'
        subtitle='Secure communication for this legal matter.'
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
