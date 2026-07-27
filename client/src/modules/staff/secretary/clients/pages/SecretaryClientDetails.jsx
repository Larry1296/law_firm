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

  const hasValue = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const normalized = value.trim().toUpperCase();
      return normalized !== '' && normalized !== 'UNKNOWN' && normalized !== 'N/A';
    }
    if (Array.isArray(value)) return value.length > 0;
    return true;
  };
  const displayValue = (value) => {
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'string' && /^[A-Z0-9_]+$/.test(value)) {
      return enumLabel(value);
    }
    return String(value);
  };
  const profileFields = client.type_profile
    ? Object.entries(client.type_profile)
        .filter(
          ([key, value]) =>
            !['id', 'client', 'created_at', 'updated_at'].includes(key) &&
            hasValue(value),
        )
        .map(([key, value]) => ({
          label: titleCase(key.replace(/_/g, ' ')),
          value: displayValue(value),
        }))
    : [];
  const pageTitle =
    client.full_name ||
    client.display_name ||
    client.organization_name ||
    client.company_name ||
    client.name ||
    'Client Details';
  const clientFields = [
    { label: 'Email', value: client.email },
    { label: 'Phone', value: client.phone_number },
    { label: 'National ID', value: client.national_id },
    { label: 'Passport', value: client.passport_number },
    { label: 'KRA PIN', value: client.kra_pin },
    { label: 'Address', value: client.primary_address?.full_address },
    { label: 'Client Type', value: client.client_type },
    { label: 'Access Type', value: client.access_type },
    { label: 'Lifecycle Status', value: client.lifecycle_status },
    {
      label: 'Official Since',
      value: client.official_client_since
        ? formatDateTime(client.official_client_since)
        : null,
    },
    {
      label: 'Portal Access',
      value: client.portal_access_exists ? 'Enabled' : null,
    },
    { label: 'Portal Login Email', value: client.portal_login_email },
    { label: 'Active', value: client.is_active ? 'Yes' : null },
    {
      label: 'Created',
      value: client.created_at ? formatDateTime(client.created_at) : null,
    },
  ].filter((field) => hasValue(field.value));

  return (
    <div className='space-y-6 p-4 md:p-6 text-[color:var(--text-primary)]'>
      <div>
        <BackLink label='Back to Clients' fallbackPath='/secretary/clients' />
      </div>

      <SectionHeading title={pageTitle} subtitle='Client Details' />

      {/* CLIENT HEADER */}
      <Card className='p-5'>
        <h2 className='mb-3 text-xl font-semibold'>{client.full_name}</h2>
        <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
          {clientFields.map((field) => (
            <p key={field.label}>
              <strong>{field.label}:</strong> {displayValue(field.value)}
            </p>
          ))}
        </div>
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

      {(client.representatives ?? []).length > 0 && (
        <Card className='p-5'>
          <h3 className='mb-3 text-lg font-semibold'>Authorized Representatives</h3>
          {client.representatives.map((representative) => (
            <div
              key={representative.id}
              className='mb-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-4'
            >
              <p>
                <strong>{representative.full_legal_name}</strong>
              </p>
              <p>
                {[
                  representative.representative_category
                    ? enumLabel(representative.representative_category)
                    : null,
                  representative.role_title,
                ]
                  .filter(hasValue)
                  .join(' · ')}
              </p>
              {[representative.email, representative.telephone].some(hasValue) && (
                <p>
                  {[representative.email, representative.telephone]
                    .filter(hasValue)
                    .join(' · ')}
                </p>
              )}
            </div>
          ))}
        </Card>
      )}

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
