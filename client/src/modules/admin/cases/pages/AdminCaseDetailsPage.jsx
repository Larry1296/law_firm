import React, { useEffect, useState } from 'react';
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

const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

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
  } = useCaseDetails(id);

  const [selectedLawyer, setSelectedLawyer] = useState('');
  const [selectedSecretary, setSelectedSecretary] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');

  useEffect(() => {
    if (caseData?.priority) {
      setSelectedPriority(caseData.priority);
    }
  }, [caseData?.priority]);

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
    if (!selectedPriority || selectedPriority === caseData.priority) return;

    try {
      await updateCase({
        caseId: id,
        payload: { priority: selectedPriority },
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

  return (
    <div className='space-y-6 p-4 md:p-6 animate-fadeIn'>
      <BackLink label='Back to Cases' fallbackPath='/admin/cases' />

      <SectionHeading
        title={pageTitle}
        subtitle='Case details and activity'
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
              <strong>Case Type:</strong> {friendly(caseData.case_type)}
            </p>

            <p>
              <strong>Court Type:</strong> {friendly(caseData.court_type)}
            </p>
          </div>

          <div className='space-y-2 text-text-primary-light dark:text-text-primary-dark'>
            <p>
              <strong>Court Name:</strong> {safe(courtName, 'Not Set')}
            </p>

            <p>
              <strong>Court Location:</strong> {safe(courtLocation, 'Not Set')}
            </p>

            <p>
              <strong>Filing Date:</strong> {caseData.filing_date ? formatDate(caseData.filing_date) : 'Not Set'}
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
            <p>
              <strong>Procedure Track:</strong> {friendly(caseData.procedure_track, 'Not Set')}
            </p>
            <p>
              <strong>Court Division:</strong> {friendly(caseData.court_division, 'Not Set')}
            </p>
            <p>
              <strong>Court Station:</strong> {safe(caseData.court_station, 'Not Set')}
            </p>
            <p>
              <strong>Registry:</strong> {safe(caseData.registry, 'Not Set')}
            </p>
          </div>

          <div className='space-y-2 text-text-primary-light dark:text-text-primary-dark'>
            <p>
              <strong>Courtroom:</strong> {safe(caseData.courtroom, 'Not Set')}
            </p>
            <p>
              <strong>Judicial Officer:</strong> {safe(caseData.judicial_officer, 'Not Set')}
            </p>
            <p>
              <strong>Next Court Date:</strong> {caseData.next_court_date ? formatDateTime(caseData.next_court_date) : 'Not Set'}
            </p>
            <p>
              <strong>Next Action:</strong> {safe(caseData.next_action, 'Not Set')}
            </p>
          </div>
        </div>

        <div className='mt-4 grid gap-6 md:grid-cols-3'>
          <p>
            <strong>eFiling Ref:</strong> {safe(caseData.efiling_reference, 'Not Set')}
          </p>
          <p>
            <strong>CTS Ref:</strong> {safe(caseData.cts_reference, 'Not Set')}
          </p>
          <p>
            <strong>Payment Ref:</strong> {safe(caseData.payment_reference, 'Not Set')}
          </p>
        </div>
      </Card>

      <Card className='p-6'>
        <h3 className='mb-4 text-lg font-semibold text-text-primary-light dark:text-text-primary-dark'>
          Parties
        </h3>

        {caseData.parties?.length ? (
          <div className='grid gap-4 md:grid-cols-2'>
            {caseData.parties.map((party) => (
              <div
                key={party.id}
                className='rounded-xl border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark'
              >
                <p className='font-semibold text-text-primary-light dark:text-text-primary-dark'>
                  {safe(party.name)}
                </p>
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
          <p className='text-text-muted-light dark:text-text-muted-dark'>
            No structured party records yet.
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
              value={selectedPriority}
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
          Events
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
                <pre className='whitespace-pre-wrap text-sm text-text-primary-light dark:text-text-primary-dark'>
                  {JSON.stringify(event, null, 2)}
                </pre>
              </div>
            ))}
          </div>
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
    </div>
  );
};

export default AdminCaseDetailsPage;
