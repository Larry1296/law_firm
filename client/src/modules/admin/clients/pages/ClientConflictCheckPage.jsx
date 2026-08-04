import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import BackLink from '@/components/ui/BackLink';
import { FormButton as Button3D } from '@/components/forms';
import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import PageSectionNav from '@/components/ui/PageSectionNav';
import Select3D from '@/components/ui/Select3D';
import ElasticTextInput from '@/components/ui/ElasticTextInput';
import { Input3D } from '@/components/ui/Input3D';
import adminClientsService from '@/modules/admin/clients/services/adminClientsService';
import adminBillingService from '@/modules/admin/billing/services/adminBillingService';
import useFirmLawyers from '@/modules/admin/cases/hooks/useFirmLawyers';
import lawyerCasesService from '@/modules/staff/lawyer/cases/services/lawyerCasesService';
import { enumLabel } from '@/core/utils/textFormatter';
import { formatDateTime } from '@/core/utils/dateFormatter';
import { PRACTICE_AREAS } from '@/modules/cases/shared/create/caseCreateOptions';

const SOURCE_OPTIONS = [
  { value: 'CURRENT_CLIENTS', label: 'Current clients' },
  { value: 'FORMER_CLIENTS', label: 'Former clients' },
  { value: 'OPEN_MATTERS', label: 'Open matters' },
  { value: 'CLOSED_MATTERS', label: 'Closed matters' },
  { value: 'PROSPECTIVE_CLIENTS', label: 'Prospective clients' },
  { value: 'RELATED_PARTIES', label: 'Related parties' },
  { value: 'FIRM_ADVOCATES_AND_STAFF', label: 'Firm advocates and staff' },
  { value: 'OTHER', label: 'Other' },
];

const STATUS_ACTIONS = {
  IN_PROGRESS: 'start',
  AWAITING_INFORMATION: 'request-information',
  POTENTIAL_CONFLICT: 'potential',
  ESCALATED_FOR_REVIEW: 'escalate',
  CLEARED: 'decide',
  CONFLICT_CONFIRMED: 'decide',
  CLOSED_WITHOUT_DECISION: 'close',
};

const emptyDraft = {
  proposed_matter_title: '',
  proposed_instructions: '',
  factual_summary: '',
  desired_outcome: '',
  urgency_level: 'NORMAL',
  urgency_details: '',
  limitation_or_deadline_date: '',
  responsible_lawyer_id: '',
  no_adverse_party_currently_known: false,
  no_adverse_party_explanation: '',
  adverse_party_name: '',
};

const emptyAcceptanceDraft = {
  decision: 'ACCEPTED',
  reason_category: '',
  internal_reason: '',
  scope_confirmation: '',
  engagement_status: 'SENT_TO_CLIENT',
};

const emptyActionDraft = {
  next_status: '',
  information_missing: '',
  first_reviewer_findings: '',
  review_assigned_to_id: '',
  summary: '',
  names_checked: '',
  source_categories_checked: [],
  other_source_description: '',
  result_summary: 'No relevant conflict identified for the proposed instructions based on the information and records checked.',
  internal_reason: '',
  restricted_note: '',
  decision_confirmation: false,
  closure_reason: '',
};

const emptyJurisdictionFacts = {
  dispute_category: '',
  practice_area: '',
  claim_value: '',
  relief_sought: '',
  cause_of_action_location: '',
  defendant_location: '',
  property_location: '',
};

const emptyJurisdictionDecision = {
  action: 'ACCEPT',
  final_forum: '',
  final_court_type: '',
  final_court_level: '',
  final_station: '',
  subject_matter_basis: '',
  pecuniary_basis: '',
  territorial_basis: '',
  legal_basis: '',
  advocate_findings: '',
  override_reason: '',
};

const emptyEngagementDraft = {
  responsible_advocate: '', scope_of_work: '', excluded_work: '', client_objectives: '',
  communication_method: 'EMAIL', reporting_expectations: '', fee_arrangement_type: 'FIXED',
  fee_arrangement_description: '', estimated_professional_fees: '', estimated_disbursements: '',
  required_retainer: '', retainer_due_date: '',
  engagement_letter_document: '', sent_at: '', signed_at: '', signed_by: '', status: 'DRAFT',
};

const emptyRetainerDraft = {
  account: '', receipt_number: '', amount_received: '', currency: 'KES', payment_date: '',
  payment_method: 'BANK_TRANSFER', bank_transaction_reference: '',
};

const optionalValue = (value) => {
  const normalized = typeof value === 'string' ? value.trim() : value;
  return normalized === '' || normalized === null || normalized === undefined ? undefined : normalized;
};

const buildProposedMatterPayload = (draft) => {
  const payload = {
    proposed_matter_title: draft.proposed_matter_title.trim(),
    proposed_instructions: draft.proposed_instructions.trim(),
    factual_summary: draft.factual_summary.trim(),
    desired_outcome: draft.desired_outcome.trim(),
    urgency_level: draft.urgency_level,
    urgency_details: draft.urgency_details.trim(),
    no_adverse_party_currently_known: draft.no_adverse_party_currently_known,
    no_adverse_party_explanation: draft.no_adverse_party_explanation.trim(),
  };

  const responsibleLawyerId = optionalValue(draft.responsible_lawyer_id);
  if (responsibleLawyerId) payload.responsible_lawyer_id = responsibleLawyerId;

  const deadlineDate = optionalValue(draft.limitation_or_deadline_date);
  if (deadlineDate) payload.limitation_or_deadline_date = deadlineDate;

  const adversePartyName = optionalValue(draft.adverse_party_name);
  if (adversePartyName) {
    payload.parties = [{
      name: adversePartyName,
      party_type: 'ORGANISATION',
      role: 'PROPOSED_ADVERSE_PARTY',
    }];
  }

  return payload;
};

function TextArea({ label, value, onChange, required = false, disabled = false, error }) {
  return (
    <ElasticTextInput
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required={required}
      disabled={disabled}
      error={error}
      minRows={1}
      alwaysShowLabel
      wrapperClassName='mb-0'
    />
  );
}

const SOURCE_LABEL_BY_VALUE = SOURCE_OPTIONS.reduce((labels, option) => ({
  ...labels,
  [option.value]: option.label,
}), {});

const sourceLabel = (value) => SOURCE_LABEL_BY_VALUE[value] || enumLabel(value);

const hasText = (value) => typeof value === 'string' && value.trim().length > 0;

const isDirectClearance = (check) => check.status === 'CLEARED' && !hasText(check.first_reviewer_findings);

