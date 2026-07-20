import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import secretaryClientsService from '@/modules/staff/secretary/clients/services/secretaryClientServices';

import Card from '@/components/ui/Card';
import StatsCard from '@/components/ui/StatsCard';
import SectionHeading from '@/components/ui/SectionHeading';
import BackLink from '@/components/ui/BackLink';
import { formatDateTime } from '@/core/utils/dateFormatter';
import { enumLabel, titleCase } from '@/core/utils/textFormatter';

const clientKeys = {
  detail: (id) => ['secretary-client', id],
};

const SecretaryClientDetails = () => {
  const { id } = useParams();

  const {
    data: client,
    isLoading,
    error,
  } = useQuery({
    queryKey: clientKeys.detail(id),
    queryFn: async () => {
      const response = await secretaryClientsService.getClientById(id);

      return response; // already unwrapped in service
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <div>Loading client details...</div>;
  }

  if (error) {
    return <div>Failed to load client details.</div>;
  }

  if (!client) {
    return <div>Client not found.</div>;
  }

  const safe = (val, fallback = 'N/A') => val || fallback;
  const hasValue = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim() !== '';
    return true;
  };
  const profileFields = client.type_profile
    ? Object.entries(client.type_profile)
        .filter(([key, value]) => key !== 'id' && hasValue(value))
        .map(([key, value]) => ({
          label: titleCase(key.replace(/_/g, ' ')),
          value:
            typeof value === 'string' && /^[A-Z0-9_]+$/.test(value)
              ? enumLabel(value)
              : value,
        }))
    : [];
  const pageTitle = safe(
    client.full_name ||
      client.display_name ||
      client.organization_name ||
      client.company_name ||
      client.name,
    'Client Details',
  );

  return (
    <div className='space-y-6 p-4 md:p-6 text-[color:var(--text-primary)]'>
      <div>
        <BackLink label='Back to Clients' fallbackPath='/secretary/clients' />
      </div>

      <SectionHeading title={pageTitle} subtitle='Client Details' />

      {/* CLIENT HEADER */}
      <Card className='p-5'>
        <h2 className='mb-3 text-xl font-semibold'>{client.full_name}</h2>

        <p>
          <strong>Email:</strong> {safe(client.email)}
        </p>

        <p>
          <strong>Phone:</strong> {safe(client.phone_number)}
        </p>

        <p>
          <strong>National ID:</strong> {safe(client.national_id)}
        </p>

        <p>
          <strong>Address:</strong> {safe(client.address)}
        </p>

        <p>
          <strong>Client Type:</strong> {enumLabel(client.client_type)}
        </p>

        <p>
          <strong>Access Type:</strong> {enumLabel(client.access_type)}
        </p>

        <p>
          <strong>Status:</strong> {enumLabel(client.lifecycle_status)}
        </p>

        <p>
          <strong>Official Since:</strong>{' '}
          {client.official_client_since
            ? formatDateTime(client.official_client_since)
            : 'Not Set'}
        </p>

        <p>
          <strong>Represented:</strong> {client.is_represented ? 'Yes' : 'No'}
        </p>

        <p>
          <strong>Portal Enabled:</strong>{' '}
          {client.portal_enabled ? 'Yes' : 'No'}
        </p>

        <p>
          <strong>Active:</strong> {client.is_active ? 'Yes' : 'No'}
        </p>

        <p>
          <strong>Created:</strong> {formatDateTime(client.created_at)}
        </p>
      </Card>

      {profileFields.length > 0 && (
        <Card className='p-5'>
          <h3 className='mb-3 text-lg font-semibold'>
            {enumLabel(client.client_type)} Profile
          </h3>
          <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
            {profileFields.map((field) => (
              <p key={field.label}>
                <strong>{field.label}:</strong> {String(field.value)}
              </p>
            ))}
          </div>
        </Card>
      )}

      <Card className='p-5'>
        <h3 className='mb-3 text-lg font-semibold'>Authorized Representatives</h3>
        {(client.representatives ?? []).length === 0 ? (
          <p className='text-[color:var(--text-muted)]'>
            No authorized representatives recorded.
          </p>
        ) : (
          client.representatives.map((representative) => (
            <div
              key={representative.id}
              className='mb-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-4'
            >
              <p>
                <strong>{representative.full_legal_name}</strong>
              </p>
              <p>
                {enumLabel(representative.representative_category)} ·{' '}
                {safe(representative.role_title)}
              </p>
              <p>
                {safe(representative.email)} · {safe(representative.telephone)}
              </p>
            </div>
          ))
        )}
      </Card>

      {/* QUICK STATS */}
      <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
        <StatsCard
          title='Representation'
          value={client.is_represented ? 'Active' : 'Not Active'}
        />

        <StatsCard title='Lifecycle' value={client.lifecycle_status} />
      </div>
    </div>
  );
};

export default SecretaryClientDetails;
