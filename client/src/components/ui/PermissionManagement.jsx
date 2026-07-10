import React from 'react';
import Swal from '@/core/utils/themedSwal';

const PERMISSION_DESCRIPTIONS = {
  manage_cases:
    'Allows the staff member to create, edit, assign and manage legal cases.',
  view_cases: 'Allows the staff member to view case details and case activity.',
  manage_clients: 'Allows creation, editing and management of client records.',
  view_clients: 'Allows viewing client profiles and client information.',
  manage_documents: 'Allows uploading, editing and deleting firm documents.',
  view_documents: 'Allows viewing firm documents and attachments.',
  manage_appointments:
    'Allows scheduling, updating and cancelling appointments.',
  view_appointments: 'Allows viewing appointment calendars and schedules.',
  manage_billing:
    'Allows creation of invoices, billing records and payment tracking.',
  view_billing: 'Allows viewing billing information and financial records.',
  manage_staff:
    'Allows management of lawyers, secretaries and staff assignments.',
  view_reports:
    'Allows access to firm performance, workload and activity reports.',
};

const PermissionsManagement = ({
  availablePermissions = [],
  assignedPermissions = [],
  onChange,
  isUpdating = false,
}) => {
  const handleToggle = async (permission) => {
    const isAssigned = assignedPermissions.includes(permission.code);

    const action = isAssigned ? 'Remove' : 'Assign';

    const result = await Swal.fire({
      icon: 'question',
      title: `${action} Permission?`,
      html: `
        <div style="text-align:left">
          <p>
            <strong>${permission.name}</strong>
          </p>

          <p style="margin-top:10px">
            ${
              PERMISSION_DESCRIPTIONS[permission.code] ||
              'This permission controls access to a specific feature within the firm.'
            }
          </p>

          <div style="
            margin-top:15px;
            padding:10px;
            border-radius:8px;
            background:#f8fafc;
            border:1px solid #e2e8f0;
          ">
            ${
              isAssigned
                ? 'The user currently HAS this permission. Confirm to remove it.'
                : 'The user currently DOES NOT have this permission. Confirm to assign it.'
            }
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: action,
      cancelButtonText: 'Cancel',
      confirmButtonColor: isAssigned ? '#dc2626' : '#2563eb',
    });

    if (!result.isConfirmed) return;

    const updated = isAssigned
      ? assignedPermissions.filter((p) => p !== permission.code)
      : [...assignedPermissions, permission.code];

    onChange(updated);
  };

  return (
    <div className='mb-6 p-5 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark'>
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-lg font-bold text-gray-900 dark:text-gray-100'>
          Permissions Management
        </h2>

        <span className='text-sm text-gray-500 dark:text-gray-400'>
          {assignedPermissions.length} assigned
        </span>
      </div>

      {availablePermissions.length === 0 ? (
        <p className='text-gray-600 dark:text-gray-400'>
          No permissions available
        </p>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
          {availablePermissions.map((perm) => {
            const isAssigned = assignedPermissions.includes(perm.code);

            return (
              <label
                key={perm.code}
                className={`
                  flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all
                  ${
                    isAssigned
                      ? 'border-success bg-green-50 dark:bg-green-900/20'
                      : 'border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark'
                  }
                `}
              >
                <input
                  type='checkbox'
                  checked={isAssigned}
                  onChange={() => handleToggle(perm)}
                  className='mt-1 h-4 w-4'
                />

                <div className='flex-1'>
                  <div className='font-medium text-gray-900 dark:text-gray-100'>
                    {perm.name}
                  </div>

                  <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                    {perm.code}
                  </div>

                  <div className='text-xs text-gray-500 dark:text-gray-400 mt-2'>
                    {PERMISSION_DESCRIPTIONS[perm.code] ||
                      'Controls access to a firm feature.'}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      )}

      {isUpdating && (
        <div className='mt-4 text-sm text-brand-primary'>
          Updating permissions...
        </div>
      )}
    </div>
  );
};

export default PermissionsManagement;
