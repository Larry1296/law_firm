import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Swal from '@/core/utils/themedSwal';

import StatsCard from '@/components/ui/StatsCard';
import SectionHeading from '@/components/ui/SectionHeading';
import BackLink from '@/components/ui/BackLink';
import Card from '@/components/ui/Card';
import { formatDateTime } from '@/core/utils/dateFormatter';

import useCaseDetails from '@/modules/admin/cases/hooks/useAdminCaseDetails';

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
    reassignSecretary,
    isReassigningSecretary,
  } = useCaseDetails(id);

  const [selectedLawyer, setSelectedLawyer] = useState('');
  const [selectedSecretary, setSelectedSecretary] = useState('');

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
  const pageTitle = safe(caseData.title, safe(caseData.case_number, 'Case Details'));

  const currentSecretaryId =
    selectedSecretary ||
    caseData?.assigned_secretary?.membership_id ||
    secretaries?.[0]?.membership_id ||
    '';

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
    if (!currentSecretaryId) return;

    const secretary = secretaries.find(
      (s) => s.membership_id === currentSecretaryId,
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
        membershipId: currentSecretaryId,
      });

      Swal.fire({
        icon: 'success',
        title: 'Secretary Assigned',
        text: 'Secretary updated successfully.',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Assignment Failed',
        text: error?.response?.data?.message || 'Failed to assign secretary.',
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
              <strong>Status:</strong> {safe(caseData.status)}
            </p>

            <p>
              <strong>Priority:</strong> {safe(caseData.priority)}
            </p>

            <p>
              <strong>Case Type:</strong> {safe(caseData.case_type)}
            </p>

            <p>
              <strong>Court Type:</strong> {safe(caseData.court_type)}
            </p>
          </div>

          <div className='space-y-2 text-text-primary-light dark:text-text-primary-dark'>
            <p>
              <strong>Court Name:</strong> {safe(caseData.court_name)}
            </p>

            <p>
              <strong>Court Location:</strong> {safe(caseData.court_location)}
            </p>

            <p>
              <strong>Filing Date:</strong> {safe(caseData.filing_date)}
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
          Parties
        </h3>

        <div className='grid gap-6 md:grid-cols-2'>
          <div className='space-y-2 text-text-primary-light dark:text-text-primary-dark'>
            <p>
              <strong>Plaintiff:</strong> {safe(caseData.plaintiff)}
            </p>

            <p>
              <strong>Defendant:</strong> {safe(caseData.defendant)}
            </p>
          </div>

          <div className='space-y-2 text-text-primary-light dark:text-text-primary-dark'>
            <p>
              <strong>Client:</strong> {safe(caseData.client?.full_name)}
            </p>

            <p>
              <strong>Client Phone:</strong>{' '}
              {safe(caseData.client?.phone_number)}
            </p>

            <p>
              <strong>Client Email:</strong> {safe(caseData.client?.email)}
            </p>
          </div>
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

                {lawyers.map((lawyer) => (
                  <option
                    key={lawyer.membership_id}
                    value={lawyer.membership_id}
                  >
                    {lawyer.full_name}
                    {lawyer.is_system_admin ? ' (Admin)' : ''}
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

          <div className='mt-5 space-y-3'>
            <select
              value={selectedSecretary}
              onChange={(e) => setSelectedSecretary(e.target.value)}
              className='w-full rounded-xl border border-border-light bg-surface-light px-4 py-3 text-text-primary-light shadow-soft transition focus:border-brand-primary focus:outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
            >
              <option value=''>Select Secretary</option>
              {secretaries.map((secretary) => (
                <option
                  key={secretary.membership_id}
                  value={secretary.membership_id}
                >
                  {secretary.full_name}
                </option>
              ))}
            </select>

            <button
              onClick={() =>
                handleSecretaryReassign({
                  caseId: id,
                  membershipId: selectedSecretary,
                })
              }
              disabled={!selectedSecretary || isReassigningSecretary}
              className='w-full rounded-xl bg-brand-primary px-4 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {isReassigningSecretary ? 'Reassigning...' : 'Reassign Secretary'}
            </button>
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
