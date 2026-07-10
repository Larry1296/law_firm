import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import secretaryClientsService from '@/modules/staff/secretary/clients/services/secretaryClientServices';

import StatsCard from '@/components/ui/StatsCard';
import SectionHeading from '@/components/ui/SectionHeading';
import BackLink from '@/components/ui/BackLink';
import { formatDateTime } from '@/core/utils/dateFormatter';

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
  const pageTitle = safe(
    client.full_name ||
      client.display_name ||
      client.organization_name ||
      client.company_name ||
      client.name,
    'Client Details',
  );

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <BackLink label='Back to Clients' fallbackPath='/secretary/clients' />
      </div>

      <SectionHeading title={pageTitle} subtitle='Client Details' />

      {/* CLIENT HEADER */}
      <div
        style={{
          marginBottom: 24,
          padding: 20,
          border: '1px solid #e5e7eb',
          borderRadius: 12,
        }}
      >
        <h2 style={{ marginBottom: 8 }}>{client.full_name}</h2>

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
          <strong>Client Type:</strong> {safe(client.client_type)}
        </p>

        <p>
          <strong>Status:</strong> {safe(client.lifecycle_status)}
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
      </div>

      {/* QUICK STATS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
        }}
      >
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
