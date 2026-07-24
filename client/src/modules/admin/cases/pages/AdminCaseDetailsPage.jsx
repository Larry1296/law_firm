import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Swal from '@/core/utils/themedSwal';

import StatsCard from '@/components/ui/StatsCard';
import SectionHeading from '@/components/ui/SectionHeading';
import BackLink from '@/components/ui/BackLink';
import Card from '@/components/ui/Card';
import Select3D from '@/components/ui/Select3D';
import ElasticTextInput from '@/components/ui/ElasticTextInput';
import { formatDate, formatDateTime } from '@/core/utils/dateFormatter';
import { displayEnum } from '@/core/utils/textFormatter';

import useCaseDetails from '@/modules/admin/cases/hooks/useAdminCaseDetails';
import CaseProcedurePanels from '@/modules/cases/shared/CaseProcedurePanels';
import { COURT_LEVELS, COURT_TYPES } from '@/modules/cases/shared/create/caseCreateOptions';

const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const COURT_EVENT_TYPES = [
  { value: 'CASE_MANAGEMENT', label: 'Case management mention' },
  { value: 'MENTION', label: 'Mention' },
  { value: 'DIRECTIONS', label: 'Directions' },
  { value: 'PRE_TRIAL', label: 'Pre-trial conference' },
  { value: 'HEARING', label: 'Hearing' },
  { value: 'SUBMISSIONS', label: 'Submissions' },
  { value: 'RULING', label: 'Ruling delivery' },
  { value: 'JUDGMENT', label: 'Judgment delivery' },
  { value: 'TAXATION', label: 'Taxation' },
  { value: 'EXECUTION', label: 'Execution mention/application' },
  { value: 'SERVICE', label: 'Service/proof of service' },
  { value: 'FILING', label: 'Registry or filing follow-up' },
];

const HEARING_MODES = [
  { value: 'VIRTUAL', label: 'Virtual' },
  { value: 'PHYSICAL', label: 'Physical' },
  { value: 'HYBRID', label: 'Hybrid' },
  { value: 'NOT_APPLICABLE', label: 'Not applicable' },
];

const EVENT_SUBTYPE_HINTS = {
  CASE_MANAGEMENT: 'Order 11 compliance / case management mention',
  MENTION: 'Mention for directions',
  DIRECTIONS: 'Directions on pleadings, service or compliance',
  PRE_TRIAL: 'Pre-trial conference / certify ready for hearing',
  HEARING: 'Hearing date / evidence taking',
  SUBMISSIONS: 'Written or oral submissions',
  RULING: 'Ruling delivery',
  JUDGMENT: 'Judgment delivery',
  TAXATION: 'Bill of costs taxation',
  EXECUTION: 'Execution or decree enforcement step',
  SERVICE: 'Service attempt / affidavit of service',
  FILING: 'Registry follow-up / filing confirmation',
};

const panelClass =
  'rounded-xl border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark';

const InfoRow = ({ label, value }) => (
  <div className='space-y-1'>
    <p className='text-xs font-semibold uppercase tracking-wide text-text-muted-light dark:text-text-muted-dark'>
      {label}
    </p>
    <p className='text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
      {value}
    </p>
  </div>
);

const ElasticTextArea = ({ label, value, onChange, placeholder = '', error, className = '', required = false }) => (
  <ElasticTextInput
    label={label}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    error={error}
    required={required}
    minRows={1}
    alwaysShowLabel
    wrapperClassName={`mb-0 ${className}`}
  />
);

const SectionNote = ({ children, tone = 'info' }) => {
  const toneClass =
    tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100'
      : 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-100';

  return (
    <div className={`rounded-xl border p-4 text-sm ${toneClass}`}>
      {children}
    </div>
  );
};

