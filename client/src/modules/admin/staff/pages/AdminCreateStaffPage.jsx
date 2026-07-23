import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import Swal from '@/core/utils/themedSwal';

import Card from '@/components/ui/Card';
import Button3D from '@/components/ui/Button3D';
import SectionHeading from '@/components/ui/SectionHeading';
import FloatingInput from '@/components/ui/FloatingInput';
import Select3D from '@/components/ui/Select3D';

import adminFirmService from '@/modules/admin/firm/services/adminFirmService';
import { useAdminStaff } from '@/modules/admin/staff/hooks/useAdminStaff';

const STAFF_ROLE_OPTIONS = [
  { value: 'LAWYER', label: 'Lawyer', defaultJobTitle: 'Lawyer' },
  { value: 'SECRETARY', label: 'Secretary', defaultJobTitle: 'Secretary' },
  { value: 'ACCOUNTANT', label: 'Accountant', defaultJobTitle: 'Accountant' },
  { value: 'HR', label: 'Human Resource', defaultJobTitle: 'Human Resource Officer' },
  { value: 'IT', label: 'IT Support', defaultJobTitle: 'IT Support' },
];

const ROLE_PERMISSION_OPTIONS = {
  LAWYER: [
    ['MANAGE_ASSIGNED_CASES', 'Manage Assigned Cases'],
    ['CREATE_CASES', 'Create legal matters'],
    ['ASSIGN_OTHER_LAWYER', 'Assign another responsible advocate'],
    ['MANAGE_CASE_DOCUMENTS', 'Manage Case Documents'],
    ['SCHEDULE_HEARINGS', 'Schedule Hearings'],
    ['MANAGE_CLIENT_COMMUNICATIONS', 'Manage Client Communications'],
    ['USE_LEGAL_RESEARCH', 'Use Legal Research'],
    ['USE_AI_TOOLS', 'Use AI Tools'],
    ['APPROVE_DOCUMENTS', 'Approve Documents'],
    ['VIEW_BILLING', 'View Billing'],
  ],
  SECRETARY: [
    ['MANAGE_CASES', 'Manage Cases'],
    ['MANAGE_TASKS', 'Manage Tasks'],
    ['MANAGE_CLIENTS', 'Manage Clients'],
    ['MANAGE_DOCUMENTS', 'Manage Documents'],
    ['MANAGE_CALENDAR', 'Manage Calendar'],
    ['SEND_COMMUNICATIONS', 'Send Communications'],
    ['VIEW_REPORTS', 'View Reports'],
    ['MANAGE_BILLING', 'Manage Billing'],
  ],
  ACCOUNTANT: [
    ['MANAGE_INVOICES', 'Manage Invoices'],
    ['MANAGE_PAYMENTS', 'Manage Payments'],
    ['MANAGE_EXPENSES', 'Manage Expenses'],
    ['VIEW_FINANCIAL_REPORTS', 'View Financial Reports'],
    ['MANAGE_CLIENT_BILLING', 'Manage Client Billing'],
    ['MANAGE_PAYROLL', 'Manage Payroll'],
    ['MANAGE_TAX_RECORDS', 'Manage Tax Records'],
  ],
  HR: [
    ['MANAGE_STAFF_RECORDS', 'Manage Staff Records'],
    ['MANAGE_RECRUITMENT', 'Manage Recruitment'],
    ['MANAGE_LEAVE', 'Manage Leave'],
    ['MANAGE_PAYROLL_RECORDS', 'Manage Payroll Records'],
    ['MANAGE_PERFORMANCE', 'Manage Performance'],
    ['VIEW_HR_REPORTS', 'View HR Reports'],
  ],
  IT: [
    ['MANAGE_USERS', 'Manage Users'],
    ['MANAGE_SYSTEM_SETTINGS', 'Manage System Settings'],
    ['MANAGE_SECURITY', 'Manage Security'],
    ['VIEW_AUDIT_LOGS', 'View Audit Logs'],
    ['MANAGE_BACKUPS', 'Manage Backups'],
    ['MANAGE_INTEGRATIONS', 'Manage Integrations'],
  ],
};

