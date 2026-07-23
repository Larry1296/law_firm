import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import adminClientsService from '@/modules/admin/clients/services/adminClientsService';

import Card from '@/components/ui/Card';
import StatsCard from '@/components/ui/StatsCard';
import SectionHeading from '@/components/ui/SectionHeading';
import BackLink from '@/components/ui/BackLink';
import Button3D from '@/components/ui/Button3D';

import { formatDateTime } from '@/core/utils/dateFormatter';
import { titleCase, enumLabel } from '@/core/utils/textFormatter';

export default function AdminClientDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-client', id],
    queryFn: () => adminClientsService.getClientDetails(id),
    enabled: !!id,
  });
  const { data: conflictChecks = [] } = useQuery({
    queryKey: ['admin-client-conflict-checks', id],
    queryFn: () => adminClientsService.getConflictChecks(id),
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

  const representativeFields = (representative) =>
    [
      { label: 'Full legal name', value: titleCase(representative.full_legal_name) },
      { label: 'Category', value: enumLabel(representative.representative_category) },
      { label: 'Role / title', value: titleCase(representative.role_title) },
      { label: 'Email', value: representative.email?.toLowerCase() },
      { label: 'Telephone', value: representative.telephone },
      { label: 'Authority type', value: titleCase(representative.authority_type) },
      {
        label: 'Authority document',
        value: representative.authority_document_reference,
      },
      { label: 'Authority starts', value: representative.authority_start_date },
      { label: 'Authority ends', value: representative.authority_end_date },
      { label: 'Primary', value: representative.is_primary ? 'Yes' : 'No' },
      {
        label: 'Portal contact',
        value: representative.is_portal_contact ? 'Yes' : 'No',
      },
      {
        label: 'Litigation representative',
        value: representative.is_litigation_representative ? 'Yes' : 'No',
      },
      { label: 'Verified', value: representative.is_verified ? 'Yes' : 'No' },
      { label: 'Notes', value: representative.notes },
    ].filter((field) => hasValue(field.value));

  const actionForConflictCheck = (check) => {
    if (check.status === 'CLEARED' && check.created_case) return { label: 'View Case', path: `/admin/cases/${check.created_case}` };
    if (check.status === 'CLEARED') return { label: 'Create Case', path: `/admin/cases/create?client=${id}&conflict_check=${check.id}` };
    if (check.status === 'NOT_STARTED') return { label: 'Begin Check', path: `/admin/clients/${id}/conflict-checks/${check.id}` };
    if (check.status === 'IN_PROGRESS') return { label: 'Continue Check', path: `/admin/clients/${id}/conflict-checks/${check.id}` };
    if (check.status === 'AWAITING_INFORMATION') return { label: 'Update / Resume', path: `/admin/clients/${id}/conflict-checks/${check.id}` };
    if (check.status === 'POTENTIAL_CONFLICT') return { label: 'Review / Escalate', path: `/admin/clients/${id}/conflict-checks/${check.id}` };
    if (check.status === 'ESCALATED_FOR_REVIEW') return { label: 'Review Decision', path: `/admin/clients/${id}/conflict-checks/${check.id}` };
    return { label: check.status === 'CONFLICT_CONFIRMED' ? 'View Decision' : 'View Record', path: `/admin/clients/${id}/conflict-checks/${check.id}` };
  };

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
        <div className='mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <h3 className='text-lg font-semibold'>Proposed Matters and Conflict Checks</h3>
          <Button3D variant='primary' onClick={() => navigate(`/admin/clients/${id}/conflict-checks/new`)}>
            Start New Proposed Matter
          </Button3D>
        </div>
        {conflictChecks.length === 0 ? (
          <p>No proposed-matter conflict checks recorded.</p>
        ) : (
          <div className='overflow-x-auto'>
            <table className='min-w-full text-left text-sm'>
              <thead className='text-text-muted-light dark:text-text-muted-dark'>
                <tr>
                  <th className='py-2 pr-4'>Reference</th>
                  <th className='py-2 pr-4'>Proposed matter</th>
                  <th className='py-2 pr-4'>Adverse parties</th>
                  <th className='py-2 pr-4'>Responsible advocate</th>
                  <th className='py-2 pr-4'>Status</th>
                  <th className='py-2 pr-4'>Urgency / deadline</th>
                  <th className='py-2 pr-4'>Linked case</th>
                  <th className='py-2 pr-4'>Action</th>
                </tr>
              </thead>
              <tbody>
                {conflictChecks.map((check) => {
                  const action = actionForConflictCheck(check);
                  return (
                    <tr key={check.id} className='border-t border-border-light dark:border-border-dark'>
                      <td className='py-3 pr-4 font-medium'>{check.reference_number}</td>
                      <td className='py-3 pr-4'>{check.proposed_matter_title}</td>
                      <td className='py-3 pr-4'>{(check.adverse_parties || []).join(', ') || '-'}</td>
                      <td className='py-3 pr-4'>{check.responsible_lawyer_name || '-'}</td>
                      <td className='py-3 pr-4'>{check.status_label || enumLabel(check.status)}</td>
                      <td className='py-3 pr-4'>{[enumLabel(check.urgency_level), check.limitation_or_deadline_date].filter(Boolean).join(' / ') || '-'}</td>
                      <td className='py-3 pr-4'>{check.created_case_number || '-'}</td>
                      <td className='py-3 pr-4'>
                        <Button3D size='sm' variant='outlineLight' onClick={() => navigate(action.path)}>
                          {action.label}
                        </Button3D>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className='p-6'>
        <h3 className='text-lg font-semibold mb-4'>
          Authorized Representatives and Officeholders
        </h3>

        {(client.representatives ?? []).length === 0 ? (
          <p>No authorized representatives recorded.</p>
        ) : (
          client.representatives.map((representative) => (
            <div
              key={representative.id}
              className='border border-border-light dark:border-border-dark rounded-xl p-4 mb-4'
            >
              <div className='grid md:grid-cols-3 gap-4'>
                {representativeFields(representative).map((field) => (
                  <div key={field.label}>
                    <strong>{field.label}</strong>
                    <p>{field.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </Card>

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
