import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import adminClientsService from '@/modules/admin/clients/services/adminClientsService';

import Card from '@/components/ui/Card';
import StatsCard from '@/components/ui/StatsCard';
import SectionHeading from '@/components/ui/SectionHeading';
import BackLink from '@/components/ui/BackLink';

import { formatDateTime } from '@/core/utils/dateFormatter';
import { titleCase, enumLabel } from '@/core/utils/textFormatter';

export default function AdminClientDetailsPage() {
  const { id } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-client', id],
    queryFn: () => adminClientsService.getClientDetails(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className='flex justify-center items-center min-h-[400px]'>
        Loading client...
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex justify-center items-center min-h-[400px]'>
        Failed to load client.
      </div>
    );
  }

  const analytics = data?.analytics ?? {};
  const client = data?.client ?? {};
  const pageTitle = titleCase(
    client.full_name ||
      client.display_name ||
      client.organization_name ||
      client.company_name ||
      client.name ||
      'Client Details',
  );

  const hasValue = (value) => {
    if (value === null || value === undefined) return false;

    if (typeof value === 'string') {
      return value.trim() !== '';
    }

    return true;
  };

  const basicInformation = [
    {
      label: 'Full Name',
      value: titleCase(client.full_name),
    },
    {
      label: 'Email',
      value: client.email?.toLowerCase(),
    },
    {
      label: 'Phone Number',
      value: client.phone_number,
    },
    {
      label: 'National ID',
      value: client.national_id,
    },
    {
      label: 'Passport Number',
      value: client.passport_number,
    },
    {
      label: 'KRA PIN',
      value: client.kra_pin?.toUpperCase(),
    },
    {
      label: 'Date of Birth',
      value: client.date_of_birth,
    },
    {
      label: 'Client Type',
      value: enumLabel(client.client_type),
    },
    {
      label: 'Access Type',
      value: enumLabel(client.access_type),
    },
    {
      label: 'Lifecycle Status',
      value: enumLabel(client.lifecycle_status),
    },
    {
      label: 'Active',
      value: client.is_active ? 'Yes' : 'No',
    },
    {
      label: 'Created',
      value: formatDateTime(client.created_at),
    },
    {
      label: 'Created By',
      value: client.created_by_name,
    },
    {
      label: 'Updated',
      value: formatDateTime(client.updated_at),
    },
  ].filter((field) => hasValue(field.value));

  const formatProfileLabel = (key) =>
    titleCase(key.replace(/_/g, ' '));

  const formatProfileValue = (value) => {
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'string' && /^[A-Z0-9_]+$/.test(value)) {
      return enumLabel(value);
    }
    return value;
  };

  const profileFields = client.type_profile
    ? Object.entries(client.type_profile)
        .filter(([key, value]) => key !== 'id' && hasValue(value))
        .map(([key, value]) => ({
          label: formatProfileLabel(key),
          value: formatProfileValue(value),
        }))
    : [];

  return (
    <div className='space-y-6 p-4 md:p-6 animate-fadeIn'>
      <BackLink label='Back to Clients' fallbackPath='/admin/clients' />

      <SectionHeading
        title={pageTitle}
        subtitle='Client Details'
      />

      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        <StatsCard title='Addresses' value={analytics.addresses ?? 0} color='blue' />

        <StatsCard title='Contacts' value={analytics.contacts ?? 0} color='green' />

        <StatsCard
          title='Documents'
          value={analytics.documents ?? 0}
          color='purple'
        />

        <StatsCard
          title='Status'
          value={enumLabel(analytics.lifecycle_status ?? client.lifecycle_status)}
          color='yellow'
        />
      </div>

      <Card className='p-6'>
        <h3 className='text-lg font-semibold mb-4'>Basic Information</h3>

        <div className='grid md:grid-cols-2 gap-4'>
          {basicInformation.map((field) => (
            <div key={field.label}>
              <strong>{field.label}</strong>
              <p>{field.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {client.client_type === 'INDIVIDUAL' && (
        <Card className='p-6'>
          <h3 className='text-lg font-semibold mb-4'>Portal Access</h3>
          {client.portal_access_exists ? (
            <div className='grid md:grid-cols-2 gap-4'>
              <div>
                <strong>Portal login email</strong>
                <p>{client.portal_login_email}</p>
              </div>
              <div>
                <strong>Account status</strong>
                <p>Created</p>
              </div>
              <div>
                <strong>Access type</strong>
                <p>{enumLabel(client.access_type)}</p>
              </div>
              <div>
                <strong>Lifecycle</strong>
                <p>{enumLabel(client.lifecycle_status)}</p>
              </div>
            </div>
          ) : (
            <p>No portal account has been created.</p>
          )}
        </Card>
      )}

      {profileFields.length > 0 && (
        <Card className='p-6'>
          <h3 className='text-lg font-semibold mb-4'>
            {enumLabel(client.client_type)} Profile
          </h3>

          <div className='grid md:grid-cols-3 gap-4'>
            {profileFields.map((field) => (
              <div key={field.label}>
                <strong>{field.label}</strong>
                <p>{field.value}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className='p-6'>
        <h3 className='text-lg font-semibold mb-4'>Addresses</h3>

        {(client.addresses ?? []).length === 0 ? (
          <p>No addresses available.</p>
        ) : (
          client.addresses.map((address) => {
            const addressFields = [
              {
                label: 'Type',
                value: enumLabel(address.address_type),
              },
              {
                label: 'Country',
                value: titleCase(address.country),
              },
              {
                label: 'County',
                value: titleCase(address.county),
              },
              {
                label: 'City',
                value: titleCase(address.city),
              },
              {
                label: 'Street',
                value: titleCase(address.street),
              },
              {
                label: 'Postal Code',
                value: address.postal_code,
              },
              {
                label: 'Full Address',
                value: titleCase(address.full_address),
              },
            ].filter((field) => hasValue(field.value));

            return (
              <div
                key={address.id}
                className='border border-border-light dark:border-border-dark rounded-xl p-4 mb-4'
              >
                {addressFields.map((field) => (
                  <p key={field.label}>
                    <strong>{field.label}:</strong> {field.value}
                  </p>
                ))}
              </div>
            );
          })
        )}
      </Card>

      <Card className='p-6'>
        <h3 className='text-lg font-semibold mb-4'>Contacts</h3>

        {(client.contacts ?? []).length === 0 ? (
          <p>No contacts available.</p>
        ) : (
          client.contacts.map((contact) => {
            const contactFields = [
              {
                label: 'Name',
                value: titleCase(contact.full_name),
              },
              {
                label: 'Phone',
                value: contact.phone_number,
              },
              {
                label: 'Alternative Phone',
                value: contact.alternative_phone_number,
              },
              {
                label: 'Email',
                value: contact.email?.toLowerCase(),
              },
              {
                label: 'National ID',
                value: contact.national_id_number,
              },
              {
                label: 'Relationship / Role',
                value: titleCase(contact.role_or_designation),
              },
              {
                label: 'Contact Type',
                value: enumLabel(contact.contact_type),
              },
              {
                label: 'Preferred Channel',
                value: enumLabel(contact.preferred_channel),
              },
              {
                label: 'Primary',
                value: contact.is_primary ? 'Yes' : 'No',
              },
              {
                label: 'Verified',
                value: contact.is_verified ? 'Yes' : 'No',
              },
              {
                label: 'Notes',
                value: contact.notes,
              },
            ].filter((field) => hasValue(field.value));

            return (
              <div
                key={contact.id}
                className='border border-border-light dark:border-border-dark rounded-xl p-4 mb-4'
              >
                {contactFields.map((field) => (
                  <p key={field.label}>
                    <strong>{field.label}:</strong> {field.value}
                  </p>
                ))}
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}
