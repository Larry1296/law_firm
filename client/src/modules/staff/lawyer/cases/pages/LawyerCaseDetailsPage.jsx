import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Swal from '@/core/utils/themedSwal';

import StatsCard from '@/components/ui/StatsCard';
import SectionHeading from '@/components/ui/SectionHeading';
import BackLink from '@/components/ui/BackLink';
import Card from '@/components/ui/Card';
import { formatDate, formatDateTime } from '@/core/utils/dateFormatter';
import { displayEnum } from '@/core/utils/textFormatter';
import ChatWorkspace from '@/modules/communications/components/ChatWorkspace';
import {
  useCaseLawyerThread,
  useSendThreadMessage,
  useThreadMessages,
} from '@/modules/communications/hooks/useCommunications';

import axiosInstance from '@/core/api/axios';

import {
  useMyCase,
  useUpdateCaseStatus,
  useUpdateLifecycleTransition,
} from '@/modules/staff/lawyer/cases/hooks/useLawyerCases';
import CaseProcedurePanels from '@/modules/cases/shared/CaseProcedurePanels';
import CaseCourtroomPanel from '@/modules/courtroom/components/CaseCourtroomPanel';

const CASE_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending Review' },
  { value: 'PENDING_FILING', label: 'Pending Filing' },
  { value: 'FILED', label: 'Filed in Court' },
  { value: 'SERVICE_PENDING', label: 'Service Pending' },
  { value: 'SERVED', label: 'Served' },
  { value: 'AWAITING_RESPONSE', label: 'Awaiting Response' },
  { value: 'MENTION', label: 'Mention' },
  { value: 'DIRECTIONS', label: 'Directions' },
  { value: 'PRE_TRIAL', label: 'Pre-Trial' },
  { value: 'MEDIATION', label: 'Mediation' },
  { value: 'HEARING', label: 'Hearing' },
  { value: 'SUBMISSIONS', label: 'Submissions' },
  { value: 'AWAITING_RULING', label: 'Awaiting Ruling' },
  { value: 'AWAITING_JUDGMENT', label: 'Awaiting Judgment' },
  { value: 'JUDGMENT_DELIVERED', label: 'Judgment Delivered' },
  { value: 'DECREE_EXTRACTION', label: 'Decree Extraction' },
  { value: 'EXECUTION', label: 'Execution' },
  { value: 'APPEAL_WINDOW', label: 'Appeal Window' },
  { value: 'NOTICE_OF_APPEAL_FILED', label: 'Notice of Appeal Filed' },
  { value: 'ON_APPEAL', label: 'On Appeal' },
  { value: 'APPEAL_DECIDED', label: 'Appeal Decided' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'SETTLED', label: 'Settled' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
  { value: 'DISMISSED', label: 'Dismissed' },
  { value: 'CLOSED', label: 'Closed' },
];