const AdminCaseDetailsPage = () => {
  const { id } = useParams();

  const {
    caseData,
    lawyers,
    secretaries,
    isLoading,
    error,
    reassignLawyer,
    isReassigning,
    updateCase,
    isUpdatingCase,
    reassignSecretary,
    isReassigningSecretary,
    transitionCase,
    isTransitioning,
    conflictCheckAction,
    isUpdatingConflictCheck,
    verifyJurisdiction,
    isVerifyingJurisdiction,
    createCaseEvent,
    isCreatingCaseEvent,
  } = useCaseDetails(id);

  const [selectedLawyer, setSelectedLawyer] = useState('');
  const [selectedSecretary, setSelectedSecretary] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [transitionDraft, setTransitionDraft] = useState({
    key: '',
    effective_at: '',
    reason: '',
  });
  const [transitionMetadata, setTransitionMetadata] = useState({
    filing_date: '',
    official_court_case_number: '',
    efiling_reference: '',
    assessment_reference: '',
    payment_reference: '',
    payment_date: '',
    court_fee_amount: '',
    court_station: '',
    registry: '',
    sealed_documents_received: false,
    service_package_prepared: false,
    responsible_person: '',
    target_service_date: '',
  });
  const [conflictDraft, setConflictDraft] = useState({
    action: '',
    effective_at: '',
    reason: '',
    result_summary: '',
    internal_notes: '',
    waiver_details: '',
  });
  const [conflictErrors, setConflictErrors] = useState({});
  const [jurisdictionDraft, setJurisdictionDraft] = useState({
    action: 'VERIFY',
    reason: '',
    claim_amount: '',
    currency: 'KES',
    court_level: '',
    court_type: '',
    court_station: '',
    judicial_officer_rank: '',
    jurisdiction_notes: '',
  });
  const [jurisdictionErrors, setJurisdictionErrors] = useState({});
  const [ctsDraft, setCtsDraft] = useState({
    cts_reference: '',
    verification_source: '',
    reason: '',
    jurisdiction_notes: '',
  });
  const [ctsErrors, setCtsErrors] = useState({});

  const [eventDraft, setEventDraft] = useState({
    event_type: 'CASE_MANAGEMENT',
    event_subtype: EVENT_SUBTYPE_HINTS.CASE_MANAGEMENT,
    title: 'Case management mention',
    description: 'For directions on pleadings, documents, witness statements, issues for determination and further case-management timelines.',
    starts_at: '',
    ends_at: '',
    hearing_mode: 'VIRTUAL',
    court: '',
    court_station: '',
    courtroom: '',
    judicial_officer: '',
    virtual_meeting_url: '',
    virtual_access_instructions: '',
    physical_venue: '',
    orders_directions: '',
    next_action: 'Prepare case management bundle and confirm service, pleadings and compliance status.',
    next_date: '',
    is_client_visible: true,
  });
  const [eventErrors, setEventErrors] = useState({});
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);

  const hasVerifiedJurisdiction = Boolean(caseData?.jurisdiction_verified);
  const hasVerifiedCts = Boolean(caseData?.cts_reference || caseData?.court_proceeding?.cts_reference);

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

  if (!caseData) {
    return (
      <div className='p-6 text-text-primary-light dark:text-text-primary-dark'>
        <p>Case not found.</p>
      </div>
    );
  }

  const analytics = caseData.analytics || {};
  const timeline = caseData.timeline || [];
  const events = caseData.events || [];
  const documents = caseData.documents || [];
  const tasks = caseData.tasks || [];

  const safe = (value, fallback = 'N/A') =>
    value !== null && value !== undefined && value !== '' ? value : fallback;
  const friendly = (value, fallback = 'N/A') =>
    value !== null && value !== undefined && value !== ''
      ? displayEnum(value)
      : fallback;
  const optionLabel = (options, value, fallback = 'Not recorded') =>
    options.find((option) => option.value === value)?.label || friendly(value, fallback);
  const formatMoney = (value, currency = caseData.currency || 'KES') =>
    value !== null && value !== undefined && value !== ''
      ? `${currency} ${Number(value).toLocaleString('en-KE', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : 'Not recorded';
  const firstValue = (...values) =>
    values.find((value) => value !== null && value !== undefined && value !== '') || '';
  const pageTitle = safe(caseData.title, safe(caseData.case_number, 'Case Details'));
  const isCourtMatter = caseData.forum === 'COURT' || Boolean(caseData.court_proceeding);
  const courtProceeding = caseData.court_proceeding || {};
  const monetaryRelief = caseData.monetary_relief;
  const representedParties = (caseData.parties || []).filter((party) => party.is_our_client);
  const adverseParties = (caseData.parties || []).filter((party) => party.is_adverse);
  const otherParties = (caseData.parties || []).filter((party) => !party.is_our_client && !party.is_adverse);
  const courtName = firstValue(caseData.court_name, caseData.court_station, caseData.registry);
  const courtLocation = firstValue(caseData.court_location, caseData.court_station, caseData.registry);
  const conflictCheckEnvelope = caseData.conflict_check;
  const originatingConflictCheck = caseData.originating_conflict_check;
  const hasOriginatingConflictCheck = Boolean(originatingConflictCheck?.id || conflictCheckEnvelope?.source === 'originating_proposed_matter');
  const conflictCheck = conflictCheckEnvelope?.id ? conflictCheckEnvelope : null;
  const conflictRecord = caseData.conflict_record;
  const conflictStatus = conflictCheck?.status || conflictRecord?.status || 'NOT_STARTED';
  const intakeSourcesChecked = (originatingConflictCheck?.source_categories_checked || conflictCheckEnvelope?.source_categories_checked || []).map((source) => friendly(source));
  const conflictReviewed = Boolean(conflictCheck?.reviewed_at && conflictCheck?.reviewed_by);
  const conflictDisplayTitle = hasOriginatingConflictCheck
    ? 'Intake Conflict Check'
    : conflictCheck
      ? 'Conflict Check'
      : caseData.entry_route === 'EXISTING_FILED_COURT_CASE'
        ? 'Conflict Record Verification'
        : 'Conflict Check';

  const currentLawyerId = caseData?.assigned_lawyer?.membership_id || '';
  const currentSecretaryId = caseData?.assigned_secretary?.membership_id || '';

  const selectableLawyers = lawyers.filter(
    (lawyer) =>
      lawyer.membership_id !== currentLawyerId &&
      lawyer.system_role !== 'ADMIN',
  );

  const selectableSecretaries = secretaries.filter(
    (secretary) => secretary.membership_id !== currentSecretaryId,
  );

  const conflictActionsByStatus = {
    NOT_STARTED: [{ value: 'INITIATE', label: 'Initiate check' }],
    PENDING: conflictReviewed
      ? [
          { value: 'MARK_CLEAR', label: 'Mark clear' },
          { value: 'POTENTIAL_CONFLICT', label: 'Record potential conflict' },
          { value: 'CONFIRM_CONFLICT', label: 'Confirm conflict' },
          { value: 'REQUEST_WAIVER', label: 'Request waiver' },
          { value: 'CANCEL', label: 'Cancel check' },
        ]
      : [
          { value: 'REVIEW', label: 'Review check' },
          { value: 'POTENTIAL_CONFLICT', label: 'Record potential conflict' },
          { value: 'CONFIRM_CONFLICT', label: 'Confirm conflict' },
          { value: 'CANCEL', label: 'Cancel check' },
        ],
    POTENTIAL_CONFLICT: [
      { value: 'CONFIRM_CONFLICT', label: 'Confirm conflict' },
      { value: 'REQUEST_WAIVER', label: 'Request waiver' },
      { value: 'CANCEL', label: 'Cancel check' },
    ],
    CONFLICT_CONFIRMED: [
      { value: 'REQUEST_WAIVER', label: 'Request waiver' },
      { value: 'REJECT', label: 'Reject instruction' },
    ],
    WAIVER_PENDING: [
      { value: 'RECORD_WAIVER', label: 'Record waiver' },
      { value: 'CONFIRM_CONFLICT', label: 'Confirm conflict' },
      { value: 'REJECT', label: 'Reject instruction' },
    ],
    WAIVED: [{ value: 'MARK_CLEAR', label: 'Mark clear' }],
    CLEAR: [],
    REJECTED: [],
    CANCELLED: [],
  };

  const conflictActionLabels = {
    INITIATE: 'Initiate check',
    REVIEW: 'Review Check',
    MARK_CLEAR: 'Mark Clear',
    POTENTIAL_CONFLICT: 'Record Potential Conflict',
    CONFIRM_CONFLICT: 'Confirm Conflict',
    REQUEST_WAIVER: 'Request Waiver',
    RECORD_WAIVER: 'Record Waiver',
    REJECT: 'Reject Instruction',
    CANCEL: 'Cancel',
  };
  const backendActions = Array.isArray(conflictCheckEnvelope?.available_actions)
    ? conflictCheckEnvelope.available_actions
    : null;
  const conflictActions = hasOriginatingConflictCheck
    ? []
    : (backendActions || (conflictActionsByStatus[conflictStatus] || []).map((action) => action.value))
      .map((action) => ({ value: action, label: conflictActionLabels[action] || friendly(action) }));

  const jurisdictionAction = hasVerifiedJurisdiction && jurisdictionDraft.action === 'VERIFY' ? 'REVOKE' : jurisdictionDraft.action;
  const shouldPrefillJurisdiction = !hasVerifiedJurisdiction && jurisdictionAction === 'VERIFY';
  const jurisdictionValues = {
    action: jurisdictionAction,
    reason: jurisdictionDraft.reason,
    claim_amount:
      jurisdictionDraft.claim_amount ||
      (shouldPrefillJurisdiction ? caseData.claim_amount || monetaryRelief?.principal_amount : '') ||
      '',
    currency:
      jurisdictionDraft.currency ||
      (shouldPrefillJurisdiction ? caseData.currency || monetaryRelief?.currency : '') ||
      'KES',
    court_level: jurisdictionDraft.court_level || (shouldPrefillJurisdiction ? caseData.court_level : '') || '',
    court_type: jurisdictionDraft.court_type || (shouldPrefillJurisdiction ? caseData.court_type : '') || '',
    court_station: jurisdictionDraft.court_station || (shouldPrefillJurisdiction ? caseData.court_station : '') || '',
    judicial_officer_rank:
      jurisdictionDraft.judicial_officer_rank ||
      (shouldPrefillJurisdiction ? caseData.judicial_officer_rank : '') ||
      '',
    jurisdiction_notes:
      jurisdictionDraft.jurisdiction_notes ||
      (shouldPrefillJurisdiction ? caseData.jurisdiction_notes : '') ||
      '',
  };

  const handleReassign = async () => {
    if (!selectedLawyer) return;

    const selectedLawyerData = lawyers.find(
      (lawyer) => lawyer.membership_id === selectedLawyer,
    );

    const result = await Swal.fire({
      title: 'Reassign Lawyer?',
      html: `
        <div style="text-align:left">
          <p>This action will immediately transfer ownership of this case.</p>
          <br/>
          <strong>New Lawyer:</strong><br/>
          ${selectedLawyerData?.full_name || 'Selected Lawyer'}
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Reassign',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      await reassignLawyer({
        caseId: id,
        membershipId: selectedLawyer,
      });

      Swal.fire({
        icon: 'success',
        title: 'Lawyer Reassigned',
        text: 'The case lawyer was updated successfully.',
        timer: 2000,
        showConfirmButton: false,
      });

      setSelectedLawyer('');
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Reassignment Failed',
        text: error?.response?.data?.message || 'Failed to reassign lawyer.',
      });
    }
  };

  const handleSecretaryReassign = async () => {
    if (!selectedSecretary) return;

    const secretary = secretaries.find(
      (s) => s.membership_id === selectedSecretary,
    );

    const result = await Swal.fire({
      title: 'Assign Secretary?',
      html: `
        <div style="text-align:left">
          <p>You are about to assign this secretary to the case.</p>
          <br/>
          <strong>${secretary?.full_name || ''}</strong>
          <br/>
          ${secretary?.email || ''}
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Assign',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    try {
      await reassignSecretary({
        caseId: id,
        membershipId: selectedSecretary,
      });

      Swal.fire({
        icon: 'success',
        title: 'Secretary Assigned',
        text: 'Secretary updated successfully.',
        timer: 2000,
        showConfirmButton: false,
      });
      setSelectedSecretary('');
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Assignment Failed',
        text: error?.response?.data?.message || 'Failed to assign secretary.',
      });
    }
  };

  const handlePriorityUpdate = async () => {
    const nextPriority = selectedPriority || caseData.priority;
    if (!nextPriority || nextPriority === caseData.priority) return;

    try {
      await updateCase({
        caseId: id,
        payload: { priority: nextPriority },
      });

      Swal.fire({
        icon: 'success',
        title: 'Priority Updated',
        text: 'Case priority was updated successfully.',
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: error?.response?.data?.message || 'Failed to update priority.',
      });
    }
  };

  const selectedTransition = (caseData.available_transitions || []).find(
    (item) => `${item.dimension}:${item.to_state}` === transitionDraft.key,
  );

  const buildTransitionMetadata = (transition) => {
    if (!transition) return {};
    if (transition.to_state === 'FILED') {
      return Object.fromEntries(
        ['filing_date', 'official_court_case_number', 'efiling_reference', 'assessment_reference', 'payment_reference', 'payment_date', 'court_fee_amount', 'court_station', 'registry']
          .map((field) => [field, transitionMetadata[field]])
          .filter(([, value]) => value !== '' && value !== null && value !== undefined),
      );
    }
    if (transition.to_state === 'AWAITING_SERVICE') {
      return {
        sealed_documents_received: transitionMetadata.sealed_documents_received,
        service_package_prepared: transitionMetadata.service_package_prepared,
        responsible_person: transitionMetadata.responsible_person,
        target_service_date: transitionMetadata.target_service_date || null,
      };
    }
    return {};
  };

  const handleTransitionSubmit = async (event) => {
    event.preventDefault();
    if (!transitionDraft.key || !transitionDraft.reason.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing transition details',
        text: 'Choose a transition and provide a reason.',
      });
      return;
    }

    const transition = selectedTransition;
    if (!transition) return;

    const metadata = buildTransitionMetadata(transition);

    try {
      await transitionCase({
        caseId: id,
        payload: {
          dimension: transition.dimension,
          to_state: transition.to_state,
          effective_at: transitionDraft.effective_at || null,
          reason: transitionDraft.reason,
          metadata,
        },
      });
      setTransitionDraft({ key: '', effective_at: '', reason: '' });
      Swal.fire({
        icon: 'success',
        title: 'Lifecycle updated',
        text: 'The transition was recorded in the case history.',
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Transition failed',
        text:
          error?.response?.data?.detail ||
          error?.response?.data?.metadata ||
          error?.response?.data?.to_state ||
          'The lifecycle transition could not be recorded.',
      });
    }
  };

  const handleConflictAction = async (event) => {
    event.preventDefault();
    if (isUpdatingConflictCheck) return;
    setConflictErrors({});
    if (!conflictDraft.action || (conflictDraft.action !== 'INITIATE' && !conflictDraft.reason.trim())) {
      setConflictErrors({
        action: !conflictDraft.action ? 'Choose a conflict-check action.' : '',
        reason: conflictDraft.action !== 'INITIATE' && !conflictDraft.reason.trim() ? 'Reason is required.' : '',
      });
      return;
    }
    if (
      ['REVIEW', 'MARK_CLEAR'].includes(conflictDraft.action) &&
      !conflictDraft.effective_at
    ) {
      setConflictErrors({ effective_at: 'Effective date and time is required.' });
      return;
    }
    if (conflictDraft.action === 'REVIEW' && !conflictDraft.result_summary.trim()) {
      setConflictErrors({ result_summary: 'Review result summary is required.' });
      return;
    }

    const consequentialActions = ['CONFIRM_CONFLICT', 'REJECT', 'CANCEL'];
    if (consequentialActions.includes(conflictDraft.action)) {
      const result = await Swal.fire({
        title: 'Confirm conflict-check action?',
        text: 'This will be recorded in the matter audit history.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Record Action',
        cancelButtonText: 'Cancel',
      });
      if (!result.isConfirmed) return;
    }

    const payload = {
      action: conflictDraft.action,
      effective_at: conflictDraft.effective_at || null,
      reason: conflictDraft.reason,
      data: {
        result_summary: conflictDraft.result_summary,
        internal_notes: conflictDraft.internal_notes,
        waiver_details: conflictDraft.waiver_details,
      },
    };

    try {
      await conflictCheckAction({ caseId: id, payload });
      setConflictDraft({
        action: '',
        effective_at: '',
        reason: '',
        result_summary: '',
        internal_notes: '',
        waiver_details: '',
      });
      Swal.fire({
        icon: 'success',
        title: 'Conflict check updated',
        text: 'The conflict-check record was updated.',
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error) {
      const backendErrors = error?.response?.data?.errors;
      if (backendErrors) {
        setConflictErrors(backendErrors);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Conflict action failed',
          text:
            error?.response?.data?.detail ||
            error?.response?.data?.action ||
            error?.response?.data?.conflict_check ||
            'The conflict-check action could not be recorded.',
        });
      }
    }
  };


  const toIsoDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString();
  };

  const normalizeBackendErrors = (backendErrors = {}) =>
    Object.fromEntries(
      Object.entries(backendErrors).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join(' ') : String(value),
      ]),
    );

  const handleEventTypeChange = (eventType) => {
    setEventDraft((current) => ({
      ...current,
      event_type: eventType,
      event_subtype: EVENT_SUBTYPE_HINTS[eventType] || '',
      title: COURT_EVENT_TYPES.find((option) => option.value === eventType)?.label || current.title,
      hearing_mode: ['HEARING', 'MENTION', 'CASE_MANAGEMENT', 'PRE_TRIAL', 'RULING', 'JUDGMENT'].includes(eventType)
        ? current.hearing_mode || 'VIRTUAL'
        : current.hearing_mode,
    }));
  };

  const handleCaseEventSubmit = async (event) => {
    event.preventDefault();
    if (isCreatingCaseEvent) return;

    const errors = {};
    if (!eventDraft.event_type) errors.event_type = 'Select the court event type.';
    if (!eventDraft.title.trim()) errors.title = 'Enter the event title.';
    if (!eventDraft.starts_at) errors.starts_at = 'Enter the court event date and time.';
    if (!eventDraft.description.trim()) errors.description = 'Enter the agenda or purpose of the event.';

    if (eventDraft.ends_at && eventDraft.starts_at && new Date(eventDraft.ends_at) <= new Date(eventDraft.starts_at)) {
      errors.ends_at = 'End time must be after the start time.';
    }

    if (Object.keys(errors).length) {
      setEventErrors(errors);
      return;
    }

    setEventErrors({});

    const payload = {
      event_type: eventDraft.event_type,
      event_subtype: eventDraft.event_subtype.trim(),
      title: eventDraft.title.trim(),
      description: eventDraft.description.trim(),
      starts_at: toIsoDateTime(eventDraft.starts_at),
      ends_at: eventDraft.ends_at ? toIsoDateTime(eventDraft.ends_at) : null,
      hearing_mode: eventDraft.hearing_mode,
      court: eventDraft.court.trim() || courtName || '',
      court_station: eventDraft.court_station.trim() || caseData.court_station || '',
      courtroom: eventDraft.courtroom.trim(),
      judicial_officer: eventDraft.judicial_officer.trim(),
      virtual_meeting_url: eventDraft.virtual_meeting_url.trim(),
      virtual_access_instructions: eventDraft.virtual_access_instructions.trim(),
      physical_venue: eventDraft.physical_venue.trim(),
      orders_directions: eventDraft.orders_directions.trim(),
      next_action: eventDraft.next_action.trim(),
      next_date: eventDraft.next_date ? toIsoDateTime(eventDraft.next_date) : null,
      is_client_visible: eventDraft.is_client_visible,
    };

    try {
      await createCaseEvent({ caseId: id, payload });
      setIsEventFormOpen(false);
      setEventDraft({
        event_type: 'CASE_MANAGEMENT',
        event_subtype: EVENT_SUBTYPE_HINTS.CASE_MANAGEMENT,
        title: 'Case management mention',
        description: 'For directions on pleadings, documents, witness statements, issues for determination and further case-management timelines.',
        starts_at: '',
        ends_at: '',
        hearing_mode: 'VIRTUAL',
        court: '',
        court_station: '',
        courtroom: '',
        judicial_officer: '',
        virtual_meeting_url: '',
        virtual_access_instructions: '',
        physical_venue: '',
        orders_directions: '',
        next_action: 'Prepare case management bundle and confirm service, pleadings and compliance status.',
        next_date: '',
        is_client_visible: true,
      });
      Swal.fire({
        icon: 'success',
        title: 'Court event recorded',
        text: 'The court diary entry has been added to this matter.',
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error) {
      const backendErrors = error?.response?.data || {};
      setEventErrors(normalizeBackendErrors(backendErrors));
      Swal.fire({
        icon: 'error',
        title: 'Court event failed',
        text: backendErrors.detail || 'The court event could not be recorded.',
      });
    }
  };


  const handleCtsSubmit = async (event) => {
    event.preventDefault();
    if (isVerifyingJurisdiction) return;
    setCtsErrors({});
    const payload = {
      action: 'VERIFY_CTS',
      cts_reference: ctsDraft.cts_reference.trim(),
      verification_source: ctsDraft.verification_source.trim(),
      reason: ctsDraft.reason.trim(),
      jurisdiction_notes: ctsDraft.jurisdiction_notes.trim(),
    };
    const errors = {};
    if (!payload.cts_reference) errors.cts_reference = 'CTS reference is required.';
    if (!payload.verification_source) errors.verification_source = 'Verification source is required.';
    if (!payload.reason) errors.reason = 'Reason is required.';
    if (Object.keys(errors).length) {
      setCtsErrors(errors);
      return;
    }

    try {
      await verifyJurisdiction({ caseId: id, payload });
      setCtsDraft({
        cts_reference: '',
        verification_source: '',
        reason: '',
        jurisdiction_notes: '',
      });
      Swal.fire({
        icon: 'success',
        title: 'CTS reference verified',
        text: 'The court-record verification was recorded.',
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error) {
      const backendErrors = error?.response?.data || {};
      setCtsErrors(
        Object.fromEntries(
          Object.entries(backendErrors).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.join(' ') : String(value),
          ]),
        ),
      );
      Swal.fire({
        icon: 'error',
        title: 'CTS verification failed',
        text:
          error?.response?.data?.detail ||
          error?.response?.data?.cts_reference ||
          'The CTS reference could not be verified.',
      });
    }
  };

  const handleJurisdictionSubmit = async (event) => {
    event.preventDefault();
    if (isVerifyingJurisdiction) return;
    setJurisdictionErrors({});

    const payload = { ...jurisdictionValues };
    if (payload.action === 'REVOKE' && !payload.reason.trim()) {
      setJurisdictionErrors({ reason: 'A reason is required to revoke jurisdiction verification.' });
      return;
    }
    if (payload.action === 'VERIFY') {
      const errors = {};
      if (!payload.claim_amount) errors.claim_amount = 'Claim amount is required.';
      if (!payload.court_level) errors.court_level = 'Court level is required.';
      if (!payload.jurisdiction_notes.trim()) errors.jurisdiction_notes = 'Jurisdiction assessment notes are required.';
      if (Object.keys(errors).length) {
        setJurisdictionErrors(errors);
        return;
      }
    }

    try {
      await verifyJurisdiction({ caseId: id, payload });
      setJurisdictionDraft({
        action: payload.action === 'VERIFY' ? 'REVOKE' : 'VERIFY',
        reason: '',
        claim_amount: '',
        currency: 'KES',
        court_level: '',
        court_type: '',
        court_station: '',
        judicial_officer_rank: '',
        jurisdiction_notes: '',
      });
      Swal.fire({
        icon: 'success',
        title: payload.action === 'VERIFY' ? 'Jurisdiction verified' : 'Jurisdiction verification revoked',
        text: 'The jurisdiction workflow was updated.',
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error) {
      const backendErrors = error?.response?.data || {};
      setJurisdictionErrors(
        Object.fromEntries(
          Object.entries(backendErrors).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.join(' ') : String(value),
          ]),
        ),
      );
      Swal.fire({
        icon: 'error',
        title: 'Jurisdiction action failed',
        text:
          error?.response?.data?.detail ||
          error?.response?.data?.jurisdiction ||
          'The jurisdiction action could not be recorded.',
      });
    }
  };

  return (
    <div className='space-y-6 p-4 md:p-6 animate-fadeIn'>
      <BackLink label='Back to Cases' fallbackPath='/admin/cases' />

      <SectionHeading
        title={pageTitle}
        subtitle='Matter record, court proceeding, parties and activity'
      />

      <Card className='p-6'>
        <div className='mb-5 flex flex-col gap-3 border-b border-border-light pb-5 dark:border-border-dark md:flex-row md:items-start md:justify-between'>
          <div>
            <p className='text-sm font-semibold uppercase tracking-wide text-text-muted-light dark:text-text-muted-dark'>
              Legal Matter
            </p>
            <h2 className='mt-1 text-2xl font-semibold text-text-primary-light dark:text-text-primary-dark'>
              {safe(caseData.title)}
            </h2>
          </div>
          <div className='rounded-xl bg-brand-primary/10 px-4 py-3 text-sm font-semibold text-brand-primary'>
            {caseData.matter_status_label || friendly(caseData.matter_status)}
          </div>
        </div>

        <div className='grid gap-5 md:grid-cols-2 xl:grid-cols-4'>
          <InfoRow
            label='Internal Matter Number'
            value={safe(caseData.case_number)}
          />
          <InfoRow
            label='Entry Route'
            value={caseData.entry_route_label || friendly(caseData.entry_route)}
          />
          <InfoRow label='Priority' value={friendly(caseData.priority)} />
          <InfoRow
            label='Practice Area'
            value={caseData.practice_area_label || friendly(caseData.practice_area)}
          />
          <InfoRow
            label='Matter Nature'
            value={caseData.matter_nature_label || friendly(caseData.matter_nature)}
          />
          <InfoRow
            label='Forum'
            value={caseData.forum_label || friendly(caseData.forum)}
          />
          <InfoRow
            label='Procedure'
            value={caseData.procedure_type_label || friendly(caseData.procedure_type || caseData.procedure_track)}
          />
          <InfoRow
            label='Instructions Received'
            value={caseData.date_instructions_received ? formatDate(caseData.date_instructions_received) : 'Not recorded'}
          />
          <InfoRow label='Created in Sheria Master' value={formatDateTime(caseData.created_at)} />
          <InfoRow label='Last Updated' value={formatDateTime(caseData.updated_at)} />
          <InfoRow label='Created By' value={safe(caseData.created_by_name || caseData.created_by?.full_name)} />
        </div>

        <div className='mt-6'>
          <p className='font-semibold text-text-primary-light dark:text-text-primary-dark'>
            Matter Summary
          </p>

          <p className='mt-2 text-text-muted-light dark:text-text-muted-dark'>
            {safe(caseData.description)}
          </p>
        </div>
      </Card>

      <div className='grid gap-4 lg:grid-cols-2'>
        <Card className='p-6'>
          <h3 className='mb-4 text-lg font-semibold text-text-primary-light dark:text-text-primary-dark'>
            Firm Matter Lifecycle
          </h3>
          <div className='grid gap-4 sm:grid-cols-2'>
            <InfoRow
              label='Matter Status'
              value={caseData.matter_status_label || friendly(caseData.matter_status)}
            />
            <InfoRow
              label='Client Lifecycle'
              value={friendly(caseData.client?.lifecycle_status)}
            />
            <InfoRow
              label='Portal Access'
              value={caseData.client?.access_type === 'PORTAL_ENABLED' ? 'Portal enabled' : friendly(caseData.client?.access_type)}
            />
            <InfoRow
              label='Conflict Position'
              value={friendly(conflictStatus)}
            />
          </div>
          <p className='mt-4 text-sm text-text-muted-light dark:text-text-muted-dark'>
            This section tracks the firm-client instruction and acceptance workflow. It is separate from the court proceeding stage.
          </p>
        </Card>

        <Card className='p-6'>
          <h3 className='mb-4 text-lg font-semibold text-text-primary-light dark:text-text-primary-dark'>
            Proceeding Lifecycle
          </h3>
          <div className='grid gap-4 sm:grid-cols-2'>
            <InfoRow
              label='Court Stage'
              value={isCourtMatter ? caseData.court_stage_label || friendly(caseData.court_stage) : 'Not applicable'}
            />
            <InfoRow
              label='Outcome'
              value={caseData.outcome_status_label || friendly(caseData.outcome_status)}
            />
            <InfoRow
              label='Enforcement'
              value={caseData.enforcement_status_label || friendly(caseData.enforcement_status)}
            />
            <InfoRow
              label='Appeal / Review'
              value={caseData.appeal_status_label || friendly(caseData.appeal_status)}
            />
          </div>
          <p className='mt-4 text-sm text-text-muted-light dark:text-text-muted-dark'>
            Court stage tracks the formal court record. Judgment, enforcement and appeal are independent legal dimensions.
          </p>
        </Card>
      </div>

      <Card className='p-6'>
        <h3 className='mb-4 text-lg font-semibold text-text-primary-light dark:text-text-primary-dark'>
          Lifecycle Transitions
        </h3>
        {(caseData.available_transitions || []).length ? (
          <form onSubmit={handleTransitionSubmit} className='grid gap-4 lg:grid-cols-2'>
            <Select3D
              value={transitionDraft.key}
              onChange={(event) => setTransitionDraft((current) => ({ ...current, key: event.target.value }))}
              wrapperClassName='mb-0'
              placeholder='Choose permitted transition'
              options={(caseData.available_transitions || []).map((transition) => ({
                value: `${transition.dimension}:${transition.to_state}`,
                label: `${friendly(transition.dimension)}: ${friendly(transition.from_state)} to ${transition.label || friendly(transition.to_state)}`,
              }))}
            />
            <input
              type='datetime-local'
              value={transitionDraft.effective_at}
              onChange={(event) => setTransitionDraft((current) => ({ ...current, effective_at: event.target.value }))}
              className='rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
            />
            <ElasticTextArea
              label='Reason or description'
              value={transitionDraft.reason}
              onChange={(event) => setTransitionDraft((current) => ({ ...current, reason: event.target.value }))}
              className='lg:col-span-2'
              required
            />
            {selectedTransition?.to_state === 'FILED' && (
              <div className='grid gap-4 rounded-xl border border-border-light p-4 dark:border-border-dark lg:col-span-2 md:grid-cols-2'>
                <input type='date' value={transitionMetadata.filing_date} onChange={(event) => setTransitionMetadata((current) => ({ ...current, filing_date: event.target.value }))} className='rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark' />
                <input placeholder='Official court case number' value={transitionMetadata.official_court_case_number} onChange={(event) => setTransitionMetadata((current) => ({ ...current, official_court_case_number: event.target.value }))} className='rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark' />
                <input placeholder='eFiling reference' value={transitionMetadata.efiling_reference} onChange={(event) => setTransitionMetadata((current) => ({ ...current, efiling_reference: event.target.value }))} className='rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark' />
                <input placeholder='Assessment reference' value={transitionMetadata.assessment_reference} onChange={(event) => setTransitionMetadata((current) => ({ ...current, assessment_reference: event.target.value }))} className='rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark' />
                <input placeholder='Payment reference' value={transitionMetadata.payment_reference} onChange={(event) => setTransitionMetadata((current) => ({ ...current, payment_reference: event.target.value }))} className='rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark' />
                <input type='date' value={transitionMetadata.payment_date} onChange={(event) => setTransitionMetadata((current) => ({ ...current, payment_date: event.target.value }))} className='rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark' />
                <input type='number' min='0' placeholder='Court fee amount' value={transitionMetadata.court_fee_amount} onChange={(event) => setTransitionMetadata((current) => ({ ...current, court_fee_amount: event.target.value }))} className='rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark' />
                <input placeholder='Court station' value={transitionMetadata.court_station} onChange={(event) => setTransitionMetadata((current) => ({ ...current, court_station: event.target.value }))} className='rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark' />
                <input placeholder='Registry' value={transitionMetadata.registry} onChange={(event) => setTransitionMetadata((current) => ({ ...current, registry: event.target.value }))} className='rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark' />
              </div>
            )}
            {selectedTransition?.to_state === 'AWAITING_SERVICE' && (
              <div className='grid gap-4 rounded-xl border border-border-light p-4 dark:border-border-dark lg:col-span-2 md:grid-cols-2'>
                <label className='flex items-center gap-2 text-sm'><input type='checkbox' checked={transitionMetadata.sealed_documents_received} onChange={(event) => setTransitionMetadata((current) => ({ ...current, sealed_documents_received: event.target.checked }))} /> Sealed documents received</label>
                <label className='flex items-center gap-2 text-sm'><input type='checkbox' checked={transitionMetadata.service_package_prepared} onChange={(event) => setTransitionMetadata((current) => ({ ...current, service_package_prepared: event.target.checked }))} /> Service package prepared</label>
                <input placeholder='Responsible person' value={transitionMetadata.responsible_person} onChange={(event) => setTransitionMetadata((current) => ({ ...current, responsible_person: event.target.value }))} className='rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark' />
                <input type='date' value={transitionMetadata.target_service_date} onChange={(event) => setTransitionMetadata((current) => ({ ...current, target_service_date: event.target.value }))} className='rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark' />
              </div>
            )}
            <button
              type='submit'
              disabled={isTransitioning}
              className='rounded-xl bg-brand-primary px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {isTransitioning ? 'Recording...' : 'Record Transition'}
            </button>
          </form>
        ) : (
          <p className='text-text-muted-light dark:text-text-muted-dark'>
            No lifecycle transition is currently available at this stage.
          </p>
        )}
      </Card>

      <Card className='p-6'>
        <div className='mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
          <h3 className='text-lg font-semibold text-text-primary-light dark:text-text-primary-dark'>
            {conflictDisplayTitle}
          </h3>
          <span className='text-sm font-medium text-text-muted-light dark:text-text-muted-dark'>
            {friendly(conflictStatus)}
          </span>
        </div>

        {!conflictCheck && conflictRecord && (
          <SectionNote tone={conflictRecord.status === 'REQUIRES_VERIFICATION' ? 'warning' : 'info'}>
            <p className='font-semibold'>
              {conflictRecord.status === 'REQUIRES_VERIFICATION'
                ? 'Conflict record requires verification'
                : 'Historical conflict position recorded'}
            </p>
            <p className='mt-1'>
              This filed matter was registered with a conflict-record position. It should be verified through the conflict workflow before the firm treats acceptance as fully cleared.
            </p>
          </SectionNote>
        )}

        {hasOriginatingConflictCheck && (
          <div className='grid gap-4 lg:grid-cols-3'>
            <div className={`space-y-2 ${panelClass}`}>
              <h4 className='font-semibold text-text-primary-light dark:text-text-primary-dark'>Conflict Position</h4>
              <p><strong>Reference:</strong> {safe(originatingConflictCheck?.reference_number || conflictCheckEnvelope?.reference_number)}</p>
              <p><strong>Decision:</strong> {safe(originatingConflictCheck?.status_label || conflictCheckEnvelope?.status_label || 'Cleared for proposed instructions')}</p>
              <p><strong>Decided by:</strong> {safe(originatingConflictCheck?.decided_by_name || conflictCheckEnvelope?.decided_by_name)}</p>
              <p><strong>Decision date:</strong> {(originatingConflictCheck?.decided_at || conflictCheckEnvelope?.decided_at) ? formatDateTime(originatingConflictCheck?.decided_at || conflictCheckEnvelope?.decided_at) : 'Not recorded'}</p>
            </div>
            <div className={`space-y-2 ${panelClass}`}>
              <h4 className='font-semibold text-text-primary-light dark:text-text-primary-dark'>Firm Acceptance</h4>
              <p><strong>Firm acceptance:</strong> {friendly(originatingConflictCheck?.acceptance_decision || conflictCheckEnvelope?.acceptance_decision, 'Not recorded')}</p>
              <p><strong>Accepted by:</strong> {safe(originatingConflictCheck?.accepted_by_name || conflictCheckEnvelope?.accepted_by_name)}</p>
              <p><strong>Acceptance date:</strong> {(originatingConflictCheck?.accepted_at || conflictCheckEnvelope?.accepted_at) ? formatDateTime(originatingConflictCheck?.accepted_at || conflictCheckEnvelope?.accepted_at) : 'Not recorded'}</p>
              <p><strong>Engagement status:</strong> {friendly(originatingConflictCheck?.engagement_status || conflictCheckEnvelope?.engagement_status, 'Not recorded')}</p>
            </div>
            <div className={`space-y-2 ${panelClass}`}>
              <h4 className='font-semibold text-text-primary-light dark:text-text-primary-dark'>Clearance Result</h4>
              <p><strong>Names checked:</strong> {(originatingConflictCheck?.names_checked || conflictCheckEnvelope?.names_checked || []).join(', ') || 'Not recorded'}</p>
              <p><strong>Sources checked:</strong> {intakeSourcesChecked.join(', ') || 'Not recorded'}</p>
              <p><strong>Safe result summary:</strong> {safe(originatingConflictCheck?.result_summary || conflictCheckEnvelope?.result_summary)}</p>
            </div>
          </div>
        )}

        {!hasOriginatingConflictCheck && (
        <div className='grid gap-4 lg:grid-cols-3'>
          <div className={`space-y-2 ${panelClass}`}>
            <h4 className='font-semibold text-text-primary-light dark:text-text-primary-dark'>
              Record
            </h4>
            <p className='text-text-primary-light dark:text-text-primary-dark'>
              <strong>Reference:</strong> {safe(conflictCheck?.reference_number, conflictRecord ? 'Registration record' : 'Not initiated')}
            </p>
            <p className='text-text-primary-light dark:text-text-primary-dark'>
              <strong>Recorded by:</strong> {safe(conflictCheck?.initiated_by_name || conflictRecord?.recorded_by_name)}
            </p>
            <p className='text-text-primary-light dark:text-text-primary-dark'>
              <strong>Date:</strong> {conflictCheck?.initiated_at ? formatDateTime(conflictCheck.initiated_at) : conflictRecord?.recorded_at ? formatDateTime(conflictRecord.recorded_at) : 'Not recorded'}
            </p>
          </div>

          <div className={`space-y-2 ${panelClass}`}>
            <h4 className='font-semibold text-text-primary-light dark:text-text-primary-dark'>
              Reviewed
            </h4>
            <p className='text-text-primary-light dark:text-text-primary-dark'>
              <strong>By:</strong> {safe(conflictCheck?.reviewed_by_name, 'Not reviewed')}
            </p>
            <p className='text-text-primary-light dark:text-text-primary-dark'>
              <strong>Date:</strong> {conflictCheck?.reviewed_at ? formatDateTime(conflictCheck.reviewed_at) : 'Not reviewed'}
            </p>
          </div>

          <div className={`space-y-2 ${panelClass}`}>
            <h4 className='font-semibold text-text-primary-light dark:text-text-primary-dark'>
              Final Result
            </h4>
            <p className='text-text-primary-light dark:text-text-primary-dark'>
              <strong>Completed by:</strong> {safe(conflictCheck?.completed_by_name, 'Not completed')}
            </p>
            <p className='text-text-primary-light dark:text-text-primary-dark'>
              <strong>Completed:</strong> {conflictCheck?.completed_at ? formatDateTime(conflictCheck.completed_at) : 'Not completed'}
            </p>
            <p className='text-text-primary-light dark:text-text-primary-dark'>
              <strong>Approved by:</strong> {safe(conflictCheck?.approved_by_name, 'Not approved')}
            </p>
            <p className='text-text-primary-light dark:text-text-primary-dark'>
              <strong>Waiver:</strong> {conflictCheck?.waiver_obtained ? 'Obtained' : conflictCheck?.waiver_required ? 'Required' : 'Not required'}
            </p>
          </div>
        </div>
        )}

        {!hasOriginatingConflictCheck && (conflictCheck?.result_summary || conflictRecord?.result_summary) && (
          <p className='mt-4 text-text-primary-light dark:text-text-primary-dark'>
            <strong>Safe result summary:</strong> {conflictCheck?.result_summary || conflictRecord?.result_summary}
          </p>
        )}

        {!hasOriginatingConflictCheck && conflictCheck?.internal_notes && (
          <div className='mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100'>
            <p className='font-semibold'>Internal — not visible to client</p>
            <p className='mt-1'>{conflictCheck.internal_notes}</p>
          </div>
        )}

        {conflictActions.length ? (
          <form onSubmit={handleConflictAction} className='mt-6 grid gap-4 lg:grid-cols-2'>
            <div>
              <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                Conflict action
              </label>
              <Select3D
                value={conflictDraft.action}
                onChange={(event) => setConflictDraft((current) => ({ ...current, action: event.target.value }))}
                wrapperClassName='mb-0'
                placeholder='Choose conflict-check action'
                options={conflictActions}
              />
              {conflictErrors.action && <p className='mt-1 text-sm text-error'>{conflictErrors.action}</p>}
            </div>
            {conflictDraft.action !== 'INITIATE' && (
              <div>
                <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                  Effective date and time
                </label>
                <input
                  type='datetime-local'
                  value={conflictDraft.effective_at}
                  onChange={(event) => setConflictDraft((current) => ({ ...current, effective_at: event.target.value }))}
                  className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
                />
                {conflictErrors.effective_at && <p className='mt-1 text-sm text-error'>{conflictErrors.effective_at}</p>}
              </div>
            )}
            {conflictDraft.action === 'MARK_CLEAR' && conflictCheck?.result_summary && (
              <div className='rounded-xl border border-border-light bg-surface-light p-4 text-sm text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark lg:col-span-2'>
                <p><strong>Reviewer:</strong> {safe(conflictCheck.reviewed_by_name)}</p>
                <p><strong>Review date:</strong> {conflictCheck.reviewed_at ? formatDateTime(conflictCheck.reviewed_at) : 'Not reviewed'}</p>
                <p className='mt-2'><strong>Review result:</strong> {conflictCheck.result_summary}</p>
              </div>
            )}
            <ElasticTextArea
              label={conflictDraft.action === 'INITIATE' ? 'Reason or search scope' : 'Reason for action'}
              value={conflictDraft.reason}
              onChange={(event) => setConflictDraft((current) => ({ ...current, reason: event.target.value }))}
              placeholder={conflictDraft.action === 'INITIATE' ? 'Example: Firm-wide search before engagement confirmation' : 'Reason or description'}
              error={conflictErrors.reason}
              className='lg:col-span-2'
            />
            {conflictDraft.action && !['INITIATE', 'MARK_CLEAR', 'REVIEW'].includes(conflictDraft.action) && (
              <>
                <ElasticTextArea
                  label='Result summary'
                  value={conflictDraft.result_summary}
                  onChange={(event) => setConflictDraft((current) => ({ ...current, result_summary: event.target.value }))}
                  placeholder='Safe result summary'
                  error={conflictErrors.result_summary}
                />
                <ElasticTextArea
                  label='Internal notes — not visible to client'
                  value={conflictDraft.internal_notes}
                  onChange={(event) => setConflictDraft((current) => ({ ...current, internal_notes: event.target.value }))}
                  placeholder='Internal notes — not visible to client'
                  error={conflictErrors.internal_notes}
                />
              </>
            )}
            {conflictDraft.action === 'REVIEW' && (
              <ElasticTextArea
                label='Review result summary'
                value={conflictDraft.result_summary}
                onChange={(event) => setConflictDraft((current) => ({ ...current, result_summary: event.target.value }))}
                placeholder='Safe result summary'
                error={conflictErrors.result_summary}
              />
            )}
            {['REQUEST_WAIVER', 'RECORD_WAIVER'].includes(conflictDraft.action) && (
              <ElasticTextArea
                label='Waiver details'
                value={conflictDraft.waiver_details}
                onChange={(event) => setConflictDraft((current) => ({ ...current, waiver_details: event.target.value }))}
                placeholder='Waiver details, when applicable'
                className='lg:col-span-2'
              />
            )}
            <button
              type='submit'
              disabled={isUpdatingConflictCheck}
              className='w-fit rounded-xl bg-brand-primary px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {isUpdatingConflictCheck ? 'Recording...' : 'Record Conflict Action'}
            </button>
          </form>
        ) : (
          <p className='mt-4 text-text-muted-light dark:text-text-muted-dark'>
            No conflict-check actions are currently available.
          </p>
        )}
      </Card>

      {isCourtMatter && (
        <Card className='p-6'>
          <div className='mb-5 flex flex-col gap-2 md:flex-row md:items-start md:justify-between'>
            <div>
              <h3 className='text-lg font-semibold text-text-primary-light dark:text-text-primary-dark'>
                Court Proceeding Record
              </h3>
              <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>
                Court details recorded from the filed matter are separate from jurisdiction verification and later service steps.
              </p>
            </div>
            <span className='rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-500/15 dark:text-blue-200'>
              {caseData.court_stage_label || friendly(caseData.court_stage)}
            </span>
          </div>

          <div className='grid gap-5 md:grid-cols-2 xl:grid-cols-4'>
            <InfoRow
              label='Official Court Case Number'
              value={safe(courtProceeding.official_court_case_number || caseData.official_court_case_number, 'Not recorded')}
            />
            <InfoRow
              label='Date Filed in eFiling / Court'
              value={caseData.filing_date ? formatDate(caseData.filing_date) : 'Not recorded'}
            />
            <InfoRow
              label='Court Type'
              value={optionLabel(COURT_TYPES, caseData.court_type || courtProceeding.court_type)}
            />
            <InfoRow
              label='Court Level'
              value={optionLabel(COURT_LEVELS, caseData.court_level || courtProceeding.court_level)}
            />
            <InfoRow label='Court Name' value={safe(courtName, 'Not recorded')} />
            <InfoRow label='Court Station' value={safe(caseData.court_station, 'Not recorded')} />
            <InfoRow label='Registry' value={safe(caseData.registry, 'Not recorded')} />
            <InfoRow label='Division' value={friendly(caseData.court_division, 'Not recorded')} />
            <InfoRow label='Court Location' value={safe(courtLocation, 'Not recorded')} />
            <InfoRow label='Courtroom' value={safe(caseData.courtroom, 'Not allocated')} />
            <InfoRow label='Judicial Officer' value={safe(caseData.judicial_officer, 'Not allocated')} />
            <InfoRow
              label='Next Court Date'
              value={caseData.next_court_date ? formatDateTime(caseData.next_court_date) : 'Not scheduled'}
            />
            <InfoRow label='eFiling Reference' value={safe(caseData.efiling_reference, 'Not recorded')} />
            <InfoRow label='Court Payment Reference' value={safe(caseData.payment_reference, 'Not recorded')} />
            <InfoRow label='Assessment Reference' value={safe(caseData.assessment_reference, 'Not recorded')} />
            <InfoRow label='CTS Reference' value={safe(caseData.cts_reference || courtProceeding.cts_reference, 'Not recorded')} />
          </div>

          <div className='mt-5 grid gap-4 lg:grid-cols-2'>
            <SectionNote>
              <p className='font-semibold'>Court details: recorded</p>
              <p className='mt-1'>
                These are the external court or eFiling facts supplied when the matter was registered in Sheria Master.
              </p>
            </SectionNote>
            <SectionNote tone={caseData.jurisdiction_verified ? 'info' : 'warning'}>
              <p className='font-semibold'>
                Jurisdiction verification: {caseData.jurisdiction_verified ? 'Verified' : 'Pending'}
              </p>
              <p className='mt-1'>
                {caseData.jurisdiction_verified
                  ? `Verified ${caseData.jurisdiction_verified_at ? `on ${formatDateTime(caseData.jurisdiction_verified_at)}` : ''}.`
                  : 'Court details have been captured, but professional jurisdiction verification has not been completed.'}
              </p>
            </SectionNote>
          </div>


          {hasVerifiedCts ? (
            <SectionNote tone='info'>
              <p className='font-semibold'>CTS reference verified</p>
              <p className='mt-1'>
                {safe(caseData.cts_reference || courtProceeding.cts_reference)} has been recorded from the court or eFiling record.
              </p>
              <p className='mt-1'>
                Further changes should be made through a separate audited correction workflow.
              </p>
            </SectionNote>
          ) : (
            <form onSubmit={handleCtsSubmit} className='mt-5 rounded-xl border border-border-light bg-surface-light p-5 dark:border-border-dark dark:bg-surface-dark'>
              <div className='mb-4'>
                <h4 className='font-semibold text-text-primary-light dark:text-text-primary-dark'>
                  CTS / Court Record Verification
                </h4>
                <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>
                  Record the CTS reference only after checking the Judiciary eFiling record, registry record, cause list, or stamped court documents.
                </p>
              </div>

              <div className='grid gap-4 md:grid-cols-2'>
                <div>
                  <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                    CTS reference
                  </label>
                  <input
                    value={ctsDraft.cts_reference}
                    onChange={(event) => setCtsDraft((current) => ({ ...current, cts_reference: event.target.value.toUpperCase() }))}
                    placeholder='e.g. CTS-HCCOMM-2026-001248'
                    className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
                  />
                  {ctsErrors.cts_reference && <p className='mt-1 text-sm text-error'>{ctsErrors.cts_reference}</p>}
                </div>
                <div>
                  <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                    Verification source
                  </label>
                  <input
                    value={ctsDraft.verification_source}
                    onChange={(event) => setCtsDraft((current) => ({ ...current, verification_source: event.target.value }))}
                    placeholder='Judiciary eFiling portal, court registry, cause list, stamped pleading'
                    className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
                  />
                  {ctsErrors.verification_source && <p className='mt-1 text-sm text-error'>{ctsErrors.verification_source}</p>}
                </div>
                <div className='md:col-span-2'>
                  <ElasticTextArea
                    label='Reason for verification'
                    value={ctsDraft.reason}
                    onChange={(event) => setCtsDraft((current) => ({ ...current, reason: event.target.value }))}
                    placeholder='CTS reference confirmed against the filed court record.'
                    error={ctsErrors.reason}
                  />
                </div>
                <div className='md:col-span-2'>
                  <ElasticTextArea
                    label='Verification notes'
                    value={ctsDraft.jurisdiction_notes}
                    onChange={(event) => setCtsDraft((current) => ({ ...current, jurisdiction_notes: event.target.value }))}
                    placeholder='Optional internal note on the court-record check.'
                  />
                </div>
              </div>

              <button
                type='submit'
                disabled={isVerifyingJurisdiction}
                className='mt-4 w-fit rounded-xl bg-brand-primary px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
              >
                {isVerifyingJurisdiction ? 'Recording...' : 'Verify CTS Reference'}
              </button>
            </form>
          )}

          <form onSubmit={handleJurisdictionSubmit} className='mt-5 rounded-xl border border-border-light bg-surface-light p-5 dark:border-border-dark dark:bg-surface-dark'>
            <div className='mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
              <div>
                <h4 className='font-semibold text-text-primary-light dark:text-text-primary-dark'>
                  Jurisdiction Verification
                </h4>
                <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>
                  Verify the court, level, station and claim value through the controlled jurisdiction workflow.
                </p>
              </div>
              <Select3D
                value={jurisdictionValues.action}
                onChange={(event) => setJurisdictionDraft((current) => ({ ...current, action: event.target.value }))}
                wrapperClassName='mb-0 md:w-64'
                options={[
                  { value: 'VERIFY', label: 'Verify jurisdiction' },
                  { value: 'REVOKE', label: 'Revoke verification' },
                ]}
              />
            </div>

            {jurisdictionValues.action === 'VERIFY' ? (
              <div className='grid gap-4 md:grid-cols-2'>
                <div>
                  <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                    Claim amount reviewed
                  </label>
                  <input
                    type='number'
                    value={jurisdictionValues.claim_amount}
                    onChange={(event) => setJurisdictionDraft((current) => ({ ...current, claim_amount: event.target.value }))}
                    className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
                  />
                  {jurisdictionErrors.claim_amount && <p className='mt-1 text-sm text-error'>{jurisdictionErrors.claim_amount}</p>}
                </div>
                <div>
                  <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                    Currency
                  </label>
                  <input
                    value={jurisdictionValues.currency}
                    onChange={(event) => setJurisdictionDraft((current) => ({ ...current, currency: event.target.value.toUpperCase() }))}
                    className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
                  />
                </div>
                <div>
                  <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                    Court type
                  </label>
                  <Select3D
                    value={jurisdictionValues.court_type}
                    onChange={(event) => setJurisdictionDraft((current) => ({ ...current, court_type: event.target.value }))}
                    wrapperClassName='mb-0'
                    placeholder='Select court type'
                    options={COURT_TYPES}
                  />
                </div>
                <div>
                  <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                    Court level
                  </label>
                  <Select3D
                    value={jurisdictionValues.court_level}
                    onChange={(event) => setJurisdictionDraft((current) => ({ ...current, court_level: event.target.value }))}
                    wrapperClassName='mb-0'
                    placeholder='Select court level'
                    options={COURT_LEVELS}
                  />
                  {jurisdictionErrors.court_level && <p className='mt-1 text-sm text-error'>{jurisdictionErrors.court_level}</p>}
                </div>
                <div>
                  <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                    Court station
                  </label>
                  <input
                    value={jurisdictionValues.court_station}
                    onChange={(event) => setJurisdictionDraft((current) => ({ ...current, court_station: event.target.value }))}
                    className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
                  />
                </div>
                <div>
                  <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                    Judicial officer rank, where relevant
                  </label>
                  <input
                    value={jurisdictionValues.judicial_officer_rank}
                    onChange={(event) => setJurisdictionDraft((current) => ({ ...current, judicial_officer_rank: event.target.value }))}
                    placeholder='Judge, magistrate, chairperson, or leave blank'
                    className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
                  />
                </div>
                <div className='md:col-span-2'>
                  <ElasticTextArea
                    label='Jurisdiction assessment notes'
                    value={jurisdictionValues.jurisdiction_notes}
                    onChange={(event) => setJurisdictionDraft((current) => ({ ...current, jurisdiction_notes: event.target.value }))}
                    error={jurisdictionErrors.jurisdiction_notes}
                  />
                </div>
              </div>
            ) : (
              <div>
                <ElasticTextArea
                  label='Reason for revocation'
                  value={jurisdictionDraft.reason}
                  onChange={(event) => setJurisdictionDraft((current) => ({ ...current, reason: event.target.value }))}
                  error={jurisdictionErrors.reason}
                />
              </div>
            )}

            {jurisdictionErrors.jurisdiction && (
              <p className='mt-3 text-sm text-error'>{jurisdictionErrors.jurisdiction}</p>
            )}

            <button
              type='submit'
              disabled={isVerifyingJurisdiction}
              className='mt-4 w-fit rounded-xl bg-brand-primary px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {isVerifyingJurisdiction
                ? 'Recording...'
                : jurisdictionValues.action === 'VERIFY'
                  ? 'Verify Jurisdiction'
                  : 'Revoke Verification'}
            </button>
          </form>

          {caseData.next_action && (
            <div className='mt-5'>
              <p className='text-xs font-semibold uppercase tracking-wide text-text-muted-light dark:text-text-muted-dark'>
                Next Action
              </p>
              <p className='mt-1 text-sm text-text-primary-light dark:text-text-primary-dark'>
                {caseData.next_action}
              </p>
            </div>
          )}

          {(caseData.jurisdiction_warnings || []).length > 0 && (
            <div className='mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100'>
              <p className='mb-2 font-semibold'>Jurisdiction and filing checks</p>
              {(caseData.jurisdiction_warnings || []).map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card className='p-6'>
        <h3 className='mb-4 text-lg font-semibold text-text-primary-light dark:text-text-primary-dark'>
          Parties
        </h3>

        {caseData.parties?.length ? (
          <div className='grid gap-5 lg:grid-cols-3'>
            {[
              ['Represented Client', representedParties, 'Firm Client'],
              ['Adverse Parties', adverseParties, 'Adverse Party'],
              ['Other Parties', otherParties, 'Other Party'],
            ].map(([title, parties, fallbackRole]) => (
              <div key={title} className={panelClass}>
                <h4 className='mb-3 font-semibold text-text-primary-light dark:text-text-primary-dark'>
                  {title}
                </h4>
                {parties.length ? (
                  <div className='space-y-3'>
                    {parties.map((party) => (
                      <div key={party.id} className='border-b border-border-light pb-3 last:border-b-0 last:pb-0 dark:border-border-dark'>
                        <p className='font-semibold text-text-primary-light dark:text-text-primary-dark'>
                          {safe(party.name)}
                        </p>
                        <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>
                          {party.role_label || friendly(party.party_role, fallbackRole)}
                        </p>
                        <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>
                          {[party.email, party.phone_number].filter(Boolean).join(' • ') || 'Contact details not recorded'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>
                    None recorded.
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className='text-text-muted-light dark:text-text-muted-dark'>
            No structured party records yet.
          </p>
        )}
      </Card>

      <Card className='p-6'>
        <h3 className='mb-4 text-lg font-semibold text-text-primary-light dark:text-text-primary-dark'>
          Monetary Relief
        </h3>

        {monetaryRelief ? (
          <div className='grid gap-5 md:grid-cols-2 xl:grid-cols-4'>
            <InfoRow label='Relief Type' value={friendly(monetaryRelief.relief_type)} />
            <InfoRow label='Currency' value={safe(monetaryRelief.currency || caseData.currency, 'KES')} />
            <InfoRow
              label='Principal Claim'
              value={formatMoney(monetaryRelief.principal_amount, monetaryRelief.currency)}
            />
            <InfoRow
              label='Amount Already Paid'
              value={formatMoney(monetaryRelief.amount_already_paid, monetaryRelief.currency)}
            />
            <InfoRow
              label='Outstanding Amount'
              value={formatMoney(monetaryRelief.outstanding_amount, monetaryRelief.currency)}
            />
            <InfoRow
              label='Estimated Matter Value'
              value={formatMoney(monetaryRelief.estimated_matter_value, monetaryRelief.currency)}
            />
            <InfoRow
              label='Interest Claimed'
              value={monetaryRelief.interest_claimed ? 'Yes' : 'No'}
            />
            <InfoRow
              label='Amount To Be Assessed'
              value={monetaryRelief.amount_to_be_assessed ? 'Yes' : 'No'}
            />
          </div>
        ) : (
          <p className='text-text-muted-light dark:text-text-muted-dark'>
            No monetary relief record has been captured for this matter.
          </p>
        )}
      </Card>

      <CaseProcedurePanels caseData={caseData} />

      <Card className='p-6'>
        <h3 className='mb-4 text-lg font-semibold text-text-primary-light dark:text-text-primary-dark'>
          Case Management
        </h3>

        <div className='grid gap-4 md:grid-cols-[1fr_auto] md:items-end'>
          <div>
            <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
              Priority
            </label>

            <Select3D
              value={selectedPriority || caseData.priority || ''}
              onChange={(event) => setSelectedPriority(event.target.value)}
              wrapperClassName='mb-0'
              options={PRIORITIES}
            />
          </div>

          <button
            type='button'
            onClick={handlePriorityUpdate}
            disabled={
              isUpdatingCase ||
              !selectedPriority ||
              selectedPriority === caseData.priority
            }
            className='rounded-xl bg-brand-primary px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
          >
            {isUpdatingCase ? 'Updating...' : 'Update Priority'}
          </button>
        </div>
      </Card>

      <Card className='p-6'>
        <h3 className='mb-4 text-lg font-semibold text-text-primary-light dark:text-text-primary-dark'>
          Assignments
        </h3>

        <div className='grid gap-8 md:grid-cols-2'>
          {/* Lawyer Assignment */}
          <div>
            <div className='rounded-xl border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark'>
              <h4 className='mb-3 font-semibold text-text-primary-light dark:text-text-primary-dark'>
                Assigned Lawyer
              </h4>

              <p className='text-text-primary-light dark:text-text-primary-dark'>
                {safe(caseData.assigned_lawyer?.full_name, 'Not Assigned')}
              </p>

              <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>
                {safe(caseData.assigned_lawyer?.email)}
              </p>
            </div>

            <div className='mt-4 space-y-3'>
              <Select3D
                value={selectedLawyer}
                onChange={(e) => setSelectedLawyer(e.target.value)}
                wrapperClassName='mb-0'
                placeholder='Select Lawyer'
                options={selectableLawyers.map((lawyer) => ({
                  value: lawyer.membership_id,
                  label: lawyer.full_name,
                }))}
              />

              <button
                onClick={handleReassign}
                disabled={!selectedLawyer || isReassigning}
                className='w-full rounded-xl bg-brand-primary px-4 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
              >
                {isReassigning ? 'Reassigning...' : 'Reassign Lawyer'}
              </button>
            </div>
          </div>

          <div>
            <div className='rounded-xl border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark'>
              <h4 className='mb-3 font-semibold text-text-primary-light dark:text-text-primary-dark'>
                Assigned Secretary
              </h4>

              <p className='text-text-primary-light dark:text-text-primary-dark'>
                {safe(caseData.assigned_secretary?.full_name, 'Not Assigned')}
              </p>

              <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>
                {safe(caseData.assigned_secretary?.email)}
              </p>
            </div>

            <div className='mt-4 space-y-3'>
              <Select3D
                value={selectedSecretary}
                onChange={(e) => setSelectedSecretary(e.target.value)}
                wrapperClassName='mb-0'
                placeholder='Select Secretary'
                options={selectableSecretaries.map((secretary) => ({
                  value: secretary.membership_id,
                  label: secretary.full_name,
                }))}
              />

              <button
                onClick={handleSecretaryReassign}
                disabled={!selectedSecretary || isReassigningSecretary}
                className='w-full rounded-xl bg-brand-primary px-4 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
              >
                {isReassigningSecretary ? 'Reassigning...' : 'Reassign Secretary'}
              </button>
            </div>
          </div>
        </div>
      </Card>

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
          Timeline
        </h3>

        {timeline.length === 0 ? (
          <p className='text-text-muted-light dark:text-text-muted-dark'>
            No timeline records available.
          </p>
        ) : (
          <div className='space-y-3'>
            {timeline.map((item, index) => (
              <div
                key={item.id || index}
                className='rounded-xl border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark'
              >
                <p className='font-semibold text-text-primary-light dark:text-text-primary-dark'>
                  {safe(item.action)}
                </p>

                <p className='mt-1 text-text-muted-light dark:text-text-muted-dark'>
                  {safe(item.description)}
                </p>

                <p className='mt-3 text-sm text-text-muted-light dark:text-text-muted-dark'>
                  {item.created_at ? formatDateTime(item.created_at) : 'N/A'}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className='p-6'>
        <h3 className='mb-4 text-lg font-semibold text-text-primary-light dark:text-text-primary-dark'>
          Upcoming Event
        </h3>
        {events[0] ? (
          <div className='rounded-xl border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark'>
            <p className='font-semibold text-text-primary-light dark:text-text-primary-dark'>{events[0].title}</p>
            <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>
              {friendly(events[0].event_type)} · {friendly(events[0].status)} · {events[0].starts_at ? formatDateTime(events[0].starts_at) : 'Time not set'}
            </p>
            <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>
              Hearing mode: {friendly(events[0].hearing_mode || 'NOT_APPLICABLE')}
            </p>
          </div>
        ) : (
          <p className='text-text-muted-light dark:text-text-muted-dark'>No upcoming event scheduled.</p>
        )}
      </Card>

      <Card className='p-6'>
        <h3 className='mb-4 text-lg font-semibold text-text-primary-light dark:text-text-primary-dark'>
          Court Events
        </h3>

        {!isEventFormOpen && (
          <button
            type='button'
            onClick={() => setIsEventFormOpen(true)}
            className='mb-6 w-fit rounded-xl bg-brand-primary px-5 py-3 font-medium text-white transition hover:opacity-90'
          >
            Add Court Event
          </button>
        )}

        {isEventFormOpen && (
        <form
          onSubmit={handleCaseEventSubmit}
          className='mb-6 rounded-xl border border-border-light bg-surface-light p-5 dark:border-border-dark dark:bg-surface-dark'
        >
          <div className='mb-4'>
            <h4 className='font-semibold text-text-primary-light dark:text-text-primary-dark'>
              Create Court Event / Court Diary Entry
            </h4>
            <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>
              Record mentions, directions, pre-trial conferences, hearings, rulings, judgment delivery, service steps and registry follow-ups as separate events.
            </p>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <div>
              <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                Event type
              </label>
              <Select3D
                value={eventDraft.event_type}
                onChange={(event) => handleEventTypeChange(event.target.value)}
                wrapperClassName='mb-0'
                options={COURT_EVENT_TYPES}
              />
              {eventErrors.event_type && <p className='mt-1 text-sm text-error'>{eventErrors.event_type}</p>}
            </div>

            <div>
              <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                Event subtype / Kenyan court purpose
              </label>
              <input
                value={eventDraft.event_subtype}
                onChange={(event) => setEventDraft((current) => ({ ...current, event_subtype: event.target.value }))}
                className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
              />
            </div>

            <div>
              <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                Event title
              </label>
              <input
                value={eventDraft.title}
                onChange={(event) => setEventDraft((current) => ({ ...current, title: event.target.value }))}
                className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
              />
              {eventErrors.title && <p className='mt-1 text-sm text-error'>{eventErrors.title}</p>}
            </div>

            <div>
              <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                Event status
              </label>
              <input
                value='Scheduled'
                readOnly
                className='w-full rounded-xl border border-border-light bg-background-light px-4 py-3 text-text-muted-light dark:border-border-dark dark:bg-background-dark dark:text-text-muted-dark'
              />
            </div>

            <div>
              <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                Date and time
              </label>
              <input
                type='datetime-local'
                value={eventDraft.starts_at}
                onChange={(event) => setEventDraft((current) => ({ ...current, starts_at: event.target.value }))}
                className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
              />
              {eventErrors.starts_at && <p className='mt-1 text-sm text-error'>{eventErrors.starts_at}</p>}
            </div>

            <div>
              <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                End time, if allocated
              </label>
              <input
                type='datetime-local'
                value={eventDraft.ends_at}
                onChange={(event) => setEventDraft((current) => ({ ...current, ends_at: event.target.value }))}
                className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
              />
              {eventErrors.ends_at && <p className='mt-1 text-sm text-error'>{eventErrors.ends_at}</p>}
            </div>

            <div>
              <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                Hearing mode
              </label>
              <Select3D
                value={eventDraft.hearing_mode}
                onChange={(event) => setEventDraft((current) => ({ ...current, hearing_mode: event.target.value }))}
                wrapperClassName='mb-0'
                options={HEARING_MODES}
              />
            </div>

            <div>
              <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                Court / tribunal
              </label>
              <input
                value={eventDraft.court}
                onChange={(event) => setEventDraft((current) => ({ ...current, court: event.target.value }))}
                placeholder={courtName || 'High Court of Kenya'}
                className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
              />
            </div>

            <div>
              <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                Court station
              </label>
              <input
                value={eventDraft.court_station}
                onChange={(event) => setEventDraft((current) => ({ ...current, court_station: event.target.value }))}
                placeholder={caseData.court_station || 'Nairobi'}
                className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
              />
            </div>

            <div>
              <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                Courtroom / virtual courtroom label
              </label>
              <input
                value={eventDraft.courtroom}
                onChange={(event) => setEventDraft((current) => ({ ...current, courtroom: event.target.value }))}
                placeholder='Leave blank if not allocated'
                className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
              />
            </div>

            <div>
              <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                Judicial officer
              </label>
              <input
                value={eventDraft.judicial_officer}
                onChange={(event) => setEventDraft((current) => ({ ...current, judicial_officer: event.target.value }))}
                placeholder='Judge, deputy registrar, magistrate, chairperson, or leave blank'
                className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
              />
            </div>

            {eventDraft.hearing_mode !== 'PHYSICAL' && eventDraft.hearing_mode !== 'NOT_APPLICABLE' && (
              <>
                <div>
                  <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                    Virtual link, if supplied by court
                  </label>
                  <input
                    value={eventDraft.virtual_meeting_url}
                    onChange={(event) => setEventDraft((current) => ({ ...current, virtual_meeting_url: event.target.value }))}
                    placeholder='Do not enter public links unless authorized'
                    className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
                  />
                </div>
                <div>
                  <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                    Virtual access instructions
                  </label>
                  <input
                    value={eventDraft.virtual_access_instructions}
                    onChange={(event) => setEventDraft((current) => ({ ...current, virtual_access_instructions: event.target.value }))}
                    placeholder='Meeting ID, cause list note, or access instruction'
                    className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
                  />
                </div>
              </>
            )}

            {eventDraft.hearing_mode !== 'VIRTUAL' && eventDraft.hearing_mode !== 'NOT_APPLICABLE' && (
              <div className='md:col-span-2'>
                <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                  Physical venue
                </label>
                <input
                  value={eventDraft.physical_venue}
                  onChange={(event) => setEventDraft((current) => ({ ...current, physical_venue: event.target.value }))}
                  placeholder={courtLocation || 'Milimani Law Courts, Nairobi'}
                  className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
                />
              </div>
            )}

            <div className='md:col-span-2'>
              <ElasticTextArea
                label='Agenda / purpose'
                value={eventDraft.description}
                onChange={(event) => setEventDraft((current) => ({ ...current, description: event.target.value }))}
                error={eventErrors.description}
              />
            </div>

            <div className='md:col-span-2'>
              <ElasticTextArea
                label='Orders, directions or notes after event'
                value={eventDraft.orders_directions}
                onChange={(event) => setEventDraft((current) => ({ ...current, orders_directions: event.target.value }))}
                placeholder='Leave blank until the event has happened or directions are known'
              />
            </div>

            <div>
              <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                Next action
              </label>
              <input
                value={eventDraft.next_action}
                onChange={(event) => setEventDraft((current) => ({ ...current, next_action: event.target.value }))}
                className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
              />
            </div>

            <div>
              <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                Next event date, if given
              </label>
              <input
                type='datetime-local'
                value={eventDraft.next_date}
                onChange={(event) => setEventDraft((current) => ({ ...current, next_date: event.target.value }))}
                className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
              />
            </div>
          </div>

          <label className='mt-4 flex items-center gap-3 text-sm text-text-primary-light dark:text-text-primary-dark'>
            <input
              type='checkbox'
              checked={eventDraft.is_client_visible}
              onChange={(event) => setEventDraft((current) => ({ ...current, is_client_visible: event.target.checked }))}
              className='h-4 w-4 rounded border-border-light text-brand-primary focus:ring-brand-primary dark:border-border-dark'
            />
            Visible to client portal where permitted
          </label>

          {eventErrors.non_field_errors && <p className='mt-3 text-sm text-error'>{eventErrors.non_field_errors}</p>}
          {eventErrors.detail && <p className='mt-3 text-sm text-error'>{eventErrors.detail}</p>}

          <div className='mt-5 flex flex-wrap gap-3'>
            <button
              type='submit'
              disabled={isCreatingCaseEvent}
              className='w-fit rounded-xl bg-brand-primary px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {isCreatingCaseEvent ? 'Recording...' : 'Create Court Event'}
            </button>
            <button
              type='button'
              disabled={isCreatingCaseEvent}
              onClick={() => {
                setEventErrors({});
                setIsEventFormOpen(false);
              }}
              className='w-fit rounded-xl border border-border-light px-5 py-3 font-medium text-text-primary-light transition hover:bg-background-light disabled:cursor-not-allowed disabled:opacity-50 dark:border-border-dark dark:text-text-primary-dark dark:hover:bg-background-dark'
            >
              Cancel
            </button>
          </div>
        </form>
        )}

        {events.length === 0 ? (
          <p className='text-text-muted-light dark:text-text-muted-dark'>
            No events available.
          </p>
        ) : (
          <div className='space-y-3'>
            {events.map((event, index) => (
              <div
                key={event.id || index}
                className='rounded-xl border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark'
              >
                <p className='font-semibold text-text-primary-light dark:text-text-primary-dark'>
                  {safe(event.title)}
                </p>
                <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>
                  {friendly(event.event_type)} · {friendly(event.status)} · {event.starts_at ? formatDateTime(event.starts_at) : 'Time not set'}
                </p>
                <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>
                  Mode: {friendly(event.hearing_mode || 'NOT_APPLICABLE')}
                  {event.courtroom ? ` · Courtroom: ${event.courtroom}` : ''}
                  {event.judicial_officer ? ` · Judicial officer: ${event.judicial_officer}` : ''}
                </p>
                {event.virtual_meeting_url && (
                  <p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>
                    Virtual link recorded for permitted viewers.
                  </p>
                )}
                {event.orders_directions && (
                  <p className='mt-2 text-sm text-text-primary-light dark:text-text-primary-dark'>
                    {event.orders_directions}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className='p-6'>
        <h3 className='mb-4 text-lg font-semibold text-text-primary-light dark:text-text-primary-dark'>
          Activity Log
        </h3>
        {(caseData.activities || []).length ? (
          <div className='space-y-3'>
            {(caseData.activities || []).map((activity) => (
              <div key={activity.id} className='rounded-xl border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark'>
                <p className='font-semibold text-text-primary-light dark:text-text-primary-dark'>{activity.action}</p>
                <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>{activity.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className='text-text-muted-light dark:text-text-muted-dark'>No activity recorded.</p>
        )}
      </Card>

      <Card className='p-6'>
        <h3 className='mb-4 text-lg font-semibold text-text-primary-light dark:text-text-primary-dark'>
          Documents
        </h3>

        {documents.length === 0 ? (
          <p className='text-text-muted-light dark:text-text-muted-dark'>
            No documents uploaded.
          </p>
        ) : (
          <div className='space-y-3'>
            {documents.map((document, index) => (
              <div
                key={document.id || index}
                className='rounded-xl border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark'
              >
                <p className='text-text-primary-light dark:text-text-primary-dark'>
                  {document.name || document.title || 'Document'}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className='p-6'>
        <h3 className='mb-4 text-lg font-semibold text-text-primary-light dark:text-text-primary-dark'>
          Tasks and Deadlines
        </h3>
        {tasks.length === 0 ? (
          <p className='text-text-muted-light dark:text-text-muted-dark'>
            No tasks or deadlines recorded.
          </p>
        ) : (
          <div className='space-y-3'>
            {tasks.map((task, index) => (
              <div key={task.id || index} className='rounded-xl border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark'>
                <p className='font-semibold text-text-primary-light dark:text-text-primary-dark'>
                  {task.title || task.action || 'Task'}
                </p>
                <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>
                  {task.due_date ? formatDateTime(task.due_date) : 'No due date'}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminCaseDetailsPage;
