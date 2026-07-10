import React, { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import staffService from '@/modules/admin/staff/services/adminStaffService';
import StatsCard from '@/components/ui/StatsCard';
import SectionHeading from '@/components/ui/SectionHeading';
import BackLink from '@/components/ui/BackLink';
import { formatDateTime } from '@/core/utils/dateFormatter';
import { Input3D } from '@/components/ui/Input3D';
import PermissionsManagement from '@/components/ui/PermissionManagement';

const staffKeys = {
  detail: (id) => ['admin-staff', id],
};

const SingleStaffDetailsPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const role = searchParams.get('role');

  const [, setNewPermission] = useState('');

  const {
    data: staff,
    isLoading,
    error,
  } = useQuery({
    queryKey: [...staffKeys.detail(id), role],
    queryFn: async () => {
      const response = await staffService.getStaffDetails(id, role);
      return response.data;
    },
    enabled: !!id,
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async (permissions) => {
      return await staffService.updateStaffPermissions(id, {
        permissions,
        role,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: staffKeys.detail(id),
      });
      setNewPermission('');
    },
  });

  if (isLoading) return <div>Loading staff details...</div>;
  if (error) return <div>Failed to load staff details.</div>;
  if (!staff) return <div>Staff not found.</div>;

  const user = staff.user || {};
  const membership = staff.membership || {};
  const permissions = staff.permissions || [];
  const workload = staff.workload || {};
  const itManagement = staff.it_management || workload.it_management || {};
  const secretaryMetrics = staff.secretary_metrics || {};
  const recentCases = staff.recent_cases || [];

  const safe = (v, fallback = 'N/A') => v || fallback;
  const pageTitle = safe(user.full_name, 'Staff Details');

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <BackLink label='Back to Staff' fallbackPath='/admin/staff' />
      </div>
      <SectionHeading
        title={pageTitle}
        subtitle={`${safe(membership.role, 'Staff')} details and permissions`}
      />
      {/* STAFF HEADER */}
      <div
        style={{
          marginBottom: 24,
          padding: 20,
          border: '1px solid #e5e7eb',
          borderRadius: 12,
        }}
      >
        <h2 style={{ marginBottom: 8 }}>{user.full_name}</h2>

        <p>
          <strong>Email:</strong> {safe(user.email)}
        </p>
        <p>
          <strong>System Role:</strong> {safe(user.system_role)}
        </p>
        <p>
          <strong>Firm Role:</strong> {safe(user.firm_role)}
        </p>
        <p>
          <strong>Status:</strong> {safe(user.status)}
        </p>
        <p>
          <strong>Active:</strong> {user.is_active ? 'Yes' : 'No'}
        </p>
        <p>
          <strong>Verified:</strong> {user.is_verified ? 'Yes' : 'No'}
        </p>
        <p>
          <strong>Phone:</strong> {safe(user.phone_number)}
        </p>
        <p>
          <strong>National ID:</strong> {safe(user.national_id)}
        </p>
        <p>
          <strong>Created:</strong> {formatDateTime(user.created_at)}
        </p>
      </div>
      {/* MEMBERSHIP + SUMMARY */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <StatsCard title='Role' value={membership.role || 'N/A'} />
        <StatsCard
          title='Active Membership'
          value={membership.is_active ? 'Yes' : 'No'}
        />
        <StatsCard title='Permissions' value={permissions.length} />
      </div>

      <PermissionsManagement
        availablePermissions={staff.available_permissions || []}
        assignedPermissions={permissions}
        isUpdating={updatePermissionsMutation.isPending}
        onChange={(updated) => {
          updatePermissionsMutation.mutate(updated);
        }}
      />
      {/* ROLE-SPECIFIC METRICS */}
      {membership.role === 'LAWYER' && (
        <div
          style={{
            marginBottom: 24,
            padding: 20,
            border: '1px solid #e5e7eb',
            borderRadius: 12,
          }}
        >
          <h3>Workload</h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              marginTop: 12,
            }}
          >
            <StatsCard
              title='Active Cases'
              value={workload.active_cases || 0}
            />
            <StatsCard
              title='Closed Cases'
              value={workload.closed_cases || 0}
            />
            <StatsCard title='Total Cases' value={workload.total_cases || 0} />
          </div>
        </div>
      )}
      {membership.role === 'SECRETARY' && (
        <div
          style={{
            marginBottom: 24,
            padding: 20,
            border: '1px solid #e5e7eb',
            borderRadius: 12,
          }}
        >
          <h3>Secretary Metrics</h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 12,
              marginTop: 12,
            }}
          >
            <StatsCard
              title='Assigned Tasks'
              value={secretaryMetrics.assigned_tasks || 0}
            />
            <StatsCard
              title='Completed Tasks'
              value={secretaryMetrics.completed_tasks || 0}
            />
            <StatsCard
              title='Appointments'
              value={secretaryMetrics.managed_appointments || 0}
            />
            <StatsCard
              title='Documents'
              value={secretaryMetrics.documents_processed || 0}
            />
          </div>
        </div>
      )}
      {membership.role === 'IT' && (
        <div
          style={{
            marginBottom: 24,
            padding: 20,
            border: '1px solid #e5e7eb',
            borderRadius: 12,
          }}
        >
          <h3>IT Management</h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              marginTop: 12,
            }}
          >
            <StatsCard
              title='Managed By'
              value={
                itManagement.source === 'it_department'
                  ? 'IT Department'
                  : 'Admin Fallback'
              }
            />
            <StatsCard
              title='Department'
              value={itManagement.department_name || 'Not created'}
            />
            <StatsCard
              title='Active Permissions'
              value={staff.analytics?.active_permissions || permissions.length}
            />
          </div>

          <p className='mt-3 text-sm text-slate-500 dark:text-slate-300'>
            {itManagement.message ||
              'No IT department exists, so admin handles IT matters.'}
          </p>
        </div>
      )}
      {/* RECENT CASES */}
      {membership.role === 'LAWYER' && (
        <section
          style={{
            padding: 20,
            border: '1px solid #e5e7eb',
            borderRadius: 12,
          }}
        >
          <h3>Recent Cases</h3>

          {recentCases.length === 0 ? (
            <p>No cases found</p>
          ) : (
            recentCases.map((c, index) => (
              <div
                key={c.id || index}
                style={{
                  padding: 12,
                  marginBottom: 10,
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                }}
              >
                <div>
                  <strong>{c.title}</strong>
                </div>
                <div>Status: {c.status}</div>
              </div>
            ))
          )}
        </section>
      )}
      {/* SECRETARY ACTIVITY */}
      {membership.role === 'SECRETARY' && (
        <section
          style={{
            padding: 20,
            border: '1px solid #e5e7eb',
            borderRadius: 12,
          }}
        >
          <h3>Recent Activity</h3>

          {staff.recent_activity?.length ? (
            staff.recent_activity.map((a, index) => (
              <div key={index}>• {JSON.stringify(a)}</div>
            ))
          ) : (
            <p>No activity available</p>
          )}
        </section>
      )}
    </div>
  );
};

export default SingleStaffDetailsPage;
