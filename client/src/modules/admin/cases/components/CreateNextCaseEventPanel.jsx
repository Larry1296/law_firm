import React, { useState, useMemo } from 'react';
import Swal from '@/core/utils/themedSwal';
import Button3D from '@/components/ui/Button3D';
import Select3D from '@/components/ui/Select3D';

/**
 * Valid next event types per court stage.
 * Mirrors EventService.VALID_EVENT_TYPES_BY_COURT_STAGE on the backend.
 */
const VALID_EVENT_TYPES_BY_COURT_STAGE = {
  NOT_APPLICABLE: ['INTERNAL', 'CLIENT_MEETING', 'ADMINISTRATIVE', 'OTHER'],
  NOT_FILED: ['INTERNAL', 'CLIENT_MEETING', 'FILING', 'ADMINISTRATIVE', 'SETTLEMENT', 'ADR', 'MEDIATION', 'OTHER'],
  READY_FOR_FILING: ['FILING', 'INTERNAL', 'CLIENT_MEETING', 'REGISTRY_ACTION', 'ADMINISTRATIVE', 'OTHER'],
  FILED: ['REGISTRY_ACTION', 'SERVICE', 'MENTION', 'DIRECTIONS', 'INTERNAL', 'ADMINISTRATIVE', 'OTHER'],
  AWAITING_ASSESSMENT_OR_PAYMENT: ['REGISTRY_ACTION', 'MENTION', 'INTERNAL', 'ADMINISTRATIVE', 'OTHER'],
  AWAITING_SERVICE: ['SERVICE', 'REGISTRY_ACTION', 'MENTION', 'INTERNAL', 'OTHER'],
  SERVICE_IN_PROGRESS: ['SERVICE', 'MENTION', 'INTERNAL', 'OTHER'],
  AWAITING_RESPONSE: ['MENTION', 'DIRECTIONS', 'INTERNAL', 'OTHER'],
  PLEADINGS_OPEN: ['MENTION', 'DIRECTIONS', 'INTERNAL', 'OTHER'],
  PLEADINGS_CLOSED: ['CASE_MANAGEMENT', 'MENTION', 'DIRECTIONS', 'SETTLEMENT', 'ADR', 'MEDIATION', 'INTERNAL', 'OTHER'],
  CASE_MANAGEMENT: ['PRE_TRIAL', 'MENTION', 'DIRECTIONS', 'SETTLEMENT', 'ADR', 'MEDIATION', 'HEARING', 'INTERNAL', 'OTHER'],
  PRE_TRIAL: ['HEARING', 'MENTION', 'DIRECTIONS', 'SETTLEMENT', 'INTERNAL', 'OTHER'],
  AWAITING_HEARING: ['HEARING', 'MENTION', 'SETTLEMENT', 'INTERNAL', 'OTHER'],
  HEARING_IN_PROGRESS: ['HEARING', 'SUBMISSIONS', 'RULING', 'MENTION', 'SETTLEMENT', 'INTERNAL', 'OTHER'],
  SUBMISSIONS: ['RULING', 'JUDGMENT', 'MENTION', 'INTERNAL', 'OTHER'],
  JUDGMENT_RESERVED: ['JUDGMENT', 'RULING', 'MENTION', 'INTERNAL', 'OTHER'],
  JUDGMENT_DELIVERED: ['TAXATION', 'EXECUTION', 'APPEAL', 'REVIEW', 'MENTION', 'INTERNAL', 'OTHER'],
  DECREE_EXTRACTION: ['EXECUTION', 'TAXATION', 'APPEAL', 'MENTION', 'REGISTRY_ACTION', 'INTERNAL', 'OTHER'],
  EXECUTION: ['EXECUTION', 'TAXATION', 'MENTION', 'RULING', 'APPEAL', 'INTERNAL', 'OTHER'],
  APPEAL_OR_REVIEW: ['APPEAL', 'REVIEW', 'HEARING', 'MENTION', 'SUBMISSIONS', 'JUDGMENT', 'RULING', 'INTERNAL', 'OTHER'],
  CONCLUDED: ['APPEAL', 'REVIEW', 'TAXATION', 'INTERNAL', 'ADMINISTRATIVE', 'OTHER'],
};

const ALL_EVENT_TYPE_LABELS = {
  INTERNAL: 'Internal',
  FILING: 'Filing',
  SERVICE: 'Service',
  MENTION: 'Mention',
  CASE_MANAGEMENT: 'Case Management',
  HEARING: 'Hearing',
  DIRECTIONS: 'Directions',
  PRE_TRIAL: 'Pre-Trial Conference',
  SETTLEMENT: 'Settlement',
  ADR: 'Alternative Dispute Resolution',
  MEDIATION: 'Mediation',
  SUBMISSIONS: 'Submissions',
  RULING: 'Ruling',
  JUDGMENT: 'Judgment',
  APPEAL: 'Appeal',
  REVIEW: 'Review',
  ADMINISTRATIVE: 'Administrative',
  TAXATION: 'Taxation',
  EXECUTION: 'Execution',
  REGISTRY_ACTION: 'Registry Action',
  CLIENT_MEETING: 'Client Meeting',
  OTHER: 'Other',
};

