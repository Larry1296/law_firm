import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Swal from '@/core/utils/themedSwal';

import StatsCard from '@/components/ui/StatsCard';
import SectionHeading from '@/components/ui/SectionHeading';
import BackLink from '@/components/ui/BackLink';
import Card from '@/components/ui/Card';
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
  } = useCaseDetails(id);

  const [selectedLawyer, setSelectedLawyer] = useState('');
  const [selectedSecretary, setSelectedSecretary] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [transitionDraft, setTransitionDraft] = useState({
    key: '',
    effective_at: '',
    reason: '',
    metadata: '',
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
  const conflictCheck = caseData.conflict_check;
  const conflictRecord = caseData.conflict_record;
  const conflictStatus = conflictCheck?.status || conflictRecord?.status || 'NOT_STARTED';
  const conflictReviewed = Boolean(conflictCheck?.reviewed_at && conflictCheck?.reviewed_by);
  const conflictDisplayTitle = conflictCheck
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
  const backendActions = Array.isArray(conflictCheck?.available_actions)
    ? conflictCheck.available_actions
    : null;
  const conflictActions = (backendActions || (conflictActionsByStatus[conflictStatus] || []).map((action) => action.value))
    .map((action) => ({ value: action, label: conflictActionLabels[action] || friendly(action) }));

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

    const transition = (caseData.available_transitions || []).find(
      (item) => `${item.dimension}:${item.to_state}` === transitionDraft.key,
    );
    if (!transition) return;

    let metadata = {};
    if (transitionDraft.metadata.trim()) {
      try {
        metadata = JSON.parse(transitionDraft.metadata);
      } catch {
        Swal.fire({
          icon: 'error',
          title: 'Invalid metadata',
          text: 'Transition metadata must be valid JSON.',
        });
        return;
      }
    }

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
      setTransitionDraft({ key: '', effective_at: '', reason: '', metadata: '' });
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
    if (!conflictDraft.action || !conflictDraft.reason.trim()) {
      setConflictErrors({
        action: !conflictDraft.action ? 'Choose a conflict-check action.' : '',
        reason: !conflictDraft.reason.trim() ? 'Reason is required.' : '',
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
            value={safe(caseData.internal_case_number || caseData.case_number)}
          />
          <InfoRow
            label='Official Court Case Number'
            value={isCourtMatter ? safe(caseData.official_court_case_number, 'Not recorded') : 'Not applicable'}
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
              value={friendly(caseData.client?.access_type)}
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
            <select
              value={transitionDraft.key}
              onChange={(event) => setTransitionDraft((current) => ({ ...current, key: event.target.value }))}
              className='rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
            >
              <option value=''>Choose permitted transition</option>
              {(caseData.available_transitions || []).map((transition) => (
                <option
                  key={`${transition.dimension}:${transition.to_state}`}
                  value={`${transition.dimension}:${transition.to_state}`}
                >
                  {friendly(transition.dimension)}: {friendly(transition.from_state)} to {transition.label || friendly(transition.to_state)}
                </option>
              ))}
            </select>
            <input
              type='datetime-local'
              value={transitionDraft.effective_at}
              onChange={(event) => setTransitionDraft((current) => ({ ...current, effective_at: event.target.value }))}
              className='rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
            />
            <textarea
              value={transitionDraft.reason}
              onChange={(event) => setTransitionDraft((current) => ({ ...current, reason: event.target.value }))}
              placeholder='Reason or description'
              className='min-h-24 rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark lg:col-span-2'
            />
            <textarea
              value={transitionDraft.metadata}
              onChange={(event) => setTransitionDraft((current) => ({ ...current, metadata: event.target.value }))}
              placeholder='Optional JSON metadata, for example filing references'
              className='min-h-24 rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark lg:col-span-2'
            />
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
            No ordinary transitions are currently available for your role.
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

        {(conflictCheck?.result_summary || conflictRecord?.result_summary) && (
          <p className='mt-4 text-text-primary-light dark:text-text-primary-dark'>
            <strong>Safe result summary:</strong> {conflictCheck?.result_summary || conflictRecord?.result_summary}
          </p>
        )}

        {conflictCheck?.internal_notes && (
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
              <select
                value={conflictDraft.action}
                onChange={(event) => setConflictDraft((current) => ({ ...current, action: event.target.value }))}
                className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
              >
                <option value=''>Choose conflict-check action</option>
                {conflictActions.map((action) => (
                  <option key={action.value} value={action.value}>
                    {action.label}
                  </option>
                ))}
              </select>
              {conflictErrors.action && <p className='mt-1 text-sm text-error'>{conflictErrors.action}</p>}
            </div>
            <div>
              <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                Review date and time
              </label>
              <input
                type='datetime-local'
                value={conflictDraft.effective_at}
                onChange={(event) => setConflictDraft((current) => ({ ...current, effective_at: event.target.value }))}
                className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
              />
              {conflictErrors.effective_at && <p className='mt-1 text-sm text-error'>{conflictErrors.effective_at}</p>}
            </div>
            {conflictDraft.action === 'MARK_CLEAR' && conflictCheck?.result_summary && (
              <div className='rounded-xl border border-border-light bg-surface-light p-4 text-sm text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark lg:col-span-2'>
                <p><strong>Reviewer:</strong> {safe(conflictCheck.reviewed_by_name)}</p>
                <p><strong>Review date:</strong> {conflictCheck.reviewed_at ? formatDateTime(conflictCheck.reviewed_at) : 'Not reviewed'}</p>
                <p className='mt-2'><strong>Review result:</strong> {conflictCheck.result_summary}</p>
              </div>
            )}
            <div className='lg:col-span-2'>
              <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                Reason for review
              </label>
              <textarea
                value={conflictDraft.reason}
                onChange={(event) => setConflictDraft((current) => ({ ...current, reason: event.target.value }))}
                placeholder='Reason or description'
                className='min-h-24 w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
              />
              {conflictErrors.reason && <p className='mt-1 text-sm text-error'>{conflictErrors.reason}</p>}
            </div>
            <div>
              <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                Review result summary
              </label>
              <textarea
                value={conflictDraft.result_summary}
                onChange={(event) => setConflictDraft((current) => ({ ...current, result_summary: event.target.value }))}
                placeholder='Safe result summary'
                disabled={conflictDraft.action === 'MARK_CLEAR'}
                className='min-h-24 w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light disabled:opacity-60 dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
              />
              {conflictErrors.result_summary && <p className='mt-1 text-sm text-error'>{conflictErrors.result_summary}</p>}
            </div>
            <div>
              <label className='mb-2 block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
                Internal notes — not visible to client
              </label>
              <textarea
                value={conflictDraft.internal_notes}
                onChange={(event) => setConflictDraft((current) => ({ ...current, internal_notes: event.target.value }))}
                placeholder='Internal notes — not visible to client'
                disabled={conflictDraft.action === 'MARK_CLEAR'}
                className='min-h-24 w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light disabled:opacity-60 dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
              />
              {conflictErrors.internal_notes && <p className='mt-1 text-sm text-error'>{conflictErrors.internal_notes}</p>}
            </div>
            <textarea
              value={conflictDraft.waiver_details}
              onChange={(event) => setConflictDraft((current) => ({ ...current, waiver_details: event.target.value }))}
              placeholder='Waiver details, when applicable'
              className='min-h-24 rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark lg:col-span-2'
            />
            <button
              type='submit'
              disabled={isUpdatingConflictCheck}
              className='rounded-xl bg-brand-primary px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
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
              value={safe(caseData.official_court_case_number || courtProceeding.official_court_case_number, 'Not recorded')}
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
            <InfoRow label='CTS Reference' value={safe(caseData.cts_reference, 'Pending verification')} />
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

            <select
              value={selectedPriority || caseData.priority || ''}
              onChange={(event) => setSelectedPriority(event.target.value)}
              className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light shadow-soft transition focus:border-brand-primary focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
            >
              {PRIORITIES.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
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
              <select
                value={selectedLawyer}
                onChange={(e) => setSelectedLawyer(e.target.value)}
                className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light shadow-soft focus:border-brand-primary focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
              >
                <option value=''>Select Lawyer</option>

                {selectableLawyers.map((lawyer) => (
                  <option
                    key={lawyer.membership_id}
                    value={lawyer.membership_id}
                  >
                    {lawyer.full_name}
                  </option>
                ))}
              </select>

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
              <select
                value={selectedSecretary}
                onChange={(e) => setSelectedSecretary(e.target.value)}
                className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light shadow-soft transition focus:border-brand-primary focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
              >
                <option value=''>Select Secretary</option>
                {selectableSecretaries.map((secretary) => (
                  <option
                    key={secretary.membership_id}
                    value={secretary.membership_id}
                  >
                    {secretary.full_name}
                  </option>
                ))}
              </select>

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