const ROLE_DEFAULT_WORK_OPTIONS = {
  LAWYER: [
    ['is_court_approved', 'Court Approved'],
    ['can_commission_oaths', 'Commission Oaths'],
    ['is_notary', 'Notary'],
  ],
  SECRETARY: [
    ['can_prepare_documents', 'Prepare Documents'],
    ['can_schedule_appointments', 'Schedule Appointments'],
    ['can_manage_client_intake', 'Manage Client Intake'],
    ['can_receive_documents', 'Receive Documents'],
  ],
  ACCOUNTANT: [
    ['can_manage_invoices', 'Manage Invoices'],
    ['can_manage_payments', 'Manage Payments'],
    ['can_manage_expenses', 'Manage Expenses'],
    ['can_view_financial_reports', 'View Financial Reports'],
  ],
  HR: [
    ['can_manage_staff_records', 'Manage Staff Records'],
    ['can_manage_recruitment', 'Manage Recruitment'],
    ['can_manage_leave', 'Manage Leave'],
    ['can_manage_payroll_records', 'Manage Payroll Records'],
  ],
  IT: [
    ['can_manage_users', 'Manage Users'],
    ['can_manage_system_settings', 'Manage System Settings'],
    ['can_manage_security', 'Manage Security'],
    ['can_access_audit_logs', 'Access Audit Logs'],
  ],
};

const getDefaultJobTitle = (role) =>
  STAFF_ROLE_OPTIONS.find((option) => option.value === role)?.defaultJobTitle ||
  'Staff';