function SourceCheckboxGroup({ selectedSources, onToggle, error }) {
  return (
    <fieldset className='space-y-3 md:col-span-2'>
      <legend className='text-sm font-semibold text-text-primary-light dark:text-text-primary-dark'>
        Sources checked *
      </legend>
      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
        {SOURCE_OPTIONS.map((option) => (
          <label
            key={option.value}
            className='flex min-h-11 items-center gap-3 rounded-xl border border-border-light bg-surface-light px-3 py-2 text-sm text-text-primary-light shadow-soft dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
          >
            <input
              type='checkbox'
              value={option.value}
              checked={selectedSources.includes(option.value)}
              onChange={() => onToggle(option.value)}
              className='h-4 w-4 rounded border-border-light text-brand-primary focus:ring-brand-primary dark:border-border-dark'
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {error && <p className='text-sm text-red-500'>{error}</p>}
    </fieldset>
  );
}

export default function ClientConflictCheckPage() {
  const { id: clientId, checkId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isLawyer = window.location.pathname.startsWith('/lawyer');
  const service = isLawyer ? lawyerCasesService : adminClientsService;
  const basePath = isLawyer ? '/lawyer' : '/admin';
  const isNew = !checkId;
  const [draft, setDraft] = useState(emptyDraft);
  const [actionDraft, setActionDraft] = useState(emptyActionDraft);
  const [acceptanceDraft, setAcceptanceDraft] = useState(emptyAcceptanceDraft);
  const [jurisdictionFacts, setJurisdictionFacts] = useState(emptyJurisdictionFacts);
  const [jurisdictionDecision, setJurisdictionDecision] = useState(emptyJurisdictionDecision);
  const [complianceDraft, setComplianceDraft] = useState({ reason: '', restriction_reason: '' });
  const [engagementDraft, setEngagementDraft] = useState(emptyEngagementDraft);
  const [engagementAction, setEngagementAction] = useState({ status: 'WAIVED', reason: '', policy_basis: '', supersede_reason: '' });
  const [retainerDraft, setRetainerDraft] = useState(emptyRetainerDraft);
  const { lawyers = [] } = useFirmLawyers();

  const { data: clientData } = useQuery({
    queryKey: ['admin-client', clientId],
    queryFn: () => adminClientsService.getClientDetails(clientId),
    enabled: !isLawyer && !!clientId,
  });
  const { data: check, isLoading } = useQuery({
    queryKey: ['client-conflict-check', isLawyer, clientId, checkId],
    queryFn: () => service.getConflictCheck(clientId, checkId),
    enabled: !isNew && !!clientId && !!checkId,
  });
  const { data: complianceReview } = useQuery({
    queryKey: ['client-compliance-review', clientId],
    queryFn: () => adminClientsService.getComplianceReview(clientId),
    enabled: !isLawyer && !isNew && !!clientId,
  });
  const { data: engagements = [] } = useQuery({
    queryKey: ['client-engagements', clientId, checkId],
    queryFn: () => adminClientsService.getEngagements(clientId, checkId),
    enabled: !isLawyer && !isNew && !!clientId && !!checkId,
  });
  const { data: financeAccountsData } = useQuery({
    queryKey: ['finance-accounts-for-retainer'],
    queryFn: () => adminBillingService.getAccounts(),
    enabled: !isLawyer && !isNew && engagements.some((item) => Number(item.required_retainer || 0) > 0 && !item.retainer_received),
    retry: false,
  });
  const { data: unallocatedFundsData } = useQuery({
    queryKey: ['client-unallocated-funds', clientId],
    queryFn: () => adminBillingService.getClientUnallocatedFunds(clientId),
    enabled: !isLawyer && !isNew && !!clientId && engagements.some((item) => Number(item.required_retainer || 0) > 0 && !item.retainer_received),
    retry: false,
  });

  useEffect(() => {
    if (check?.jurisdiction_facts) {
      // Synchronize an asynchronously loaded assessment into the editable form.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setJurisdictionFacts((current) => ({ ...current, ...check.jurisdiction_facts }));
    }
  }, [check?.jurisdiction_facts]);

  const lawyerOptions = useMemo(
    () => (lawyers || []).map((lawyer) => ({
      value: lawyer.membership_id || lawyer.id,
      label: lawyer.full_name,
    })),
    [lawyers],
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      return service.createConflictCheck(clientId, buildProposedMatterPayload(draft));
    },
    onSuccess: (created) => navigate(`${basePath}/clients/${clientId}/conflict-checks/${created.id}`),
  });

  const acceptanceMutation = useMutation({
    mutationFn: async () => service.recordFirmAcceptance(clientId, checkId, acceptanceDraft),
    onSuccess: () => {
      setAcceptanceDraft(emptyAcceptanceDraft);
      queryClient.invalidateQueries({ queryKey: ['client-conflict-check', isLawyer, clientId, checkId] });
    },
  });

  const complianceMutation = useMutation({
    mutationFn: () => adminClientsService.recordComplianceReview(clientId, {
      identity_status: complianceDraft.identity_status || complianceReview?.identity_status || 'UNKNOWN',
      authority_status: complianceDraft.authority_status || complianceReview?.authority_status || 'UNKNOWN',
      beneficial_ownership_status: complianceDraft.beneficial_ownership_status || complianceReview?.beneficial_ownership_status || 'UNKNOWN',
      due_diligence_status: complianceDraft.due_diligence_status || complianceReview?.due_diligence_status || 'UNKNOWN',
      source_of_funds_required: complianceDraft.source_of_funds_required ?? complianceReview?.source_of_funds_required ?? false,
      source_of_funds_status: complianceDraft.source_of_funds_status || complianceReview?.source_of_funds_status || 'NOT_APPLICABLE',
      restriction_reason: complianceDraft.restriction_reason || '',
      review_notes: complianceDraft.review_notes || '',
      reason: complianceDraft.reason,
    }),
    onSuccess: () => {
      setComplianceDraft({ reason: '', restriction_reason: '' });
      queryClient.invalidateQueries({ queryKey: ['client-compliance-review', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-conflict-check', isLawyer, clientId, checkId] });
    },
  });

  const refreshEngagement = () => {
    queryClient.invalidateQueries({ queryKey: ['client-engagements', clientId, checkId] });
    queryClient.invalidateQueries({ queryKey: ['client-conflict-check', isLawyer, clientId, checkId] });
  };

  const createEngagementMutation = useMutation({
    mutationFn: () => {
      const payload = Object.fromEntries(
        Object.entries(engagementDraft).filter(([, value]) => value !== '' && value !== null),
      );
      return adminClientsService.createEngagement(clientId, checkId, payload);
    },
    onSuccess: () => { setEngagementDraft(emptyEngagementDraft); refreshEngagement(); },
  });
  const approveEngagementMutation = useMutation({
    mutationFn: (engagementId) => adminClientsService.approveEngagement(clientId, checkId, engagementId),
    onSuccess: refreshEngagement,
  });
  const exceptionEngagementMutation = useMutation({
    mutationFn: (engagementId) => adminClientsService.approveEngagementException(clientId, checkId, engagementId, {
      status: engagementAction.status, reason: engagementAction.reason, policy_basis: engagementAction.policy_basis,
    }),
    onSuccess: () => { setEngagementAction({ status: 'WAIVED', reason: '', policy_basis: '', supersede_reason: '' }); refreshEngagement(); },
  });
  const supersedeEngagementMutation = useMutation({
    mutationFn: (engagementId) => adminClientsService.supersedeEngagement(clientId, checkId, engagementId, engagementAction.supersede_reason),
    onSuccess: () => { setEngagementAction((value) => ({ ...value, supersede_reason: '' })); refreshEngagement(); },
  });
  const receiveRetainerMutation = useMutation({
    mutationFn: (engagementId) => adminBillingService.receivePreMatterRetainer({
      ...retainerDraft,
      client: clientId,
      proposed_matter: checkId,
      engagement: engagementId,
    }),
    onSuccess: () => {
      setRetainerDraft(emptyRetainerDraft);
      refreshEngagement();
      queryClient.invalidateQueries({ queryKey: ['client-unallocated-funds', clientId] });
    },
  });

  const clientAccountOptions = (financeAccountsData?.accounts || [])
    .filter((account) => account.account_type === 'CLIENT' && account.is_active !== false)
    .map((account) => ({ value: account.id, label: `${account.name} (${account.currency})` }));

  const actionMutation = useMutation({
    mutationFn: async () => {
      const action = STATUS_ACTIONS[actionDraft.next_status];
      const payload = {
        information_missing: actionDraft.information_missing,
        first_reviewer_findings: actionDraft.first_reviewer_findings,
        review_assigned_to_id: actionDraft.review_assigned_to_id,
        summary: actionDraft.summary,
        decision: actionDraft.next_status,
        names_checked: actionDraft.names_checked.split(',').map((item) => item.trim()).filter(Boolean),
        source_categories_checked: actionDraft.source_categories_checked,
        other_source_description: actionDraft.other_source_description,
        result_summary: actionDraft.result_summary,
        internal_reason: actionDraft.internal_reason,
        restricted_note: actionDraft.restricted_note,
        decision_confirmation: actionDraft.decision_confirmation,
        closure_reason: actionDraft.closure_reason,
      };
      return service.runConflictAction(clientId, checkId, action, payload);
    },
    onSuccess: () => {
      setActionDraft(emptyActionDraft);
      queryClient.invalidateQueries({ queryKey: ['client-conflict-check', isLawyer, clientId, checkId] });
    },
  });

  const jurisdictionSuggestionMutation = useMutation({
    mutationFn: () => service.generateJurisdictionSuggestion(clientId, checkId, jurisdictionFacts),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client-conflict-check', isLawyer, clientId, checkId] }),
  });
  const jurisdictionDecisionMutation = useMutation({
    mutationFn: () => service.recordJurisdictionDecision(clientId, checkId, jurisdictionDecision),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client-conflict-check', isLawyer, clientId, checkId] }),
  });
  const jurisdictionConfirmMutation = useMutation({
    mutationFn: () => service.confirmJurisdiction(clientId, checkId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client-conflict-check', isLawyer, clientId, checkId] }),
  });

  if (isNew) {
    return (
      <div className='space-y-6 p-4 md:p-6'>
        <BackLink label='Back to Client' fallbackPath={`${basePath}/clients/${clientId}`} />
        <SectionHeading title='Start Proposed Matter' subtitle='Record proposed instructions before conflict checking' />
        <Card className='p-6'>
          <form className='grid gap-5 md:grid-cols-2' onSubmit={(event) => { event.preventDefault(); createMutation.mutate(); }}>
            <Input3D label='Proposed matter title' value={draft.proposed_matter_title} onChange={(e) => setDraft((v) => ({ ...v, proposed_matter_title: e.target.value }))} required />
            <Select3D label='Responsible advocate' value={draft.responsible_lawyer_id} onChange={(e) => setDraft((v) => ({ ...v, responsible_lawyer_id: e.target.value }))} options={lawyerOptions} placeholder='Firm default / current advocate' />
            <TextArea label='Proposed instructions' value={draft.proposed_instructions} onChange={(value) => setDraft((v) => ({ ...v, proposed_instructions: value }))} required />
            <TextArea label='Factual summary' value={draft.factual_summary} onChange={(value) => setDraft((v) => ({ ...v, factual_summary: value }))} />
            <TextArea label='Desired outcome' value={draft.desired_outcome} onChange={(value) => setDraft((v) => ({ ...v, desired_outcome: value }))} />
            <Select3D
              label='Urgency level'
              value={draft.urgency_level}
              onChange={(e) => setDraft((v) => ({ ...v, urgency_level: e.target.value }))}
              options={[
                { value: 'NORMAL', label: 'Normal' },
                { value: 'HIGH', label: 'High' },
                { value: 'URGENT', label: 'Urgent' },
                { value: 'CRITICAL', label: 'Critical' },
              ]}
            />
            <TextArea label='Urgency details' value={draft.urgency_details} onChange={(value) => setDraft((v) => ({ ...v, urgency_details: value }))} />
            <Input3D label='Known adverse party' value={draft.adverse_party_name} onChange={(e) => setDraft((v) => ({ ...v, adverse_party_name: e.target.value }))} />
            <Input3D label='Limitation or deadline date' type='date' value={draft.limitation_or_deadline_date} onChange={(e) => setDraft((v) => ({ ...v, limitation_or_deadline_date: e.target.value }))} />
            <label className='flex items-center gap-2 text-sm md:col-span-2'>
              <input type='checkbox' checked={draft.no_adverse_party_currently_known} onChange={(e) => setDraft((v) => ({ ...v, no_adverse_party_currently_known: e.target.checked }))} />
              No adverse party currently known
            </label>
            {draft.no_adverse_party_currently_known && (
              <TextArea label='Explanation' value={draft.no_adverse_party_explanation} onChange={(value) => setDraft((v) => ({ ...v, no_adverse_party_explanation: value }))} required />
            )}
            <Button3D type='submit' variant='primary' disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving...' : 'Save Proposed Matter'}
            </Button3D>
          </form>
        </Card>
      </div>
    );
  }

  if (isLoading || !check) {
    return <div className='p-6'>Loading conflict check...</div>;
  }

  const canCreateCase = Boolean(check.can_open_matter);
  const canRecordAcceptance = check.status === 'CLEARED' && check.acceptance_decision === 'PENDING';
  const canViewCase = check.created_case;
  const nextOptions = check.permitted_next_statuses || [];
  const showFirstReviewerFindings = hasText(check.first_reviewer_findings) || isDirectClearance(check);
  const showClearanceResult = check.status === 'CLEARED' || hasText(check.result_summary);
  const showInternalConflictReason = check.status === 'CONFLICT_CONFIRMED' || hasText(check.internal_reason);
  const firstReviewerFindingsText = hasText(check.first_reviewer_findings)
    ? check.first_reviewer_findings
    : 'Not applicable — direct clearance';
  const isClearedDecision = actionDraft.next_status === 'CLEARED';
  const hasSourceChecked = actionDraft.source_categories_checked.length > 0;
  const requiresOtherSourceDescription = actionDraft.source_categories_checked.includes('OTHER');
  const missingOtherSourceDescription = requiresOtherSourceDescription && !actionDraft.other_source_description.trim();
  const sourceValidationMessage = isClearedDecision && !hasSourceChecked
    ? 'Select at least one source checked before recording a cleared decision.'
    : '';
  const isOutcomeBlocked = !actionDraft.next_status
    || actionMutation.isPending
    || (isClearedDecision && (!hasSourceChecked || missingOtherSourceDescription));

  const toggleSourceCategory = (sourceValue) => {
    setActionDraft((current) => {
      const sourceIsSelected = current.source_categories_checked.includes(sourceValue);
      const source_categories_checked = sourceIsSelected
        ? current.source_categories_checked.filter((value) => value !== sourceValue)
        : [...current.source_categories_checked, sourceValue];

      return {
        ...current,
        source_categories_checked,
        other_source_description: sourceValue === 'OTHER' && sourceIsSelected
          ? ''
          : current.other_source_description,
      };
    });
  };

  return (
    <div className='space-y-6 p-4 md:p-6'>
      <BackLink label='Back to Client' fallbackPath={`${basePath}/clients/${clientId}`} />
      <SectionHeading title={check.reference_number} subtitle={check.proposed_matter_title} />
      <PageSectionNav
        ariaLabel='Conflict workflow sections'
        sections={[
          { id: 'conflict-overview', label: 'Overview' },
          { id: 'conflict-outcome', label: 'Conflict decision', hidden: nextOptions.length === 0 },
          { id: 'conflict-jurisdiction', label: 'Jurisdiction', hidden: check.status !== 'CLEARED' },
          { id: 'conflict-acceptance', label: 'Firm acceptance', hidden: !canRecordAcceptance },
          { id: 'conflict-history', label: 'History' },
        ]}
      />

      <Card id='conflict-overview' className='scroll-mt-28 p-6'>
        <div className='grid gap-4 md:grid-cols-3'>
          <p><strong>Client:</strong> {check.client_name || clientData?.client?.full_name || 'Recorded'}</p>
          <p><strong>Status:</strong> {check.status_label || enumLabel(check.status)}</p>
          <p><strong>Responsible advocate:</strong> {check.responsible_lawyer_name || 'Not recorded'}</p>
          <p><strong>Deadline:</strong> {check.limitation_or_deadline_date || 'Not recorded'}</p>
          <p><strong>Linked matter:</strong> {check.created_case_number || '-'}</p>
          <p><strong>Consumed:</strong> {check.consumed_at ? formatDateTime(check.consumed_at) : 'No'}</p>
          <p><strong>Firm acceptance:</strong> {enumLabel(check.acceptance_decision || 'PENDING')}</p>
          <p><strong>Accepted at:</strong> {check.accepted_at ? formatDateTime(check.accepted_at) : 'Not recorded'}</p>
        </div>
        <div className='mt-4 grid gap-4 md:grid-cols-2'>
          <p><strong>Instructions:</strong> {check.proposed_instructions}</p>
          <p><strong>Factual summary:</strong> {check.factual_summary || 'Not recorded'}</p>
          <p><strong>Desired outcome:</strong> {check.desired_outcome || 'Not recorded'}</p>
          <p><strong>Adverse parties:</strong> {(check.adverse_parties || []).join(', ') || 'None recorded'}</p>
          {showFirstReviewerFindings && <p><strong>First-reviewer findings:</strong> {firstReviewerFindingsText}</p>}
          {showClearanceResult && <p><strong>Clearance result:</strong> {check.result_summary || 'Not recorded'}</p>}
          {showInternalConflictReason && <p><strong>Internal conflict reason:</strong> {check.internal_reason || 'Not recorded'}</p>}
          <p><strong>Names checked:</strong> {(check.names_checked || []).join(', ') || 'Not recorded'}</p>
          <p><strong>Sources checked:</strong> {(check.source_categories_checked || []).map(sourceLabel).join(', ') || 'Not recorded'}</p>
          <p><strong>Deciding advocate:</strong> {check.decided_by_name || 'Not recorded'}</p>
          <p><strong>Decision date and time:</strong> {check.decided_at ? formatDateTime(check.decided_at) : 'Not recorded'}</p>
        </div>
        <div className='mt-5 flex flex-wrap gap-3'>
          {canCreateCase && (
            <Button3D variant='primary' onClick={() => navigate(`${basePath}/clients/${clientId}/conflict-checks/${check.id}/open-matter`)}>
              Open Matter
            </Button3D>
          )}
          {canViewCase && (
            <Button3D variant='primary' onClick={() => navigate(`${basePath}/cases/${check.created_case}`)}>
              View Matter
            </Button3D>
          )}
        </div>
      </Card>

      {nextOptions.length > 0 && (
        <Card id='conflict-outcome' className='scroll-mt-28 p-6'>
          <h3 className='mb-4 text-lg font-semibold'>Next outcome</h3>
          <form className='grid gap-4 md:grid-cols-2' onSubmit={(event) => { event.preventDefault(); if (!isOutcomeBlocked) actionMutation.mutate(); }}>
            <Select3D value={actionDraft.next_status} onChange={(e) => setActionDraft((v) => ({ ...v, next_status: e.target.value }))} options={nextOptions} placeholder='Select next outcome' />
            {actionDraft.next_status === 'AWAITING_INFORMATION' && <TextArea label='Information missing' value={actionDraft.information_missing} onChange={(value) => setActionDraft((v) => ({ ...v, information_missing: value }))} required />}
            {actionDraft.next_status === 'POTENTIAL_CONFLICT' && <TextArea label='First reviewer findings' value={actionDraft.first_reviewer_findings} onChange={(value) => setActionDraft((v) => ({ ...v, first_reviewer_findings: value }))} required />}
            {actionDraft.next_status === 'ESCALATED_FOR_REVIEW' && <Select3D label='Review advocate' value={actionDraft.review_assigned_to_id} onChange={(e) => setActionDraft((v) => ({ ...v, review_assigned_to_id: e.target.value }))} options={lawyerOptions} placeholder='Select reviewer' />}
            {actionDraft.next_status === 'ESCALATED_FOR_REVIEW' && <TextArea label='Escalation summary' value={actionDraft.summary} onChange={(value) => setActionDraft((v) => ({ ...v, summary: value }))} required />}
            {actionDraft.next_status === 'CLEARED' && <Input3D label='Names checked, comma separated' value={actionDraft.names_checked} onChange={(e) => setActionDraft((v) => ({ ...v, names_checked: e.target.value }))} required />}
            {actionDraft.next_status === 'CLEARED' && <SourceCheckboxGroup selectedSources={actionDraft.source_categories_checked} onToggle={toggleSourceCategory} error={sourceValidationMessage} />}
            {actionDraft.next_status === 'CLEARED' && requiresOtherSourceDescription && <TextArea label='Other source description' value={actionDraft.other_source_description} onChange={(value) => setActionDraft((v) => ({ ...v, other_source_description: value }))} required />}
            {actionDraft.next_status === 'CLEARED' && <TextArea label='Clearance summary' value={actionDraft.result_summary} onChange={(value) => setActionDraft((v) => ({ ...v, result_summary: value }))} required />}
            {actionDraft.next_status === 'CONFLICT_CONFIRMED' && <TextArea label='Internal reason' value={actionDraft.internal_reason} onChange={(value) => setActionDraft((v) => ({ ...v, internal_reason: value }))} required />}
            {actionDraft.next_status === 'CLOSED_WITHOUT_DECISION' && <TextArea label='Closure reason' value={actionDraft.closure_reason} onChange={(value) => setActionDraft((v) => ({ ...v, closure_reason: value }))} required />}
            {['CLEARED', 'CONFLICT_CONFIRMED'].includes(actionDraft.next_status) && <label className='flex items-center gap-2 text-sm md:col-span-2'><input type='checkbox' checked={actionDraft.decision_confirmation} onChange={(e) => setActionDraft((v) => ({ ...v, decision_confirmation: e.target.checked }))} />I confirm this professional conflict decision for these proposed instructions only.</label>}
            <Button3D type='submit' variant='primary' disabled={isOutcomeBlocked}>{actionMutation.isPending ? 'Recording...' : 'Record Outcome'}</Button3D>
          </form>
        </Card>
      )}

      {check.status === 'CLEARED' && (
        <Card id='conflict-jurisdiction' className='scroll-mt-28 p-6'>
          <h3 className='text-lg font-semibold'>Jurisdiction Suggestion and Advocate Decision</h3>
          <p className='mt-2 text-sm text-text-muted-light dark:text-text-muted-dark'>
            This is a system-generated jurisdiction suggestion. The responsible advocate must independently review and confirm the appropriate court or tribunal.
          </p>
          {!check.jurisdiction?.is_final && (
            <form className='mt-5 grid gap-4 md:grid-cols-2' onSubmit={(event) => { event.preventDefault(); jurisdictionSuggestionMutation.mutate(); }}>
              <Input3D label='Dispute category' value={jurisdictionFacts.dispute_category} onChange={(e) => setJurisdictionFacts((v) => ({ ...v, dispute_category: e.target.value }))} />
              <Select3D label='Practice area' value={jurisdictionFacts.practice_area} onChange={(e) => setJurisdictionFacts((v) => ({ ...v, practice_area: e.target.value }))} options={PRACTICE_AREAS} placeholder='Select the proposed matter practice area' required />
              <Input3D
                label='Claim value (KES)'
                type='number'
                min='0'
                step='0.01'
                value={jurisdictionFacts.claim_value}
                onChange={(e) => setJurisdictionFacts((v) => ({ ...v, claim_value: e.target.value }))}
                onWheel={(event) => event.currentTarget.blur()}
                onKeyDown={(event) => {
                  if (['ArrowUp', 'ArrowDown'].includes(event.key)) event.preventDefault();
                }}
              />
              <Input3D label='Cause-of-action location' value={jurisdictionFacts.cause_of_action_location} onChange={(e) => setJurisdictionFacts((v) => ({ ...v, cause_of_action_location: e.target.value }))} />
              <TextArea label='Relief sought' value={jurisdictionFacts.relief_sought} onChange={(value) => setJurisdictionFacts((v) => ({ ...v, relief_sought: value }))} />
              <Button3D
                type='submit'
                variant='primary'
                className='md:self-end md:justify-self-start'
                disabled={jurisdictionSuggestionMutation.isPending}
              >
                {jurisdictionSuggestionMutation.isPending ? 'Generating...' : 'Generate / Refresh Suggestion'}
              </Button3D>
            </form>
          )}

          {check.jurisdiction?.suggestion?.label && (
            <div className='mt-5 rounded-xl border border-border-light p-4 dark:border-border-dark'>
              <p><strong>System suggestion:</strong> {check.jurisdiction.suggestion.label}</p>
              <p><strong>Level:</strong> {enumLabel(check.jurisdiction.suggestion.court_level)}</p>
              <p><strong>Possible station:</strong> {check.jurisdiction.suggestion.station || 'Advocate input required'}</p>
              <p><strong>Completeness:</strong> {check.jurisdiction.completeness}%</p>
              {(check.jurisdiction.suggestion.reasons || []).map((reason) => <p key={reason} className='mt-2'>{reason}</p>)}
              {(check.jurisdiction.missing_information || []).length > 0 && (
                <p className='mt-2 text-amber-700'><strong>Missing information:</strong> {check.jurisdiction.missing_information.map(enumLabel).join(', ')}</p>
              )}
              {(check.jurisdiction.warnings || []).map((warning) => <p key={warning} className='mt-2 text-amber-700'>{warning}</p>)}
              <p className='mt-2 text-xs'>Rules: {check.jurisdiction.rule_version}</p>
            </div>
          )}

          {check.jurisdiction && !check.jurisdiction.is_final && (
            <form className='mt-5 grid gap-4 md:grid-cols-2' onSubmit={(event) => { event.preventDefault(); jurisdictionDecisionMutation.mutate(); }}>
              <Select3D label='Advocate action' value={jurisdictionDecision.action} onChange={(e) => setJurisdictionDecision((v) => ({ ...v, action: e.target.value }))} options={[
                { value: 'ACCEPT', label: 'Accept suggestion' },
                { value: 'MODIFY', label: 'Modify suggested jurisdiction' },
                { value: 'REJECT', label: 'Reject and select another forum' },
                { value: 'REQUEST_INFORMATION', label: 'Request more information' },
                { value: 'DEFER', label: 'Defer decision' },
              ]} />
              {jurisdictionDecision.action !== 'ACCEPT' && <TextArea label='Override / decision reason' value={jurisdictionDecision.override_reason} onChange={(value) => setJurisdictionDecision((v) => ({ ...v, override_reason: value }))} required={['MODIFY', 'REJECT'].includes(jurisdictionDecision.action)} />}
              {['MODIFY', 'REJECT'].includes(jurisdictionDecision.action) && <>
                <Input3D label='Selected forum' value={jurisdictionDecision.final_forum} onChange={(e) => setJurisdictionDecision((v) => ({ ...v, final_forum: e.target.value }))} required />
                <Input3D label='Selected court / tribunal' value={jurisdictionDecision.final_court_type} onChange={(e) => setJurisdictionDecision((v) => ({ ...v, final_court_type: e.target.value }))} required />
                <Input3D label='Court level' value={jurisdictionDecision.final_court_level} onChange={(e) => setJurisdictionDecision((v) => ({ ...v, final_court_level: e.target.value }))} required />
                <Input3D label='Station' value={jurisdictionDecision.final_station} onChange={(e) => setJurisdictionDecision((v) => ({ ...v, final_station: e.target.value }))} />
              </>}
              <TextArea label='Subject-matter basis' value={jurisdictionDecision.subject_matter_basis} onChange={(value) => setJurisdictionDecision((v) => ({ ...v, subject_matter_basis: value }))} />
              <TextArea label='Pecuniary basis' value={jurisdictionDecision.pecuniary_basis} onChange={(value) => setJurisdictionDecision((v) => ({ ...v, pecuniary_basis: value }))} />
              <TextArea label='Territorial basis' value={jurisdictionDecision.territorial_basis} onChange={(value) => setJurisdictionDecision((v) => ({ ...v, territorial_basis: value }))} />
              <TextArea label='Legal / procedural basis' value={jurisdictionDecision.legal_basis} onChange={(value) => setJurisdictionDecision((v) => ({ ...v, legal_basis: value }))} />
              <TextArea label='Advocate findings' value={jurisdictionDecision.advocate_findings} onChange={(value) => setJurisdictionDecision((v) => ({ ...v, advocate_findings: value }))} />
              <Button3D
                type='submit'
                variant='primary'
                className='md:self-end md:justify-self-start'
                disabled={jurisdictionDecisionMutation.isPending}
              >
                Record Advocate Decision
              </Button3D>
              {['ACCEPTED', 'MODIFIED', 'REJECTED'].includes(check.jurisdiction.status) && (
                <Button3D type='button' variant='primary' onClick={() => jurisdictionConfirmMutation.mutate()} disabled={jurisdictionConfirmMutation.isPending}>
                  Confirm Final Jurisdiction
                </Button3D>
              )}
            </form>
          )}

          {check.jurisdiction?.is_final && (
            <div className='mt-5 rounded-xl border border-green-300 bg-green-50 p-4 text-green-900'>
              <p><strong>Advocate-confirmed jurisdiction:</strong> {enumLabel(check.jurisdiction.final_court_type)}</p>
              <p>{enumLabel(check.jurisdiction.final_court_level)} · {check.jurisdiction.final_station || 'Station not recorded'}</p>
              <p>Confirmed by {check.jurisdiction.confirmed_by_name} on {formatDateTime(check.jurisdiction.confirmed_at)}</p>
            </div>
          )}
        </Card>
      )}

      {canRecordAcceptance && (
        <Card id='conflict-acceptance' className='scroll-mt-28 p-6'>
          <h3 className='mb-4 text-lg font-semibold'>Firm Acceptance Decision</h3>
          <form className='grid gap-4 md:grid-cols-2' onSubmit={(event) => { event.preventDefault(); acceptanceMutation.mutate(); }}>
            <Select3D label='Decision' value={acceptanceDraft.decision} onChange={(e) => setAcceptanceDraft((v) => ({ ...v, decision: e.target.value }))} options={[{ value: 'ACCEPTED', label: 'Accept instructions' }, { value: 'DECLINED', label: 'Decline instructions' }, { value: 'CLIENT_WITHDREW', label: 'Client withdrew' }]} required />
            <Select3D label='Engagement preparation stage' value={acceptanceDraft.engagement_status} onChange={(e) => setAcceptanceDraft((v) => ({ ...v, engagement_status: e.target.value }))} options={[{ value: 'DRAFTING', label: 'Drafting' }, { value: 'SENT_TO_CLIENT', label: 'Sent to client' }, { value: 'SIGNED', label: 'Signed document received (formal approval still required)' }, { value: 'FEE_ARRANGEMENT_CONFIRMED', label: 'Fee terms confirmed (formal approval still required)' }]} />
            {acceptanceDraft.decision !== 'ACCEPTED' && <Select3D label='Reason category' value={acceptanceDraft.reason_category} onChange={(e) => setAcceptanceDraft((v) => ({ ...v, reason_category: e.target.value }))} options={[{ value: 'OUTSIDE_EXPERTISE', label: 'Outside expertise' }, { value: 'CAPACITY_CONSTRAINT', label: 'Capacity constraint' }, { value: 'COMMERCIAL_TERMS', label: 'Commercial terms' }, { value: 'CLIENT_WITHDREW', label: 'Client withdrew' }, { value: 'CDD_RESTRICTED', label: 'CDD restricted' }, { value: 'OTHER', label: 'Other' }]} required />}
            <TextArea label='Scope confirmation' value={acceptanceDraft.scope_confirmation} onChange={(value) => setAcceptanceDraft((v) => ({ ...v, scope_confirmation: value }))} required={acceptanceDraft.decision === 'ACCEPTED'} />
            {acceptanceDraft.decision !== 'ACCEPTED' && <TextArea label='Restricted internal reason' value={acceptanceDraft.internal_reason} onChange={(value) => setAcceptanceDraft((v) => ({ ...v, internal_reason: value }))} required />}
            <Button3D type='submit' variant='primary' disabled={acceptanceMutation.isPending}>
              {acceptanceMutation.isPending ? 'Recording...' : 'Record Acceptance Decision'}
            </Button3D>
          </form>
        </Card>
      )}

      {!isLawyer && (
        <Card id='engagement-management' className='scroll-mt-28 p-6'>
          <h3 className='mb-2 text-lg font-semibold'>Formal Engagement</h3>
          <p className='mb-4 text-sm text-text-muted-light dark:text-text-muted-dark'>
            Scope, fees, signature, approval and exceptions are versioned. Marking the intake stage “signed” does not authorise opening.
          </p>
          {engagements.length > 0 && (
            <div className='mb-6 space-y-3'>
              {engagements.map((engagement) => (
                <div key={engagement.id} className='rounded-xl border border-border-light p-4 dark:border-border-dark'>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <p className='font-semibold'>Version {engagement.version} · {enumLabel(engagement.status)}</p>
                    <span className={engagement.permits_opening ? 'text-green-700' : 'text-amber-700'}>{engagement.permits_opening ? 'Opening control satisfied' : 'Not approved for opening'}</span>
                  </div>
                  <p className='mt-2 text-sm'><strong>Scope:</strong> {engagement.scope_of_work}</p>
                  <p className='text-sm'><strong>Fee terms:</strong> {enumLabel(engagement.fee_arrangement_type)} — {engagement.fee_arrangement_description}</p>
                  {Number(engagement.required_retainer || 0) > 0 && (
                    <div className='mt-3 rounded-lg border border-border-light p-3 dark:border-border-dark'>
                      <p className='text-sm'><strong>Required retainer:</strong> {engagement.required_retainer} · {engagement.retainer_received ? 'Received and verified' : 'Awaiting verified receipt'}</p>
                      {!engagement.retainer_received && !['SUPERSEDED', 'CANCELLED'].includes(engagement.status) && (
                        <form className='mt-3 grid gap-3 md:grid-cols-2' onSubmit={(event) => { event.preventDefault(); receiveRetainerMutation.mutate(engagement.id); }}>
                          <Select3D label='Client account' value={retainerDraft.account} onChange={(event) => setRetainerDraft((value) => ({ ...value, account: event.target.value }))} options={clientAccountOptions} required />
                          <Input3D label='Receipt number' value={retainerDraft.receipt_number} onChange={(event) => setRetainerDraft((value) => ({ ...value, receipt_number: event.target.value }))} required />
                          <Input3D label='Amount received' type='number' value={retainerDraft.amount_received} onChange={(event) => setRetainerDraft((value) => ({ ...value, amount_received: event.target.value }))} required />
                          <Input3D label='Currency' value={retainerDraft.currency} onChange={(event) => setRetainerDraft((value) => ({ ...value, currency: event.target.value.toUpperCase() }))} required />
                          <Input3D label='Payment date' type='date' value={retainerDraft.payment_date} onChange={(event) => setRetainerDraft((value) => ({ ...value, payment_date: event.target.value }))} required />
                          <Select3D label='Payment method' value={retainerDraft.payment_method} onChange={(event) => setRetainerDraft((value) => ({ ...value, payment_method: event.target.value }))} options={[{ value: 'BANK_TRANSFER', label: 'Bank transfer' }, { value: 'CARD', label: 'Card' }, { value: 'CHEQUE', label: 'Cheque' }, { value: 'CASH', label: 'Cash' }, { value: 'MOBILE_MONEY', label: 'Mobile money' }, { value: 'OTHER', label: 'Other' }]} required />
                          <Input3D label='Bank or transaction reference' value={retainerDraft.bank_transaction_reference} onChange={(event) => setRetainerDraft((value) => ({ ...value, bank_transaction_reference: event.target.value }))} required />
                          <Button3D type='submit' variant='primary' disabled={receiveRetainerMutation.isPending}>{receiveRetainerMutation.isPending ? 'Posting receipt...' : 'Post Retainer Receipt'}</Button3D>
                        </form>
                      )}
                    </div>
                  )}
                  {engagement.exception_reason && <p className='text-sm'><strong>Exception:</strong> {engagement.exception_reason} ({engagement.exception_policy_basis})</p>}
                  {!['SUPERSEDED', 'CANCELLED', 'READY', 'WAIVED', 'NOT_REQUIRED'].includes(engagement.status) && (
                    <div className='mt-4 grid gap-3 md:grid-cols-2'>
                      <Button3D type='button' variant='primary' onClick={() => approveEngagementMutation.mutate(engagement.id)} disabled={approveEngagementMutation.isPending}>Approve Signed Engagement</Button3D>
                      <Select3D label='Exception type' value={engagementAction.status} onChange={(e) => setEngagementAction((value) => ({ ...value, status: e.target.value }))} options={[{ value: 'WAIVED', label: 'Waived with approval' }, { value: 'NOT_REQUIRED', label: 'Not required under firm policy' }]} />
                      <TextArea label='Exception reason' value={engagementAction.reason} onChange={(value) => setEngagementAction((current) => ({ ...current, reason: value }))} />
                      <TextArea label='Firm policy basis' value={engagementAction.policy_basis} onChange={(value) => setEngagementAction((current) => ({ ...current, policy_basis: value }))} />
                      <Button3D type='button' variant='secondary' onClick={() => exceptionEngagementMutation.mutate(engagement.id)} disabled={exceptionEngagementMutation.isPending || !engagementAction.reason.trim() || !engagementAction.policy_basis.trim()}>Approve Exception</Button3D>
                      <TextArea label='Supersession reason' value={engagementAction.supersede_reason} onChange={(value) => setEngagementAction((current) => ({ ...current, supersede_reason: value }))} />
                      <Button3D type='button' variant='secondary' onClick={() => supersedeEngagementMutation.mutate(engagement.id)} disabled={supersedeEngagementMutation.isPending || !engagementAction.supersede_reason.trim()}>Supersede Version</Button3D>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {!engagements.some((item) => !['SUPERSEDED', 'CANCELLED'].includes(item.status)) && (
            <form className='grid gap-4 md:grid-cols-2' onSubmit={(event) => { event.preventDefault(); createEngagementMutation.mutate(); }}>
              <Select3D label='Responsible advocate' value={engagementDraft.responsible_advocate} onChange={(e) => setEngagementDraft((value) => ({ ...value, responsible_advocate: e.target.value }))} options={lawyerOptions} required />
              <Select3D label='Record stage' value={engagementDraft.status} onChange={(e) => setEngagementDraft((value) => ({ ...value, status: e.target.value }))} options={[{ value: 'DRAFT', label: 'Drafting' }, { value: 'SENT', label: 'Sent to client' }, { value: 'SIGNED', label: 'Signed' }, { value: 'FEE_TERMS_CONFIRMED', label: 'Fee terms confirmed' }, { value: 'RETAINER_PENDING', label: 'Retainer pending' }]} required />
              <TextArea label='Scope of work' value={engagementDraft.scope_of_work} onChange={(value) => setEngagementDraft((current) => ({ ...current, scope_of_work: value }))} required />
              <TextArea label='Work expressly excluded' value={engagementDraft.excluded_work} onChange={(value) => setEngagementDraft((current) => ({ ...current, excluded_work: value }))} />
              <TextArea label='Client objectives' value={engagementDraft.client_objectives} onChange={(value) => setEngagementDraft((current) => ({ ...current, client_objectives: value }))} />
              <TextArea label='Reporting expectations' value={engagementDraft.reporting_expectations} onChange={(value) => setEngagementDraft((current) => ({ ...current, reporting_expectations: value }))} />
              <Input3D label='Communication method' value={engagementDraft.communication_method} onChange={(e) => setEngagementDraft((value) => ({ ...value, communication_method: e.target.value }))} />
              <Select3D label='Fee arrangement' value={engagementDraft.fee_arrangement_type} onChange={(e) => setEngagementDraft((value) => ({ ...value, fee_arrangement_type: e.target.value }))} options={[{ value: 'CONSULTATION', label: 'Consultation fee' }, { value: 'FIXED', label: 'Fixed or agreed fee' }, { value: 'HOURLY', label: 'Hourly fee' }, { value: 'STAGE_BASED', label: 'Stage-based fee' }, { value: 'MONTHLY_RETAINER', label: 'Monthly retainer' }, { value: 'REMUNERATION_ORDER', label: 'Advocates Remuneration Order' }, { value: 'OTHER', label: 'Other approved arrangement' }]} required />
              <TextArea label='Fee arrangement description' value={engagementDraft.fee_arrangement_description} onChange={(value) => setEngagementDraft((current) => ({ ...current, fee_arrangement_description: value }))} required />
              <Input3D label='Estimated professional fees' type='number' value={engagementDraft.estimated_professional_fees} onChange={(e) => setEngagementDraft((value) => ({ ...value, estimated_professional_fees: e.target.value }))} />
              <Input3D label='Estimated disbursements' type='number' value={engagementDraft.estimated_disbursements} onChange={(e) => setEngagementDraft((value) => ({ ...value, estimated_disbursements: e.target.value }))} />
              <Input3D label='Required retainer' type='number' value={engagementDraft.required_retainer} onChange={(e) => setEngagementDraft((value) => ({ ...value, required_retainer: e.target.value }))} />
              <Input3D label='Retainer due date' type='date' value={engagementDraft.retainer_due_date} onChange={(e) => setEngagementDraft((value) => ({ ...value, retainer_due_date: e.target.value }))} />
              <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>Retainer receipt status is set only by posting an immutable client-account receipt after this engagement version is created.</p>
              <Input3D label='Engagement letter document ID' value={engagementDraft.engagement_letter_document} onChange={(e) => setEngagementDraft((value) => ({ ...value, engagement_letter_document: e.target.value }))} />
              <Input3D label='Date sent' type='datetime-local' value={engagementDraft.sent_at} onChange={(e) => setEngagementDraft((value) => ({ ...value, sent_at: e.target.value }))} />
              <Input3D label='Date signed' type='datetime-local' value={engagementDraft.signed_at} onChange={(e) => setEngagementDraft((value) => ({ ...value, signed_at: e.target.value }))} />
              <Input3D label='Signed by' value={engagementDraft.signed_by} onChange={(e) => setEngagementDraft((value) => ({ ...value, signed_by: e.target.value }))} />
              <Button3D type='submit' variant='primary' disabled={createEngagementMutation.isPending}>{createEngagementMutation.isPending ? 'Saving...' : 'Create Engagement Version'}</Button3D>
            </form>
          )}
          {unallocatedFundsData?.ledger && (
            <p className='mt-4 rounded-lg bg-surface-muted-light p-3 text-sm dark:bg-surface-muted-dark'>
              Client funds awaiting matter allocation: <strong>{unallocatedFundsData.ledger.currency} {unallocatedFundsData.ledger.cleared_balance}</strong>. These funds move to the matter ledger atomically when the matter opens.
            </p>
          )}
        </Card>
      )}

      {!isLawyer && complianceReview && (
        <Card id='client-compliance-review' className='scroll-mt-28 p-6'>
          <h3 className='mb-2 text-lg font-semibold'>KYC, Authority and Due-Diligence Review</h3>
          <p className='mb-4 text-sm text-text-muted-light dark:text-text-muted-dark'>
            Final decisions are recorded in immutable history. A blocked or incomplete review prevents matter opening.
          </p>
          <form className='grid gap-4 md:grid-cols-2' onSubmit={(event) => { event.preventDefault(); complianceMutation.mutate(); }}>
            <Select3D label='Identity verification' value={complianceDraft.identity_status || complianceReview.identity_status} onChange={(e) => setComplianceDraft((value) => ({ ...value, identity_status: e.target.value }))} options={[{ value: 'VERIFIED', label: 'Verified' }, { value: 'BLOCKED', label: 'Blocked' }]} required />
            <Select3D label='Authority to instruct' value={complianceDraft.authority_status || complianceReview.authority_status} onChange={(e) => setComplianceDraft((value) => ({ ...value, authority_status: e.target.value }))} options={[{ value: 'VERIFIED', label: 'Verified' }, { value: 'BLOCKED', label: 'Blocked' }]} required />
            <Select3D label='Beneficial ownership' value={complianceDraft.beneficial_ownership_status || complianceReview.beneficial_ownership_status} onChange={(e) => setComplianceDraft((value) => ({ ...value, beneficial_ownership_status: e.target.value }))} options={[{ value: 'VERIFIED', label: 'Verified' }, { value: 'NOT_APPLICABLE', label: 'Not applicable' }, { value: 'BLOCKED', label: 'Blocked' }]} required />
            <Select3D label='Due-diligence decision' value={complianceDraft.due_diligence_status || complianceReview.due_diligence_status} onChange={(e) => setComplianceDraft((value) => ({ ...value, due_diligence_status: e.target.value }))} options={[{ value: 'CLEARED', label: 'Cleared' }, { value: 'ENHANCED_DUE_DILIGENCE', label: 'Enhanced due diligence required' }, { value: 'RESTRICTED', label: 'Opening restricted' }]} required />
            <label className='flex items-center gap-2 text-sm md:col-span-2'>
              <input type='checkbox' checked={complianceDraft.source_of_funds_required ?? complianceReview.source_of_funds_required} onChange={(e) => setComplianceDraft((value) => ({ ...value, source_of_funds_required: e.target.checked, source_of_funds_status: e.target.checked ? 'UNKNOWN' : 'NOT_APPLICABLE' }))} />
              Source-of-funds verification is required
            </label>
            {(complianceDraft.source_of_funds_required ?? complianceReview.source_of_funds_required) && (
              <Select3D label='Source-of-funds verification' value={complianceDraft.source_of_funds_status || complianceReview.source_of_funds_status} onChange={(e) => setComplianceDraft((value) => ({ ...value, source_of_funds_status: e.target.value }))} options={[{ value: 'VERIFIED', label: 'Verified' }, { value: 'BLOCKED', label: 'Blocked' }]} required />
            )}
            <TextArea label='Restriction or escalation reason' value={complianceDraft.restriction_reason || ''} onChange={(value) => setComplianceDraft((current) => ({ ...current, restriction_reason: value }))} />
            <TextArea label='Review notes and evidence references' value={complianceDraft.review_notes || ''} onChange={(value) => setComplianceDraft((current) => ({ ...current, review_notes: value }))} />
            <TextArea label='Reason for this decision' value={complianceDraft.reason || ''} onChange={(value) => setComplianceDraft((current) => ({ ...current, reason: value }))} required />
            <Button3D type='submit' variant='primary' disabled={complianceMutation.isPending || !complianceDraft.reason?.trim()}>
              {complianceMutation.isPending ? 'Recording...' : 'Record Compliance Decision'}
            </Button3D>
          </form>
          {complianceReview.reviewed_at && <p className='mt-4 text-sm'>Last reviewed by {complianceReview.reviewed_by_name || 'Authorised reviewer'} on {formatDateTime(complianceReview.reviewed_at)}</p>}
        </Card>
      )}

      <Card id='matter-opening-readiness' className='scroll-mt-28 p-6'>
        <h3 className='mb-2 text-lg font-semibold'>Matter-Opening Readiness</h3>
        <p className='mb-4 text-sm text-text-muted-light dark:text-text-muted-dark'>
          The backend enforces every listed control. A preparation-stage label does not replace a formally approved engagement record.
        </p>
        <div className='space-y-2'>
          {(check.opening_readiness?.checks || []).map((item) => (
            <div key={item.code} className={`rounded-lg border p-3 text-sm ${item.complete ? 'border-green-300 bg-green-50 text-green-900' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>
              <strong>{item.complete ? 'Complete' : 'Blocked'}:</strong> {item.label}
            </div>
          ))}
        </div>
      </Card>

      <Card id='conflict-history' className='scroll-mt-28 p-6'>
        <h3 className='mb-4 text-lg font-semibold'>Immutable History</h3>
        <div className='space-y-3'>
          {(check.history || []).map((item) => (
            <div key={item.id} className='rounded-lg border border-border-light p-3 text-sm dark:border-border-dark'>
              <p className='font-semibold'>{item.action} - {item.to_status_label || enumLabel(item.to_status)}</p>
              <p>{item.summary}</p>
              <p className='text-text-muted-light dark:text-text-muted-dark'>{formatDateTime(item.created_at)} by {item.actor_name || 'System'}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
