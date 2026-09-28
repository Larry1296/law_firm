import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import Swal from '@/core/utils/themedSwal';
import { getApiErrorMessage } from '@/core/utils/errorMessages';

import Card from '@/components/ui/Card';
import { FormButton as Button3D } from '@/components/forms';
import SectionHeading from '@/components/ui/SectionHeading';
import FloatingInput from '@/components/ui/FloatingInput';
import Select3D from '@/components/ui/Select3D';

import adminFirmService from '@/modules/admin/firm/services/adminFirmService';
import useFirmLawyers from '@/modules/admin/cases/hooks/useFirmLawyers';
import { useAdminStaff } from '@/modules/admin/staff/hooks/useAdminStaff';
import StaffPermissionPicker from '@/modules/admin/staff/components/StaffPermissionPicker';
import AdvocateChecklist from '@/modules/admin/staff/components/AdvocateChecklist';

const STAFF_ROLE_OPTIONS = [
  { value: 'LAWYER', label: 'Lawyer', defaultJobTitle: 'Lawyer' },
  { value: 'SECRETARY', label: 'Secretary', defaultJobTitle: 'Secretary' },
  { value: 'ACCOUNTANT', label: 'Accountant', defaultJobTitle: 'Accountant' },
  { value: 'HR', label: 'Human Resource', defaultJobTitle: 'Human Resource Officer' },
  { value: 'IT', label: 'IT Support', defaultJobTitle: 'IT Support' },
];

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

// The API names a few fields differently from this form.
const SERVER_FIELD_TO_FORM = {
  national_id_number: 'national_id',
  first_name: 'full_name',
  last_name: 'full_name',
};

