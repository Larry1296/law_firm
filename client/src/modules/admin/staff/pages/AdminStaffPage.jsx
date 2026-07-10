import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Swal from '@/core/utils/themedSwal';

import {
  Users,
  UserCheck,
  UserX,
  Scale,
  Briefcase,
  Banknote,
  MonitorCog,
  UsersRound,
} from 'lucide-react';

import { useAdminStaff } from '@/modules/admin/staff/hooks/useAdminStaff';

import DataTable from '@/components/ui/DataTable';
import Card from '@/components/ui/Card';
import StatsCard from '@/components/ui/StatsCard';
import { Input3D } from '@/components/ui/Input3D';
import Button3D from '@/components/ui/Button3D';
import SectionHeading from '@/components/ui/SectionHeading';

const STAFF_ROLE_TABS = [
  { key: 'ALL', label: 'All Staff', countKey: 'total_staff' },
  { key: 'LAWYER', label: 'Lawyers', countKey: 'lawyers' },
  { key: 'SECRETARY', label: 'Secretaries', countKey: 'secretaries' },
  { key: 'ACCOUNTANT', label: 'Accountants', countKey: 'accountants' },
  { key: 'HR', label: 'HR', countKey: 'hr' },
  { key: 'IT', label: 'IT', countKey: 'it' },
];

