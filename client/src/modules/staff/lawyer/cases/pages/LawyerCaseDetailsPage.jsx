import React from 'react';
import { useParams } from 'react-router-dom';

import StatsCard from '@/components/ui/StatsCard';
import SectionHeading from '@/components/ui/SectionHeading';
import BackLink from '@/components/ui/BackLink';
import Card from '@/components/ui/Card';
import { formatDateTime } from '@/core/utils/dateFormatter';

import { useMyCase } from '@/modules/staff/lawyer/cases/hooks/useLawyerCases';

export default function LawyerCaseDetailsPage() {
  const { id } = useParams();

  const { data, isLoading, error } = useMyCase(id);

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
  const thread = caseData?.thread ?? {};

  const safe = (value, fallback = 'N/A') =>
    value !== null && value !== undefined && value !== '' ? value : fallback;
  const pageTitle = safe(caseData.title, safe(caseData.case_number, 'Case Details'));

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
              <strong>Status:</strong> {safe(caseData.status)}
            </p>
            <p>
              <strong>Priority:</strong> {safe(caseData.priority)}
            </p>
            <p>
              <strong>Type:</strong> {safe(caseData.case_type)}
            </p>
            <p>
              <strong>Court:</strong> {safe(caseData.court_name)}
            </p>
          </div>

          <div className='space-y-2 text-text-primary-light dark:text-text-primary-dark'>
            <p>
              <strong>Court Location:</strong> {safe(caseData.court_location)}
            </p>
            <p>
              <strong>Filing Date:</strong> {safe(caseData.filing_date)}
            </p>
            <p>
              <strong>Assigned Lawyer:</strong>{' '}
              {safe(caseData.assigned_lawyer?.full_name)}
            </p>
            <p>
              <strong>Assigned Secretary:</strong>{' '}
              {safe(caseData.assigned_secretary?.full_name)}
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
          Client & Parties
        </h3>

        <div className='grid gap-6 md:grid-cols-2'>
          <div className='space-y-2 text-text-primary-light dark:text-text-primary-dark'>
            <p>
              <strong>Client:</strong> {safe(caseData.client?.full_name)}
            </p>
            <p>
              <strong>Email:</strong> {safe(caseData.client?.email)}
            </p>
            <p>
              <strong>Phone:</strong> {safe(caseData.client?.phone_number)}
            </p>
            <p>
              <strong>Type:</strong> {safe(caseData.client?.client_type)}
            </p>
          </div>

          <div className='space-y-2 text-text-primary-light dark:text-text-primary-dark'>
            <p>
              <strong>Plaintiff:</strong> {safe(caseData.plaintiff)}
            </p>
            <p>
              <strong>Defendant:</strong> {safe(caseData.defendant)}
            </p>
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
          Internal Thread
        </h3>

        {thread?.messages?.length ? (
          <div className='space-y-3'>
            {thread.messages.map((msg, i) => (
              <div
                key={msg.id || i}
                className='rounded-xl border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark'
              >
                <p className='text-text-primary-light dark:text-text-primary-dark'>
                  {msg.content}
                </p>
                <p className='mt-2 text-xs text-text-muted-light dark:text-text-muted-dark'>
                  {msg.created_at ? formatDateTime(msg.created_at) : 'N/A'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className='text-text-muted-light dark:text-text-muted-dark'>
            No messages yet.
          </p>
        )}
      </Card>

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
          Events
        </h3>

        {events.length ? (
          <pre className='text-sm text-text-primary-light dark:text-text-primary-dark whitespace-pre-wrap'>
            {JSON.stringify(events, null, 2)}
          </pre>
        ) : (
          <p className='text-text-muted-light dark:text-text-muted-dark'>
            No events.
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