export default function AdminCreateStaffPage() {
  const navigate = useNavigate();

  const { createStaff } = useAdminStaff();
  const { lawyers } = useFirmLawyers();
  const { data: departments = [], isLoading: isLoadingDepartments } = useQuery({
    queryKey: ['admin-firm-departments'],
    queryFn: adminFirmService.getDepartments,
  });
  const { data: branches = [], isLoading: isLoadingBranches } = useQuery({
    queryKey: ['admin-firm-branches'],
    queryFn: adminFirmService.getBranches,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

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
    assigned_lawyer_ids: [],
    notes: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFieldErrors(({ [name]: _cleared, ...rest }) => rest);

    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'branch' ? { department_unit: '', department: '' } : {}),
    }));
  };

  const handleRoleChange = (role) => {
    setFormData((prev) => ({
      ...prev,
      firm_role: role,
      job_title: getDefaultJobTitle(role),
      permission_codes: [],
      assigned_lawyer_ids: [],
    }));
  };

  const roleDefaultWorkOptions =
    ROLE_DEFAULT_WORK_OPTIONS[formData.firm_role] || [];
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
      const serverErrors = error?.response?.data?.errors || {};
      const marked = Object.fromEntries(
        Object.entries(serverErrors).map(([key, message]) => [SERVER_FIELD_TO_FORM[key] || key, message]),
      );
      setFieldErrors(marked);
      const reasons = Object.values(marked);
      Swal.fire({
        icon: 'error',
        title: 'The staff member was not created',
        text: reasons.length > 1 ? reasons.join(' ') : getApiErrorMessage(error, 'Failed to create staff.'),
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
            error={fieldErrors.full_name}
            value={formData.full_name}
            onChange={handleChange}
            required
          />

          <FloatingInput
            label='National ID'
            name='national_id'
            error={fieldErrors.national_id}
            value={formData.national_id}
            onChange={handleChange}
            required
          />

          <FloatingInput
            label='Phone Number'
            name='phone_number'
            error={fieldErrors.phone_number}
            value={formData.phone_number}
            onChange={handleChange}
            required
          />

          <FloatingInput
            label='Email Address'
            type='email'
            name='email'
            error={fieldErrors.email}
            value={formData.email}
            onChange={handleChange}
            required
          />

          <div>
            <label className='mb-1.5 block text-[13px] font-semibold text-[color:var(--text-muted)]'>Staff Role</label>

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
                error={fieldErrors.admission_number}
                value={formData.admission_number}
                onChange={handleChange}
                required
              />
            )}

            <FloatingInput
              label='Date Hired'
              type='date'
              name='date_hired'
              error={fieldErrors.date_hired}
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
              error={fieldErrors.job_title}
              value={formData.job_title}
              onChange={handleChange}
            />

            <FloatingInput
              label='Staff Number'
              name='staff_number'
              error={fieldErrors.staff_number}
              value={formData.staff_number}
              onChange={handleChange}
            />

            <FloatingInput
              label='Employee Number'
              name='employee_number'
              error={fieldErrors.employee_number}
              value={formData.employee_number}
              onChange={handleChange}
            />

            <FloatingInput
              label='Work Email'
              type='email'
              name='work_email'
              error={fieldErrors.work_email}
              value={formData.work_email}
              onChange={handleChange}
            />

            <FloatingInput
              label='Office Location'
              name='office_location'
              error={fieldErrors.office_location}
              value={formData.office_location}
              onChange={handleChange}
            />

            {formData.firm_role === 'ACCOUNTANT' && (
              <>
                <FloatingInput
                  label='Accounting Specialization'
                  name='accounting_specialization'
                  error={fieldErrors.accounting_specialization}
                  value={formData.accounting_specialization}
                  onChange={handleChange}
                />

                <FloatingInput
                  label='Professional License Number'
                  name='professional_license_number'
                  error={fieldErrors.professional_license_number}
                  value={formData.professional_license_number}
                  onChange={handleChange}
                />
              </>
            )}

            {formData.firm_role === 'HR' && (
              <FloatingInput
                label='HR Specialization'
                name='hr_specialization'
                error={fieldErrors.hr_specialization}
                value={formData.hr_specialization}
                onChange={handleChange}
              />
            )}

            {formData.firm_role === 'IT' && (
              <>
                <FloatingInput
                  label='Technical Specialization'
                  name='technical_specialization'
                  error={fieldErrors.technical_specialization}
                  value={formData.technical_specialization}
                  onChange={handleChange}
                />

                <FloatingInput
                  label='Certification'
                  name='certification'
                  error={fieldErrors.certification}
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
                Permissions
              </h3>
              <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>
                Grant only what this person&apos;s job needs. Approvals always need someone other than the person who prepared the entry. You can change these later from the staff member&apos;s page.
              </p>

              <StaffPermissionPicker
                role={formData.firm_role}
                selected={formData.permission_codes}
                onChange={(permission_codes) =>
                  setFormData((prev) => ({ ...prev, permission_codes }))
                }
              />

              {formData.firm_role === 'SECRETARY' && (
                <>
                  <h3 className='font-semibold pt-2'>Advocates this secretary supports</h3>
                  <p className='text-sm text-text-muted-light dark:text-text-muted-dark'>
                    The secretary works on these advocates&apos; matters: filing register, client document requests and the diary.
                  </p>
                  <AdvocateChecklist
                    lawyers={lawyers}
                    selected={formData.assigned_lawyer_ids}
                    onChange={(assigned_lawyer_ids) =>
                      setFormData((prev) => ({ ...prev, assigned_lawyer_ids }))
                    }
                  />
                </>
              )}

              {formData.firm_role !== 'LAWYER' && (
                <FloatingInput
                  label='Notes'
                  name='notes'
                  error={fieldErrors.notes}
                  value={formData.notes}
                  onChange={handleChange}
                />
              )}
            </div>
          )}

          <div className='flex gap-3 pt-4'>
            <Button3D type='submit' variant='primary' disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Staff'}
            </Button3D>

            <Button3D
              type='button'
              variant='secondary'
              onClick={() => navigate('/admin/staff')}
            >
              Cancel
            </Button3D>
          </div>
        </form>
      </Card>
    </div>
  );
}