export default function AdminStaffPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [activeRoleTab, setActiveRoleTab] = useState('ALL');

  const {
    staff,
    summary,
    isLoading,
    isFetching,
    refetch,
    deleteStaff,
    toggleStaffStatus,
  } = useAdminStaff();

  const filteredStaff = useMemo(() => {
    return (staff || [])
      .filter((member) => {
        if (activeRoleTab === 'ALL') return true;
        return member.role === activeRoleTab;
      })
      .filter((member) => {
      const term = search.toLowerCase();

      return (
        member.full_name?.toLowerCase().includes(term) ||
        member.email?.toLowerCase().includes(term) ||
        member.role?.toLowerCase().includes(term)
      );
    })
      .map((m) => ({ ...m, id: m.user_id }));
  }, [activeRoleTab, search, staff]);

  const activeRoleLabel =
    STAFF_ROLE_TABS.find((tab) => tab.key === activeRoleTab)?.label || 'Staff';

  const handleToggleStatus = async (member) => {
    const activating = !member.is_active;

    const result = await Swal.fire({
      title: activating ? 'Activate Staff?' : 'Deactivate Staff?',
      text: activating
        ? 'This staff member will regain system access.'
        : 'This staff member will lose access to firm resources.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: activating ? 'Yes, activate' : 'Yes, deactivate',
    });

    if (!result.isConfirmed) return;

    try {
      await toggleStaffStatus(member);

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: activating
          ? 'Staff activated successfully'
          : 'Staff deactivated successfully',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.response?.data?.message || 'Failed to update staff status',
      });
    }
  };

  const handleDelete = async (member) => {
    const result = await Swal.fire({
      title: 'Delete Staff?',
      text: 'This staff member will be permanently removed.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
    });

    if (!result.isConfirmed) return;

    try {
      await deleteStaff(member);

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Staff deleted successfully',
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.response?.data?.message || 'Failed to delete staff member',
      });
    }
  };

  const renderRole = (role) => {
    const styles = {
      LAWYER: 'bg-blue-100 text-blue-800',
      SECRETARY: 'bg-purple-100 text-purple-800',
      ACCOUNTANT: 'bg-emerald-100 text-emerald-800',
      HR: 'bg-amber-100 text-amber-800',
      IT: 'bg-cyan-100 text-cyan-800',
      ADMIN: 'bg-red-100 text-red-800',
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-semibold ${
          styles[role] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {role}
      </span>
    );
  };

  const renderWorkload = (workload) => {
    if (!workload || workload.level === 'NOT_TRACKED') {
      return <span className='text-text-muted-light dark:text-text-muted-dark'>Not tracked</span>;
    }

    if (workload.level === 'DEPARTMENT_MANAGED') {
      return (
        <div className='leading-tight'>
          <span className='font-semibold text-cyan-600 dark:text-cyan-300'>
            {workload.label || 'IT Department'}
          </span>
          <p className='text-xs text-slate-500 dark:text-text-muted-dark'>
            {workload.description || 'IT matters are department managed'}
          </p>
        </div>
      );
    }

    if (workload.level === 'ADMIN_FALLBACK') {
      return (
        <div className='leading-tight'>
          <span className='font-semibold text-amber-600 dark:text-amber-300'>
            {workload.label || 'Admin fallback'}
          </span>
          <p className='text-xs text-slate-500 dark:text-text-muted-dark'>
            {workload.description || 'Admin handles IT matters until IT exists'}
          </p>
        </div>
      );
    }

    const styles = {
      LOW: 'text-success',
      MEDIUM: 'text-warning',
      HIGH: 'text-error',
    };

    return (
      <div className='leading-tight'>
        <span className={styles[workload.level] || ''}>{workload.level}</span>
        <p className='text-xs text-slate-500 dark:text-text-muted-dark'>
          {workload.active_cases ?? 0} active cases
        </p>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <p className='text-text-muted-dark'>Loading staff...</p>
      </div>
    );
  }

  return (
    <div className='space-y-6 p-4 md:p-6 animate-fadeIn'>
      {/* Header */}
      <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
        <SectionHeading
          title='Staff Management'
          subtitle='Manage Firm Staff Members'
        />

        <div className='flex flex-wrap gap-3'>
          <Button3D onClick={refetch}>
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button3D>

          <Button3D
            variant='primary'
            onClick={() => navigate('/admin/staff/create')}
          >
            + Add Staff
          </Button3D>
        </div>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-8 gap-4'>
        <StatsCard
          title='Total Staff'
          value={summary?.total_staff ?? 0}
          icon={<Users size={22} />}
          color='blue'
        />

        <StatsCard
          title='Active Staff'
          value={summary?.active_staff ?? 0}
          icon={<UserCheck size={22} />}
          color='green'
        />

        <StatsCard
          title='Inactive Staff'
          value={summary?.inactive_staff ?? 0}
          icon={<UserX size={22} />}
          color='red'
        />

        <StatsCard
          title='Lawyers'
          value={summary?.lawyers ?? 0}
          icon={<Scale size={22} />}
          color='purple'
        />

        <StatsCard
          title='Secretaries'
          value={summary?.secretaries ?? 0}
          icon={<Users size={22} />}
          color='yellow'
        />

        <StatsCard
          title='Accountants'
          value={summary?.accountants ?? 0}
          icon={<Banknote size={22} />}
          color='green'
        />

        <StatsCard
          title='HR'
          value={summary?.hr ?? 0}
          icon={<UsersRound size={22} />}
          color='yellow'
        />

        <StatsCard
          title='IT'
          value={summary?.it ?? 0}
          icon={<MonitorCog size={22} />}
          color='blue'
        />

        <StatsCard
          title='Active Cases'
          value={summary?.total_active_cases ?? 0}
          icon={<Briefcase size={22} />}
          color='indigo'
        />
      </div>

      {/* Search */}
      <Card className='space-y-4 p-4'>
        <div className='overflow-x-auto'>
          <div className='flex min-w-max gap-2'>
            {STAFF_ROLE_TABS.map((tab) => {
              const isActive = activeRoleTab === tab.key;
              const count = summary?.[tab.countKey] ?? 0;

              return (
                <button
                  key={tab.key}
                  type='button'
                  onClick={() => setActiveRoleTab(tab.key)}
                  className={`flex min-h-11 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'border-brand-primary bg-brand-primary text-white shadow-sm'
                      : 'border-border-light bg-surface-light text-text-primary-light hover:border-brand-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <Input3D
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${activeRoleLabel.toLowerCase()}...`}
        />
      </Card>

      {/* Table */}
      <DataTable
        data={filteredStaff}
        mobileTitleKey='full_name'
        mobileSubtitleKey='email'
        emptyMessage={`No ${activeRoleLabel.toLowerCase()} found.`}
        columns={[
          {
            key: 'full_name',
            label: 'Name',
          },
          {
            key: 'email',
            label: 'Email',
          },
          {
            key: 'role',
            label: 'Role',
            render: renderRole,
          },
          {
            key: 'workload_level',
            label: 'Workload',
            render: (_, row) => renderWorkload(row.workload),
          },

          {
            key: 'is_active',
            label: 'Status',
            render: (value) => (
              <span
                className={
                  value
                    ? 'text-success font-semibold'
                    : 'text-error font-semibold'
                }
              >
                {value ? 'Active' : 'Inactive'}
              </span>
            ),
          },
        ]}
        actions={(member) => {
          if (member.system_role === 'ADMIN') {
            return null;
          }

          return (
            <div className='flex flex-wrap gap-2'>
              <Button3D
                size='sm'
                onClick={() =>
                  navigate(
                    `/admin/staff/${member.user_id}?role=${encodeURIComponent(member.role)}`,
                  )
                }
              >
                View
              </Button3D>

              <Button3D
                size='sm'
                variant={member.is_active ? 'warning' : 'success'}
                onClick={() => handleToggleStatus(member)}
              >
                {member.is_active ? 'Deactivate' : 'Activate'}
              </Button3D>

              {member.workload?.active_cases === 0 && (
                <Button3D
                  size='sm'
                  variant='danger'
                  onClick={() => handleDelete(member)}
                >
                  Delete
                </Button3D>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