const HEARING_MODES = [
  { value: 'VIRTUAL', label: 'Virtual' },
  { value: 'PHYSICAL', label: 'Physical' },
  { value: 'HYBRID', label: 'Hybrid' },
  { value: 'NOT_APPLICABLE', label: 'Not applicable' },
];

const formatDaysRemaining = (dateStr) => {
  if (!dateStr) return null;
  const eventDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  eventDate.setHours(0, 0, 0, 0);
  const diff = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'Past due';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `${diff} days away`;
};

export default function CreateNextCaseEventPanel({
  caseData,
  onCreateEvent,
  isCreating,
}) {
  const suggestion = caseData?.next_event_suggestion || null;
  const courtStage = caseData?.court_stage || 'NOT_FILED';

  const validTypes = useMemo(() => {
    const types = VALID_EVENT_TYPES_BY_COURT_STAGE[courtStage] || ['INTERNAL', 'MENTION', 'OTHER'];
    return types.map((type) => ({
      value: type,
      label: ALL_EVENT_TYPE_LABELS[type] || type,
    }));
  }, [courtStage]);

  const defaultEventType = useMemo(() => {
    if (suggestion?.next_action) {
      const match = validTypes.find(
        (t) => t.label.toLowerCase() === suggestion.next_action.toLowerCase()
      );
      if (match) return match.value;
    }
    return validTypes[0]?.value || 'MENTION';
  }, [suggestion, validTypes]);

  const toLocalDateTimeInput = (isoStr) => {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const [draft, setDraft] = useState({
    event_type: defaultEventType,
    title: suggestion?.next_action || '',
    description: suggestion
      ? `Following: ${suggestion.source_event_title}`
      : '',
    starts_at: toLocalDateTimeInput(suggestion?.next_date),
    ends_at: '',
    hearing_mode: 'VIRTUAL',
    court: caseData?.court_name || caseData?.court_station || '',
    court_station: caseData?.court_station || '',
    courtroom: '',
    judicial_officer: caseData?.judicial_officer || '',
    virtual_meeting_url: '',
    physical_venue: '',
    is_client_visible: true,
    next_action: '',
    next_date: '',
  });

  const [errors, setErrors] = useState({});

  const daysRemaining = formatDaysRemaining(draft.starts_at);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isCreating) return;
    setErrors({});

    const errs = {};
    if (!draft.event_type) errs.event_type = 'Select an event type.';
    if (!draft.title.trim()) errs.title = 'Enter the event title.';
    if (!draft.starts_at) errs.starts_at = 'Enter the event date and time.';
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    const payload = {
      case_id: caseData.id,
      event_type: draft.event_type,
      title: draft.title.trim(),
      description: draft.description.trim(),
      starts_at: new Date(draft.starts_at).toISOString(),
      ends_at: draft.ends_at ? new Date(draft.ends_at).toISOString() : null,
      hearing_mode: draft.hearing_mode,
      court: draft.court.trim(),
      court_station: draft.court_station.trim(),
      courtroom: draft.courtroom.trim(),
      judicial_officer: draft.judicial_officer.trim(),
      virtual_meeting_url: draft.virtual_meeting_url.trim(),
      physical_venue: draft.physical_venue.trim(),
      is_client_visible: draft.is_client_visible,
      next_action: draft.next_action.trim(),
      next_date: draft.next_date ? new Date(draft.next_date).toISOString() : null,
      notify_participants: true,
    };

    try {
      await onCreateEvent({ caseId: caseData.id, payload });
      setDraft({
        event_type: validTypes[0]?.value || 'MENTION',
        title: '',
        description: '',
        starts_at: '',
        ends_at: '',
        hearing_mode: 'VIRTUAL',
        court: caseData?.court_name || '',
        court_station: caseData?.court_station || '',
        courtroom: '',
        judicial_officer: '',
        virtual_meeting_url: '',
        physical_venue: '',
        is_client_visible: true,
        next_action: '',
        next_date: '',
      });
      Swal.fire({
        icon: 'success',
        title: 'Next event created',
        text: 'All participants have been notified.',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      const backendErrors = error?.response?.data || {};
      setErrors(
        Object.fromEntries(
          Object.entries(backendErrors).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.join(' ') : String(value),
          ])
        )
      );
      Swal.fire({
        icon: 'error',
        title: 'Failed to create event',
        text:
          backendErrors.detail ||
          'Could not create the next case event.',
      });
    }
  };

  const fieldClass =
    'w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark';

  return (
    <div className="rounded-xl border border-border-light bg-surface-light p-6 dark:border-border-dark dark:bg-surface-dark">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">
            Create Next Case Event
          </h3>
          <p className="text-sm text-text-muted">
            Court stage: <strong>{caseData?.court_stage_label || courtStage}</strong>
            {' — '}Only valid event types for this stage are shown.
          </p>
        </div>
        {suggestion && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-200">
            <div className="font-semibold">Suggested from last event:</div>
            <div>{suggestion.source_event_title}</div>
            {suggestion.next_action && <div>Next: {suggestion.next_action}</div>}
            {suggestion.next_date && (
              <div>
                Date: {new Date(suggestion.next_date).toLocaleDateString('en-KE')}
                {' '}({formatDaysRemaining(suggestion.next_date)})
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Event Type — filtered by court stage */}
        <Select3D
          label="Event Type *"
          value={draft.event_type}
          onChange={(e) => setDraft((d) => ({ ...d, event_type: e.target.value }))}
          options={validTypes}
          error={errors.event_type}
        />

        {/* Title */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
            Title *
          </label>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            className={fieldClass}
            placeholder="e.g. Case management mention"
          />
          {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
        </div>

        {/* Start Date */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
            Date & Time *
          </label>
          <input
            type="datetime-local"
            value={draft.starts_at}
            onChange={(e) => setDraft((d) => ({ ...d, starts_at: e.target.value }))}
            className={fieldClass}
          />
          {errors.starts_at && <p className="mt-1 text-xs text-red-500">{errors.starts_at}</p>}
          {daysRemaining && (
            <p className={`mt-1 text-xs font-medium ${
              daysRemaining === 'Today' || daysRemaining === 'Tomorrow'
                ? 'text-amber-600 dark:text-amber-400'
                : daysRemaining === 'Past due'
                  ? 'text-red-500'
                  : 'text-blue-600 dark:text-blue-400'
            }`}>
              {daysRemaining}
            </p>
          )}
        </div>

        {/* End Date */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
            End Time
          </label>
          <input
            type="datetime-local"
            value={draft.ends_at}
            onChange={(e) => setDraft((d) => ({ ...d, ends_at: e.target.value }))}
            className={fieldClass}
          />
        </div>

        {/* Hearing Mode */}
        <Select3D
          label="Hearing Mode"
          value={draft.hearing_mode}
          onChange={(e) => setDraft((d) => ({ ...d, hearing_mode: e.target.value }))}
          options={HEARING_MODES}
        />

        {/* Court Station */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
            Court Station
          </label>
          <input
            type="text"
            value={draft.court_station}
            onChange={(e) => setDraft((d) => ({ ...d, court_station: e.target.value }))}
            className={fieldClass}
            placeholder="e.g. Milimani High Court"
          />
        </div>

        {/* Courtroom */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
            Courtroom
          </label>
          <input
            type="text"
            value={draft.courtroom}
            onChange={(e) => setDraft((d) => ({ ...d, courtroom: e.target.value }))}
            className={fieldClass}
            placeholder="e.g. Court 3"
          />
        </div>

        {/* Judicial Officer */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
            Judicial Officer
          </label>
          <input
            type="text"
            value={draft.judicial_officer}
            onChange={(e) => setDraft((d) => ({ ...d, judicial_officer: e.target.value }))}
            className={fieldClass}
            placeholder="e.g. Hon. Justice Kamau"
          />
        </div>

        {/* Virtual Meeting URL */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
            Virtual Meeting URL
          </label>
          <input
            type="url"
            value={draft.virtual_meeting_url}
            onChange={(e) => setDraft((d) => ({ ...d, virtual_meeting_url: e.target.value }))}
            className={fieldClass}
            placeholder="https://..."
          />
        </div>

        {/* Description */}
        <div className="lg:col-span-2">
          <label className="mb-1 block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
            Description / Agenda
          </label>
          <textarea
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            className={`${fieldClass} min-h-[80px]`}
            placeholder="Directions on pleadings, witness statements, and compliance status..."
          />
        </div>

        {/* Next Action (what the court may direct after this event) */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
            Expected Next Action
          </label>
          <input
            type="text"
            value={draft.next_action}
            onChange={(e) => setDraft((d) => ({ ...d, next_action: e.target.value }))}
            className={fieldClass}
            placeholder="e.g. Hearing"
          />
        </div>

        {/* Next Date (anticipated date for the action above) */}
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">
            Expected Next Date
          </label>
          <input
            type="datetime-local"
            value={draft.next_date}
            onChange={(e) => setDraft((d) => ({ ...d, next_date: e.target.value }))}
            className={fieldClass}
          />
        </div>

        {/* Client Visibility */}
        <div className="flex items-center gap-2 lg:col-span-2">
          <input
            type="checkbox"
            id="is_client_visible"
            checked={draft.is_client_visible}
            onChange={(e) => setDraft((d) => ({ ...d, is_client_visible: e.target.checked }))}
            className="h-4 w-4 rounded border-border-light"
          />
          <label
            htmlFor="is_client_visible"
            className="text-sm text-text-secondary-light dark:text-text-secondary-dark"
          >
            Visible to client (client will be notified and see this event on their calendar)
          </label>
        </div>

        {/* Submit */}
        <div className="lg:col-span-2">
          <Button3D
            type="submit"
            variant="primary"
            disabled={isCreating}
            className="w-full"
          >
            {isCreating ? 'Creating...' : 'Create Event & Notify Participants'}
          </Button3D>
        </div>
      </form>
    </div>
  );
}