export default function AdminCreateStaffPage() {
  const navigate = useNavigate();

  const { createStaff } = useAdminStaff();
  const { data: departments = [], isLoading: isLoadingDepartments } = useQuery({
    queryKey: ['admin-firm-departments'],
    queryFn: adminFirmService.getDepartments,
  });
  const { data: branches = [], isLoading: isLoadingBranches } = useQuery({
    queryKey: ['admin-firm-branches'],
    queryFn: adminFirmService.getBranches,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    national_id: '',
    phone_number: '',
    email: '',
    firm_role: 'LAWYER',
    department: '',
    branch: '',
    department_unit: '',
    job_title: 'Lawyer',
    staff_number: '',
    employee_number: '',
    work_email: '',
    work_phone: '',
    office_location: '',
    admission_number: '',
    practicing_certificate_number: '',
    bar_admission_date: '',
    employment_type: 'PERMANENT',
    date_hired: new Date().toISOString().slice(0, 10),
    professional_summary: '',
    can_prepare_documents: true,
    can_schedule_appointments: true,
    can_manage_client_intake: true,
    can_receive_documents: true,
    accounting_specialization: '',
    professional_license_number: '',
    can_manage_invoices: true,
    can_manage_payments: true,
    can_manage_expenses: false,
    can_view_financial_reports: true,
    hr_specialization: '',
    can_manage_staff_records: true,
    can_manage_recruitment: false,
    can_manage_leave: true,
    can_manage_payroll_records: false,
    technical_specialization: '',
    certification: '',
    can_manage_users: false,
    can_manage_system_settings: false,
    can_manage_security: false,
    can_access_audit_logs: true,
    permission_codes: [],
    notes: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'branch' ? { department_unit: '', department: '' } : {}),
    }));
  };

  const handlePermissionChange = (permission) => {
    setFormData((prev) => ({
      ...prev,
      permission_codes: prev.permission_codes.includes(permission)
        ? prev.permission_codes.filter((p) => p !== permission)
        : [...prev.permission_codes, permission],
    }));
  };

  const handleRoleChange = (role) => {
    setFormData((prev) => ({
      ...prev,
      firm_role: role,
      job_title: getDefaultJobTitle(role),
      permission_codes: [],
    }));
  };

  const roleDefaultWorkOptions =
    ROLE_DEFAULT_WORK_OPTIONS[formData.firm_role] || [];
  const rolePermissionOptions =
    ROLE_PERMISSION_OPTIONS[formData.firm_role] || [];
  const availableDepartments = departments.filter(
    (department) =>
      !formData.branch ||
      !department.branch ||
      String(department.branch) === String(formData.branch),
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('SUBMIT CLICKED');

    try {
      setIsSubmitting(true);

      const response = await createStaff(formData);
      const tempPassword = response?.temp_password;

      await Swal.fire({
        icon: 'success',
        title: 'Success',
        html: `
          <div style="text-align:left">
            <p>Staff created successfully.</p>
            ${
              tempPassword
                ? `
                  <div style="margin-top:12px;padding:12px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0">
                    <p style="margin:0 0 6px 0"><strong>Temporary Password</strong></p>
                    <code style="font-size:16px;font-weight:700">${tempPassword}</code>
                  </div>
                  <p style="margin-top:10px;font-size:13px;color:#64748b">
                    Share this with the staff member. They will be required to change it after login.
                  </p>
                `
                : ''
            }
          </div>
        `,
        confirmButtonText: 'Continue',
        confirmButtonColor: '#2563eb',
      });

      navigate('/admin/staff');
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error?.message ||
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          'Failed to create staff.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='space-y-6 p-4 md:p-6 animate-fadeIn'>
      <SectionHeading
        title='Create Staff Member'
        subtitle='Add lawyers, secretaries, accountants, HR, and IT staff to your firm'
      />

      <Card className='p-6'>
        <form onSubmit={handleSubmit} className='space-y-5'>
          <FloatingInput
            label='Full Name'
            name='full_name'
            value={formData.full_name}
            onChange={handleChange}
            required
          />

          <FloatingInput
            label='National ID'
            name='national_id'
            value={formData.national_id}
            onChange={handleChange}
            required
          />

          <FloatingInput
            label='Phone Number'
            name='phone_number'
            value={formData.phone_number}
            onChange={handleChange}
            required
          />

          <FloatingInput
            label='Email Address'
            type='email'
            name='email'
            value={formData.email}
            onChange={handleChange}
            required
          />

          <div>
            <label className='block text-sm font-medium mb-2'>Staff Role</label>

            <Select3D
              value={formData.firm_role}
              onChange={(e) => handleRoleChange(e.target.value)}
              wrapperClassName='mb-0'
              options={STAFF_ROLE_OPTIONS}
            />
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {formData.firm_role === 'LAWYER' && (
              <FloatingInput
                label='Admission Number'
                name='admission_number'
                value={formData.admission_number}
                onChange={handleChange}
                required
              />
            )}

            <FloatingInput
              label='Date Hired'
              type='date'
              name='date_hired'
              value={formData.date_hired}
              onChange={handleChange}
              required
            />

            <div className='space-y-2'>
              <label
                htmlFor='branch'
                className='block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'
              >
                Branch
              </label>

              <Select3D
                name='branch'
                value={formData.branch}
                onChange={handleChange}
                disabled={isLoadingBranches || branches.length === 0}
                wrapperClassName='mb-0'
                placeholder={
                  isLoadingBranches
                    ? 'Loading branches...'
                    : branches.length === 0
                      ? 'Main firm'
                      : 'Main firm / no branch'
                }
                options={branches.map((branch) => ({
                  value: branch.id,
                  label: `${branch.name}${branch.is_head_office ? ' (Head Office)' : ''}`,
                }))}
              />
            </div>

            <div className='space-y-2'>
              <label
                htmlFor='department_unit'
                className='block text-sm font-medium text-text-primary-light dark:text-text-primary-dark'
              >
                Department
              </label>

              <Select3D
                name='department_unit'
                value={formData.department_unit}
                onChange={(event) => {
                  const department = departments.find(
                    (item) => String(item.id) === String(event.target.value),
                  );
                  setFormData((prev) => ({
                    ...prev,
                    department_unit: event.target.value,
                    department: department?.name || '',
                    branch:
                      prev.branch ||
                      (department?.branch ? String(department.branch) : ''),
                  }));
                }}
                disabled={isLoadingDepartments || availableDepartments.length === 0}
                wrapperClassName='mb-0'
                placeholder={
                  isLoadingDepartments
                    ? 'Loading departments...'
                    : availableDepartments.length === 0
                      ? 'No department'
                      : 'Select department'
                }
                options={availableDepartments.map((department) => ({
                  value: department.id,
                  label: `${department.name}${department.branch_name ? ` - ${department.branch_name}` : ''}`,
                }))}
              />
            </div>

            <FloatingInput
              label='Job Title'
              name='job_title'
              value={formData.job_title}
              onChange={handleChange}
            />

            <FloatingInput
              label='Staff Number'
              name='staff_number'
              value={formData.staff_number}
              onChange={handleChange}
            />

            <FloatingInput
              label='Employee Number'
              name='employee_number'
              value={formData.employee_number}
              onChange={handleChange}
            />

            <FloatingInput
              label='Work Email'
              type='email'
              name='work_email'
              value={formData.work_email}
              onChange={handleChange}
            />

            <FloatingInput
              label='Office Location'
              name='office_location'
              value={formData.office_location}
              onChange={handleChange}
            />

            {formData.firm_role === 'ACCOUNTANT' && (
              <>
                <FloatingInput
                  label='Accounting Specialization'
                  name='accounting_specialization'
                  value={formData.accounting_specialization}
                  onChange={handleChange}
                />

                <FloatingInput
                  label='Professional License Number'
                  name='professional_license_number'
                  value={formData.professional_license_number}
                  onChange={handleChange}
                />
              </>
            )}

            {formData.firm_role === 'HR' && (
              <FloatingInput
                label='HR Specialization'
                name='hr_specialization'
                value={formData.hr_specialization}
                onChange={handleChange}
              />
            )}

            {formData.firm_role === 'IT' && (
              <>
                <FloatingInput
                  label='Technical Specialization'
                  name='technical_specialization'
                  value={formData.technical_specialization}
                  onChange={handleChange}
                />

                <FloatingInput
                  label='Certification'
                  name='certification'
                  value={formData.certification}
                  onChange={handleChange}
                />
              </>
            )}
          </div>

          {roleDefaultWorkOptions.length > 0 && (
            <div className='space-y-4 rounded-xl border border-border-light dark:border-border-dark p-4'>
              <h3 className='font-semibold'>
                {getDefaultJobTitle(formData.firm_role)} Default Work
              </h3>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                {roleDefaultWorkOptions.map(([name, label]) => (
                  <label key={name} className='flex items-center gap-2'>
                    <input
                      type='checkbox'
                      checked={Boolean(formData[name])}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          [name]: e.target.checked,
                        }))
                      }
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              <h3 className='font-semibold pt-2'>
                Extra Admin Permissions
              </h3>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                {rolePermissionOptions.map(([code, label]) => (
                  <label key={code} className='flex items-center gap-2'>
                    <input
                      type='checkbox'
                      checked={formData.permission_codes.includes(code)}
                      onChange={() => handlePermissionChange(code)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              {formData.firm_role !== 'LAWYER' && (
                <FloatingInput
                  label='Notes'
                  name='notes'
                  value={formData.notes}
                  onChange={handleChange}
                />
              )}
            </div>
          )}

          <div className='flex gap-3 pt-4'>
            <Button3D
              type='button'
              variant='secondary'
              onClick={() => navigate('/admin/staff')}
            >
              Cancel
            </Button3D>

            <Button3D type='submit' variant='primary' disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Staff'}
            </Button3D>
          </div>
        </form>
      </Card>
    </div>
  );
}
