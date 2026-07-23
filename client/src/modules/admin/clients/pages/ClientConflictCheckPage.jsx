import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import BackLink from '@/components/ui/BackLink';
import Button3D from '@/components/ui/Button3D';
import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import Select3D from '@/components/ui/Select3D';
import { Input3D } from '@/components/ui/Input3D';
import adminClientsService from '@/modules/admin/clients/services/adminClientsService';
import useFirmLawyers from '@/modules/admin/cases/hooks/useFirmLawyers';
import lawyerCasesService from '@/modules/staff/lawyer/cases/services/lawyerCasesService';
import { enumLabel } from '@/core/utils/textFormatter';
import { formatDateTime } from '@/core/utils/dateFormatter';

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

function TextArea({ label, value, onChange, required = false, rows = 3 }) {
  return (
    <label className='block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'>
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        required={required}
        className='mt-2 w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light shadow-soft focus:border-brand-primary focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
      />
    </label>
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

  const lawyerOptions = useMemo(
    () => (lawyers || []).map((lawyer) => ({
      value: lawyer.membership_id || lawyer.id,
      label: lawyer.full_name,
    })),
    [lawyers],
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      const parties = draft.adverse_party_name.trim()
        ? [{
            name: draft.adverse_party_name.trim(),
            party_type: 'PERSON',
            role: 'PROPOSED_ADVERSE_PARTY',
          }]
        : [];
      return service.createConflictCheck(clientId, { ...draft, parties });
    },
    onSuccess: (created) => navigate(`${basePath}/clients/${clientId}/conflict-checks/${created.id}`),
  });

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

  const canCreateCase = check.status === 'CLEARED' && !check.consumed_at && !check.created_case;
  const canViewCase = check.created_case;
  const nextOptions = check.permitted_next_statuses || [];

  return (
    <div className='space-y-6 p-4 md:p-6'>
      <BackLink label='Back to Client' fallbackPath={`${basePath}/clients/${clientId}`} />
      <SectionHeading title={check.reference_number} subtitle={check.proposed_matter_title} />

      <Card className='p-6'>
        <div className='grid gap-4 md:grid-cols-3'>
          <p><strong>Client:</strong> {check.client_name || clientData?.client?.full_name || 'Recorded'}</p>
          <p><strong>Status:</strong> {check.status_label || enumLabel(check.status)}</p>
          <p><strong>Responsible advocate:</strong> {check.responsible_lawyer_name || 'Not recorded'}</p>
          <p><strong>Deadline:</strong> {check.limitation_or_deadline_date || 'Not recorded'}</p>
          <p><strong>Linked case:</strong> {check.created_case_number || '-'}</p>
          <p><strong>Consumed:</strong> {check.consumed_at ? formatDateTime(check.consumed_at) : 'No'}</p>
        </div>
        <div className='mt-4 grid gap-4 md:grid-cols-2'>
          <p><strong>Instructions:</strong> {check.proposed_instructions}</p>
          <p><strong>Factual summary:</strong> {check.factual_summary || 'Not recorded'}</p>
          <p><strong>Desired outcome:</strong> {check.desired_outcome || 'Not recorded'}</p>
          <p><strong>Adverse parties:</strong> {(check.adverse_parties || []).join(', ') || 'None recorded'}</p>
          <p><strong>Names checked:</strong> {(check.names_checked || []).join(', ') || 'Not recorded'}</p>
          <p><strong>Sources checked:</strong> {(check.source_categories_checked || []).map(enumLabel).join(', ') || 'Not recorded'}</p>
          <p><strong>Findings:</strong> {check.first_reviewer_findings || 'Not recorded'}</p>
          <p><strong>Result:</strong> {check.result_summary || check.internal_reason || 'Not recorded'}</p>
        </div>
        <div className='mt-5 flex flex-wrap gap-3'>
          {canCreateCase && (
            <Button3D variant='primary' onClick={() => navigate(`${basePath}/cases/create?client=${clientId}&conflict_check=${check.id}`)}>
              Create Case
            </Button3D>
          )}
          {canViewCase && (
            <Button3D variant='primary' onClick={() => navigate(`${basePath}/cases/${check.created_case}`)}>
              View Case
            </Button3D>
          )}
        </div>
      </Card>

      {nextOptions.length > 0 && (
        <Card className='p-6'>
          <h3 className='mb-4 text-lg font-semibold'>Next outcome</h3>
          <form className='grid gap-4 md:grid-cols-2' onSubmit={(event) => { event.preventDefault(); actionMutation.mutate(); }}>
            <Select3D value={actionDraft.next_status} onChange={(e) => setActionDraft((v) => ({ ...v, next_status: e.target.value }))} options={nextOptions} placeholder='Select next outcome' />
            {actionDraft.next_status === 'AWAITING_INFORMATION' && <TextArea label='Information missing' value={actionDraft.information_missing} onChange={(value) => setActionDraft((v) => ({ ...v, information_missing: value }))} required />}
            {actionDraft.next_status === 'POTENTIAL_CONFLICT' && <TextArea label='First reviewer findings' value={actionDraft.first_reviewer_findings} onChange={(value) => setActionDraft((v) => ({ ...v, first_reviewer_findings: value }))} required />}
            {actionDraft.next_status === 'ESCALATED_FOR_REVIEW' && <Select3D label='Review advocate' value={actionDraft.review_assigned_to_id} onChange={(e) => setActionDraft((v) => ({ ...v, review_assigned_to_id: e.target.value }))} options={lawyerOptions} placeholder='Select reviewer' />}
            {actionDraft.next_status === 'ESCALATED_FOR_REVIEW' && <TextArea label='Escalation summary' value={actionDraft.summary} onChange={(value) => setActionDraft((v) => ({ ...v, summary: value }))} required />}
            {actionDraft.next_status === 'CLEARED' && <Input3D label='Names checked, comma separated' value={actionDraft.names_checked} onChange={(e) => setActionDraft((v) => ({ ...v, names_checked: e.target.value }))} required />}
            {actionDraft.next_status === 'CLEARED' && <Select3D label='Sources checked' multiple value={actionDraft.source_categories_checked} onChange={(e) => setActionDraft((v) => ({ ...v, source_categories_checked: Array.from(e.target.selectedOptions).map((item) => item.value) }))} options={SOURCE_OPTIONS} required />}
            {actionDraft.next_status === 'CLEARED' && <TextArea label='Result summary' value={actionDraft.result_summary} onChange={(value) => setActionDraft((v) => ({ ...v, result_summary: value }))} required />}
            {actionDraft.next_status === 'CONFLICT_CONFIRMED' && <TextArea label='Internal reason' value={actionDraft.internal_reason} onChange={(value) => setActionDraft((v) => ({ ...v, internal_reason: value }))} required />}
            {actionDraft.next_status === 'CLOSED_WITHOUT_DECISION' && <TextArea label='Closure reason' value={actionDraft.closure_reason} onChange={(value) => setActionDraft((v) => ({ ...v, closure_reason: value }))} required />}
            {['CLEARED', 'CONFLICT_CONFIRMED'].includes(actionDraft.next_status) && (
              <label className='flex items-center gap-2 text-sm md:col-span-2'>
                <input type='checkbox' checked={actionDraft.decision_confirmation} onChange={(e) => setActionDraft((v) => ({ ...v, decision_confirmation: e.target.checked }))} />
                I confirm this professional conflict decision for these proposed instructions only.
              </label>
            )}
            <Button3D type='submit' variant='primary' disabled={!actionDraft.next_status || actionMutation.isPending}>
              {actionMutation.isPending ? 'Recording...' : 'Record Outcome'}
            </Button3D>
          </form>
        </Card>
      )}

      <Card className='p-6'>
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
