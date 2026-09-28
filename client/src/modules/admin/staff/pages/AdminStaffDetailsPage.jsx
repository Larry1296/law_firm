import React, { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import staffService from '@/modules/admin/staff/services/adminStaffService';
import StatsCard from '@/components/ui/StatsCard';
import SectionHeading from '@/components/ui/SectionHeading';
import BackLink from '@/components/ui/BackLink';
import { formatDateTime } from '@/core/utils/dateFormatter';
import { Input3D } from '@/components/ui/Input3D';
import Card from '@/components/ui/Card';
import { getApiErrorMessage } from '@/core/utils/errorMessages';
import useFirmLawyers from '@/modules/admin/cases/hooks/useFirmLawyers';
import StaffPermissionPicker from '@/modules/admin/staff/components/StaffPermissionPicker';
import AdvocateChecklist from '@/modules/admin/staff/components/AdvocateChecklist';
import { permissionCodesFor } from '@/modules/admin/staff/staffPermissionOptions';

const staffKeys = {
  detail: (id) => ['admin-staff', id],
};

const SingleStaffDetailsPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const role = searchParams.get('role');

  // null means "not edited yet": show what the server has.
  const [permissionDraft, setPermissionDraft] = useState(null);
  const [advocateDraft, setAdvocateDraft] = useState(null);
  const { lawyers } = useFirmLawyers();

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
      setPermissionDraft(null);
    },
  });

  const updateAdvocatesMutation = useMutation({
    mutationFn: (lawyerIds) => staffService.updateSecretaryAdvocates(id, lawyerIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.detail(id) });
      setAdvocateDraft(null);
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

      <Card className='mb-6 space-y-4 p-5'>
        <div>
          <h2 className='text-lg font-bold'>Permissions</h2>
          <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>
            Tick what this person may do, then save. Approvals always need someone other than the person who prepared the entry.
          </p>
        </div>
        <StaffPermissionPicker
          role={membership.role}
          selected={permissionDraft ?? permissions}
          disabled={updatePermissionsMutation.isPending}
          onChange={setPermissionDraft}
        />
        {updatePermissionsMutation.isError && (
          <p role='alert' className='text-sm text-error'>{getApiErrorMessage(updatePermissionsMutation.error)}</p>
        )}
        <div className='flex gap-3'>
          <button
            type='button'
            className='rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50'
            disabled={permissionDraft === null || updatePermissionsMutation.isPending}
            onClick={() => {
              // Keep grants the picker does not list (e.g. paused AI tools) instead of silently revoking them.
              const listed = permissionCodesFor(membership.role);
              const unlisted = permissions.filter((code) => !listed.includes(code));
              updatePermissionsMutation.mutate([...unlisted, ...permissionDraft]);
            }}
          >
            {updatePermissionsMutation.isPending ? 'Saving…' : 'Save permissions'}
          </button>
          {permissionDraft !== null && (
            <button type='button' className='text-sm font-semibold' onClick={() => setPermissionDraft(null)}>Discard changes</button>
          )}
        </div>
      </Card>

      {membership.role === 'SECRETARY' && (
        <Card className='mb-6 space-y-4 p-5'>
          <div>
            <h2 className='text-lg font-bold'>Advocates supported</h2>
            <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>
              The secretary works on these advocates&apos; matters: filing register, client document requests and the diary.
            </p>
          </div>
          <AdvocateChecklist
            lawyers={lawyers}
            selected={advocateDraft ?? (staff.secretary?.assigned_lawyers || []).map((lawyer) => String(lawyer.id))}
            disabled={updateAdvocatesMutation.isPending}
            onChange={setAdvocateDraft}
          />
          {updateAdvocatesMutation.isError && (
            <p role='alert' className='text-sm text-error'>{getApiErrorMessage(updateAdvocatesMutation.error)}</p>
          )}
          <button
            type='button'
            className='rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50'
            disabled={advocateDraft === null || updateAdvocatesMutation.isPending}
            onClick={() => updateAdvocatesMutation.mutate(advocateDraft)}
          >
            {updateAdvocatesMutation.isPending ? 'Saving…' : 'Save advocates'}
          </button>
        </Card>
      )}
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
