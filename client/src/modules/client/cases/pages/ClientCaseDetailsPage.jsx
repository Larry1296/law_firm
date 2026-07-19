import React from 'react';
import { Link, useParams } from 'react-router-dom';

import StatsCard from '@/components/ui/StatsCard';
import SectionHeading from '@/components/ui/SectionHeading';
import BackLink from '@/components/ui/BackLink';
import Button3D from '@/components/ui/Button3D';
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
import CaseCourtroomPanel from '@/modules/courtroom/components/CaseCourtroomPanel';

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
  const courtProceeding = caseData.court_proceeding || {};
  const officialCourtNumber = firstValue(caseData.official_court_case_number, courtProceeding.official_court_case_number);
  const courtStage = firstValue(caseData.court_stage_label, caseData.court_stage, courtProceeding.court_stage);
  const matterStatus = firstValue(caseData.matter_status_label, caseData.matter_status);
  const courtName = firstValue(caseData.court_name, courtProceeding.court_name, caseData.court_station, courtProceeding.court_station, caseData.registry, courtProceeding.registry);
  const courtLocation = firstValue(caseData.court_location, courtProceeding.court_location, caseData.court_station, courtProceeding.court_station, caseData.registry, courtProceeding.registry);
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

      <div className='md:hidden'>
        <Link to={`/client/cases/${id}/communication`}>
          <Button3D className='w-full justify-center'>
            Open case communication
          </Button3D>
        </Link>
      </div>

      <Card className='p-6'>
        <div className='grid gap-6 md:grid-cols-2'>
          <div className='space-y-2 text-text-primary-light dark:text-text-primary-dark'>
            <p>
              <strong>Internal Matter Number:</strong> {safe(caseData.internal_case_number || caseData.case_number)}
            </p>
            <p>
              <strong>Official Court Case Number:</strong> {safe(officialCourtNumber, 'Not recorded')}
            </p>
            <p>
              <strong>Title:</strong> {safe(caseData.title)}
            </p>
            <p>
              <strong>Matter Status:</strong> {safe(matterStatus, 'Not recorded')}
            </p>
            <p>
              <strong>Court Stage:</strong> {safe(courtStage, 'Not recorded')}
            </p>
            <p>
              <strong>Priority:</strong> {friendly(caseData.priority)}
            </p>
            <p>
              <strong>Practice Area:</strong> {safe(caseData.practice_area_label || friendly(caseData.practice_area), friendly(caseData.case_type))}
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
              <strong>Filing Date:</strong> {firstValue(caseData.filing_date, courtProceeding.filing_date) ? formatDate(firstValue(caseData.filing_date, courtProceeding.filing_date)) : 'Not Set'}
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
            <p><strong>Procedure:</strong> {safe(caseData.procedure_type_label || friendly(caseData.procedure_type || caseData.procedure_track), 'Not Set')}</p>
            <p><strong>Court Division:</strong> {friendly(firstValue(caseData.court_division, courtProceeding.division), 'Not Set')}</p>
            <p><strong>Court Station:</strong> {safe(firstValue(caseData.court_station, courtProceeding.court_station), 'Not Set')}</p>
            <p><strong>Registry:</strong> {safe(firstValue(caseData.registry, courtProceeding.registry), 'Not Set')}</p>
          </div>
          <div className='space-y-2 text-text-primary-light dark:text-text-primary-dark'>
            <p><strong>Courtroom:</strong> {safe(firstValue(caseData.courtroom, courtProceeding.courtroom), 'Not Set')}</p>
            <p><strong>Judicial Officer:</strong> {safe(firstValue(caseData.judicial_officer, courtProceeding.judicial_officer), 'Not Set')}</p>
            <p><strong>Next Court Date:</strong> {caseData.next_court_date ? formatDateTime(caseData.next_court_date) : 'Not Set'}</p>
            <p><strong>Next Action:</strong> {safe(caseData.next_action, 'Not Set')}</p>
          </div>
        </div>

        <div className='mt-4 grid gap-6 md:grid-cols-2'>
          <p><strong>eFiling Ref:</strong> {safe(firstValue(caseData.efiling_reference, courtProceeding.efiling_reference), 'Not Set')}</p>
          <p><strong>Payment Ref:</strong> {safe(firstValue(caseData.payment_reference, courtProceeding.payment_reference), 'Not Set')}</p>
          <p><strong>CTS Ref:</strong> {safe(firstValue(caseData.cts_reference, courtProceeding.cts_reference), 'Pending verification')}</p>
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
                  {party.is_our_client ? ' • Your Party' : party.is_adverse ? ' • Other Party' : ''}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className='text-text-muted-light dark:text-text-muted-dark'>No structured party records yet.</p>
        )}
      </Card>

      <CaseProcedurePanels caseData={caseData} />

      <CaseCourtroomPanel
        caseId={id}
        title='Case Courtroom'
        emptyMessage='Your firm has not attached a courtroom session to this case yet.'
      />

      <div className='grid gap-4 sm:grid-cols-3'>
        <StatsCard title='Events' value={caseData.analytics?.events_count || 0} />
        <StatsCard title='Status' value={safe(matterStatus, friendly(caseData.status))} />
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

      <div className='hidden md:block'>
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
          hideSingleThreadSidebarOnMobile
        />
      </div>
    </div>
  );
}