const EVENT_TYPE_OPTIONS = [
  { value: 'MENTION', label: 'Mention' },
  { value: 'HEARING', label: 'Hearing' },
  { value: 'DIRECTIONS', label: 'Directions' },
  { value: 'PRE_TRIAL', label: 'Pre-Trial Conference' },
  { value: 'MEDIATION', label: 'Mediation' },
  { value: 'SUBMISSIONS', label: 'Submissions' },
  { value: 'RULING', label: 'Ruling' },
  { value: 'JUDGMENT', label: 'Judgment' },
  { value: 'EXECUTION', label: 'Execution' },
  { value: 'REGISTRY_ACTION', label: 'Registry Action' },
  { value: 'CLIENT_MEETING', label: 'Client Meeting' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_EVENT_TYPE = {
  PENDING_FILING: 'REGISTRY_ACTION',
  FILED: 'REGISTRY_ACTION',
  SERVICE_PENDING: 'REGISTRY_ACTION',
  AWAITING_RESPONSE: 'REGISTRY_ACTION',
  MENTION: 'MENTION',
  DIRECTIONS: 'DIRECTIONS',
  PRE_TRIAL: 'PRE_TRIAL',
  MEDIATION: 'MEDIATION',
  HEARING: 'HEARING',
  SUBMISSIONS: 'SUBMISSIONS',
  AWAITING_RULING: 'RULING',
  AWAITING_JUDGMENT: 'JUDGMENT',
  DECREE_EXTRACTION: 'REGISTRY_ACTION',
  EXECUTION: 'EXECUTION',
  APPEAL_WINDOW: 'REGISTRY_ACTION',
  NOTICE_OF_APPEAL_FILED: 'REGISTRY_ACTION',
  ON_APPEAL: 'MENTION',
  APPEAL_DECIDED: 'JUDGMENT',
  IN_PROGRESS: 'OTHER',
  ON_HOLD: 'OTHER',
};

const TERMINAL_STATUSES = new Set(['SETTLED', 'WITHDRAWN', 'DISMISSED', 'CLOSED']);

const toIsoDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};

export default function LawyerCaseDetailsPage() {
  const { id } = useParams();

  const { data, isLoading, error } = useMyCase(id);
  const lawyerThreadQuery = useCaseLawyerThread(id);
  const lawyerThread = lawyerThreadQuery.data?.thread;
  const lawyerMessagesQuery = useThreadMessages(lawyerThread?.id);
  const sendThreadMessage = useSendThreadMessage();
  const updateStatus = useUpdateCaseStatus(id);
  const updateLifecycle = useUpdateLifecycleTransition(id);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [nextEvent, setNextEvent] = useState({
    event_type: 'OTHER',
    title: '',
    starts_at: '',
    court_station: '',
    courtroom: '',
    judicial_officer: '',
    description: '',
    is_client_visible: true,
  });

  useEffect(() => {
    // Initialize from current lifecycle state if needed; dropdown starts empty
    // and lawyer selects the next available transition from available_transitions.
    setSelectedStatus('');
  }, [data]);

  useEffect(() => {
    if (!selectedStatus || !data) return;
    const eventType = STATUS_EVENT_TYPE[selectedStatus] || 'OTHER';
    const statusLabel = CASE_STATUS_OPTIONS.find((item) => item.value === selectedStatus)?.label || 'Next Event';
    setNextEvent((current) => ({
      ...current,
      event_type: eventType,
      title: current.title && current.starts_at ? current.title : `${statusLabel} - ${data.case_number}`,
      court_station: current.court_station || data.court_station || data.court_name || '',
      courtroom: current.courtroom || data.courtroom || '',
      judicial_officer: current.judicial_officer || data.judicial_officer || '',
    }));
  }, [data, selectedStatus]);

  if (isLoading) {
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

  if (!data) {
    return (
      <div className='p-6 text-text-primary-light dark:text-text-primary-dark'>
        <p>Case not found.</p>
      </div>
    );
  }

  const caseData = data;

  if (!caseData) {
    return (
      <div className='p-6 text-text-primary-light dark:text-text-primary-dark'>
        <p>Case not found.</p>
      </div>
    );
  }

  const analytics = caseData?.analytics ?? {};
  const timeline = caseData?.timeline ?? [];
  const events = caseData?.events ?? [];
  const documents = caseData?.documents ?? [];

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
  const lawyerThreads = lawyerThread ? [lawyerThread] : [];

  const handleSendLawyerMessage = async (body) => {
    if (!lawyerThread?.id) return;
    await sendThreadMessage.mutateAsync({ threadId: lawyerThread.id, body });
  };

  const handleStatusUpdate = async () => {
    if (!selectedStatus || selectedStatus === '') return;

    // Parse lifecycle transition format: DIMENSION:TO_STATE
    const [dimension, toState] = selectedStatus.split(':');
    if (!dimension || !toState) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Selection',
        text: 'Please select a valid lifecycle transition from the dropdown.',
      });
      return;
    }

    try {
      const payload = {
        dimension,
        to_state: toState,
        reason: statusNote || `Lifecycle transition to ${toState}`,
        metadata: {},
      };
      await updateLifecycle.mutateAsync(payload);

      // Trigger event execution if event data was entered
      if (nextEvent.starts_at) {
        const eventPayload = {
          case_id: id,
          event_type: nextEvent.event_type || 'OTHER',
          title: nextEvent.title || `Next Event - ${data.case_number}`,
          description: nextEvent.description || '',
          starts_at: toIsoDateTime(nextEvent.starts_at),
          court_station: nextEvent.court_station || data.court_station || '',
          courtroom: nextEvent.courtroom || data.courtroom || '',
          judicial_officer: nextEvent.judicial_officer || data.judicial_officer || '',
          is_client_visible: nextEvent.is_client_visible,
        };
        try {
          await axiosInstance.post(`/cases/${id}/events/`, eventPayload);
        } catch (evtError) {
          console.error('Event execution failed:', evtError);
        }
      }
      setStatusNote('');
      setSelectedStatus('');
      await Swal.fire({
        icon: 'success',
        title: 'Case Updated',
        text: 'The lifecycle transition has been applied and audit recorded.',
        timer: 1600,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Lifecycle Update Failed',
        text: error?.response?.data?.detail || error?.message || 'Could not apply transition.',
      });
    }
  };

  return (
    <div className='space-y-6 p-4 md:p-6 animate-fadeIn'>
      <BackLink label='Back to Cases' fallbackPath='/lawyer/cases' />

      <SectionHeading
        title={pageTitle}
        subtitle='Your assigned legal matter overview'
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
              <strong>Status:</strong> {friendly(caseData.matter_status)} ({friendly(caseData.court_stage)})
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
              {safe(caseData.assigned_lawyer?.full_name)}
            </p>
            <p>
              <strong>Assigned Secretary:</strong>{' '}
              {safe(caseData.assigned_secretary?.full_name, 'Not Assigned')}
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

      <CaseCourtroomPanel
        caseId={id}
        title='Case Courtroom'
        emptyMessage='No courtroom session has been attached to this assigned case yet.'
      />

      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <StatsCard
          title='Timeline Items'
          value={analytics.timeline_count || 0}
        />
        <StatsCard title='Events' value={analytics.events_count || 0} />
        <StatsCard title='Documents' value={analytics.documents_count || 0} />
        <StatsCard
          title='Activity Score'
          value={analytics.activity_score || 0}
        />
      </div>

      <div className='grid gap-4 sm:grid-cols-3'>
        <StatsCard title='Age (Days)' value={analytics.age_days || 0} />
        <StatsCard
          title='Has Events'
          value={analytics.has_events ? 'Yes' : 'No'}
        />
        <StatsCard
          title='Has Documents'
          value={analytics.has_documents ? 'Yes' : 'No'}
        />
      </div>

      <Card className='p-6'>
        <h3 className='mb-4 text-lg font-semibold text-text-primary-light dark:text-text-primary-dark'>
          Case Status
        </h3>

        <div className='grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end'>
          <div>
            <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
              Current Status
            </label>
            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
              className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light shadow-soft transition focus:border-brand-primary focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
            >
              <option value=''>Select lifecycle transition...</option>
              {(caseData?.available_transitions || [])
                .filter((t) => t.dimension === 'MATTER_STATUS')
                .map((t) => (
                  <option key={`${t.dimension}:${t.to_state}`} value={`${t.dimension}:${t.to_state}`}>
                    {t.label || `${t.dimension} → ${t.to_state}`}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
              Status Note
            </label>
            <input
              value={statusNote}
              onChange={(event) => setStatusNote(event.target.value)}
              placeholder='Optional update note'
              className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light shadow-soft transition placeholder:text-text-muted-light focus:border-brand-primary focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark dark:placeholder:text-text-muted-dark'
            />
          </div>

          <button
            type='button'
            onClick={handleStatusUpdate}
            disabled={
              updateLifecycle.isPending ||
              !selectedStatus ||
              selectedStatus === ''
            }
            className='rounded-xl bg-brand-primary px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
          >
            {updateLifecycle.isPending ? 'Updating...' : 'Apply Lifecycle Transition'}
          </button>
        </div>

        <div className='mt-6 border-t border-border-light pt-6 dark:border-border-dark'>
          <div className='mb-4'>
            <h4 className='text-base font-semibold text-text-primary-light dark:text-text-primary-dark'>
              Next Event
            </h4>
            <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>
              Active lifecycle updates should include the next date the firm, client, or court must act on.
            </p>
          </div>

          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
            <div>
              <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                Event Type
              </label>
              <select
                value={nextEvent.event_type}
                onChange={(event) => setNextEvent((current) => ({ ...current, event_type: event.target.value }))}
                className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light shadow-soft transition focus:border-brand-primary focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
              >
                {EVENT_TYPE_OPTIONS.map((eventType) => (
                  <option key={eventType.value} value={eventType.value}>
                    {eventType.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                Event Date
              </label>
              <input
                type='datetime-local'
                value={nextEvent.starts_at}
                onChange={(event) => setNextEvent((current) => ({ ...current, starts_at: event.target.value }))}
                className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light shadow-soft transition focus:border-brand-primary focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
              />
            </div>

            <div>
              <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                Event Title
              </label>
              <input
                value={nextEvent.title}
                onChange={(event) => setNextEvent((current) => ({ ...current, title: event.target.value }))}
                placeholder='Mention, hearing, filing follow-up...'
                className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light shadow-soft transition placeholder:text-text-muted-light focus:border-brand-primary focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark dark:placeholder:text-text-muted-dark'
              />
            </div>

            <div>
              <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                Court Station
              </label>
              <input
                value={nextEvent.court_station}
                onChange={(event) => setNextEvent((current) => ({ ...current, court_station: event.target.value }))}
                className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light shadow-soft transition focus:border-brand-primary focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
              />
            </div>

            <div>
              <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                Courtroom
              </label>
              <input
                value={nextEvent.courtroom}
                onChange={(event) => setNextEvent((current) => ({ ...current, courtroom: event.target.value }))}
                className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light shadow-soft transition focus:border-brand-primary focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
              />
            </div>

            <div>
              <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                Judicial Officer
              </label>
              <input
                value={nextEvent.judicial_officer}
                onChange={(event) => setNextEvent((current) => ({ ...current, judicial_officer: event.target.value }))}
                className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light shadow-soft transition focus:border-brand-primary focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
              />
            </div>
          </div>

          <div className='mt-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center'>
            <textarea
              value={nextEvent.description}
              onChange={(event) => setNextEvent((current) => ({ ...current, description: event.target.value }))}
              placeholder='Optional event notes'
              rows={3}
              className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light shadow-soft transition placeholder:text-text-muted-light focus:border-brand-primary focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark dark:placeholder:text-text-muted-dark'
            />

            <label className='inline-flex items-center gap-3 rounded-xl border border-border-light px-4 py-3 text-sm font-semibold text-text-primary-light dark:border-border-dark dark:text-text-primary-dark'>
              <input
                type='checkbox'
                checked={nextEvent.is_client_visible}
                onChange={(event) => setNextEvent((current) => ({ ...current, is_client_visible: event.target.checked }))}
                className='h-4 w-4'
              />
              Notify client
            </label>
          </div>
        </div>
      </Card>

      <Card className='p-6'>
        <h3 className='mb-4 text-lg font-semibold text-text-primary-light dark:text-text-primary-dark'>
          Conflict Check
        </h3>
        <div className='space-y-4'>
          <div>
            <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
              Conflict Action
            </label>
            <select
              value={nextEvent.event_type}
              onChange={(event) => setNextEvent((current) => ({ ...current, event_type: event.target.value }))}
              className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light shadow-soft transition focus:border-brand-primary focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
            >
              <option value=''>Select action...</option>
              <option value='REVIEW'>Review</option>
              <option value='MARK_CLEAR'>Mark Clear</option>
              <option value='POTENTIAL_CONFLICT'>Potential Conflict</option>
              <option value='CONFIRM_CONFLICT'>Confirm Conflict</option>
              <option value='REQUEST_WAIVER'>Request Waiver</option>
              <option value='RECORD_WAIVER'>Record Waiver</option>
            </select>
          </div>
          <div>
            <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
              Effective At
            </label>
            <input
              type='datetime-local'
              value={nextEvent.starts_at}
              onChange={(event) => setNextEvent((current) => ({ ...current, starts_at: event.target.value }))}
              className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light shadow-soft transition focus:border-brand-primary focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
            />
          </div>
          <div>
            <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
              Reason
            </label>
            <input
              value={statusNote}
              onChange={(event) => setStatusNote(event.target.value)}
              placeholder='Required reason for conflict action...'
              className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light shadow-soft transition placeholder:text-text-muted-light focus:border-brand-primary focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark dark:placeholder:text-text-muted-dark'
            />
          </div>
          <div>
            <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
              Result Summary
            </label>
            <input
              value={nextEvent.title || ''}
              onChange={(event) => setNextEvent((current) => ({ ...current, title: event.target.value }))}
              placeholder='Result summary (required for review/clear)...'
              className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light shadow-soft transition placeholder:text-text-muted-light focus:border-brand-primary focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark dark:placeholder:text-text-muted-dark'
            />
          </div>
          <button
            type='button'
            onClick={async () => {
              const action = nextEvent.event_type;
              if (!action || !statusNote || !nextEvent.starts_at) {
                Swal.fire({ icon: 'warning', title: 'Missing fields', text: 'Select action, reason, effective date, and result summary.' });
                return;
              }
              try {
                await axiosInstance.post(`/cases/${id}/conflict-check/actions/`, {
                  action,
                  effective_at: toIsoDateTime(nextEvent.starts_at),
                  reason: statusNote,
                  data: { result_summary: nextEvent.title || '' },
                });
                setStatusNote('');
                setNextEvent({ ...nextEvent, event_type: '', starts_at: '', title: '' });
                Swal.fire({ icon: 'success', title: 'Conflict Action Applied', timer: 1600, showConfirmButton: false });
              } catch (err) {
                Swal.fire({ icon: 'error', title: 'Failed', text: err?.response?.data?.detail || err?.message || 'Could not apply conflict action.' });
              }
            }}
            className='rounded-xl bg-brand-primary px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
          >
            Apply Conflict Action
          </button>
        </div>
      </Card>

      <ChatWorkspace
        title='Secretary Coordination'
        subtitle='Case-attached internal chat with the assigned secretary.'
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
        emptyThreadMessage='No secretary coordination thread yet.'
      />

      <Card className='p-6'>
        <h3 className='mb-4 text-lg font-semibold text-text-primary-light dark:text-text-primary-dark'>
          Timeline
        </h3>

        {timeline.length ? (
          <div className='space-y-3'>
            {timeline.map((item, i) => (
              <div
                key={item.id || i}
                className='rounded-xl border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark'
              >
                <p className='font-semibold text-text-primary-light dark:text-text-primary-dark'>
                  {safe(item.action)}
                </p>
                <p className='text-text-muted-light dark:text-text-muted-dark'>
                  {safe(item.description)}
                </p>
                <p className='mt-2 text-xs text-text-muted-light dark:text-text-muted-dark'>
                  {item.created_at ? formatDateTime(item.created_at) : 'N/A'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className='text-text-muted-light dark:text-text-muted-dark'>
            No timeline records.
          </p>
        )}
      </Card>

      <Card className='p-6'>
        <h3 className='mb-4 text-lg font-semibold text-text-primary-light dark:text-text-primary-dark'>
          Documents
        </h3>

        {documents.length ? (
          <div className='space-y-2'>
            {documents.map((doc, i) => (
              <div
                key={doc.id || i}
                className='rounded-lg border border-border-light bg-surface-light p-3 dark:border-border-dark dark:bg-surface-dark'
              >
                <p className='text-text-primary-light dark:text-text-primary-dark'>
                  {doc.name || 'Document'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className='text-text-muted-light dark:text-text-muted-dark'>
            No documents uploaded.
          </p>
        )}
      </Card>
    </div>
  );
}
