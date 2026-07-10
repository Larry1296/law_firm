import axiosInstance from '@/core/api/axios';

const STAFF_ROLE_CONFIG = {
  LAWYER: {
    segment: 'lawyers',
    listKey: 'lawyers',
    detailKey: 'lawyer',
    countKey: 'lawyers',
  },
  SECRETARY: {
    segment: 'secretaries',
    listKey: 'secretaries',
    detailKey: 'secretary',
    countKey: 'secretaries',
  },
  ACCOUNTANT: {
    segment: 'accountants',
    listKey: 'accountants',
    detailKey: 'accountant',
    countKey: 'accountants',
  },
  HR: {
    segment: 'hr',
    listKey: 'hr_staff',
    detailKey: 'hr',
    countKey: 'hr',
  },
  IT: {
    segment: 'it',
    listKey: 'it_staff',
    detailKey: 'it',
    countKey: 'it',
  },
};

const STAFF_ROLES = Object.keys(STAFF_ROLE_CONFIG);

/* =========================================================
   ADMIN STAFF SERVICE
========================================================= */
const adminStaffService = {
  roleConfig(role) {
    return STAFF_ROLE_CONFIG[role] || STAFF_ROLE_CONFIG.LAWYER;
  },

  normalizeStaffMember(member, role) {
    return {
      ...member,
      user_id: member.id,
      role: member.firm_role || role,
      system_role: member.system_role,
      workload: member.workload || {
        level: 'NOT_TRACKED',
        active_cases: 0,
        closed_cases: 0,
        total_cases: 0,
        source: 'not_tracked',
      },
    };
  },

  splitName(payload) {
    const nameParts = (payload.full_name || '').trim().split(/\s+/);
    const firstName = payload.first_name || nameParts[0] || '';
    return {
      first_name: firstName,
      last_name: payload.last_name || nameParts.slice(1).join(' ') || firstName,
    };
  },

  /* ======================================================
     STAFF LIST
  ====================================================== */
  async getStaff() {
    const responses = await Promise.all(
      STAFF_ROLES.map(async (role) => {
        const config = adminStaffService.roleConfig(role);
        const { data } = await axiosInstance.get(
          `/admin/staff/${config.segment}/`,
        );
        return { role, config, data };
      }),
    );

    const staff = responses.flatMap(({ role, config, data }) =>
      (data[config.listKey] || []).map((member) =>
        adminStaffService.normalizeStaffMember(member, role),
      ),
    );

    const counts = responses.reduce((acc, { role, config, data }) => {
      const metadata = data.metadata || {};
      acc[config.countKey] =
        metadata.total_records ?? (data[config.listKey] || []).length;
      acc.active += metadata.summary?.active ?? 0;
      acc.inactive += metadata.summary?.inactive ?? 0;
      acc[role] = {
        active: metadata.summary?.active ?? 0,
        inactive: metadata.summary?.inactive ?? 0,
      };
      return acc;
    }, { active: 0, inactive: 0 });

    return {
      data: {
        summary: {
          total_staff: staff.length,
          active_staff: counts.active,
          inactive_staff: counts.inactive,
          lawyers: counts.lawyers ?? 0,
          secretaries: counts.secretaries ?? 0,
          accountants: counts.accountants ?? 0,
          hr: counts.hr ?? 0,
          it: counts.it ?? 0,
          total_active_cases: 0,
          total_closed_cases: 0,
        },
        staff,
      },
    };
  },

  /* ======================================================
     STAFF DETAILS
  ====================================================== */
  async resolveStaffRole(userId) {
    const response = await adminStaffService.getStaff();
    const staff = response.data?.staff || [];
    const match = staff.find(
      (member) =>
        String(member.user_id) === String(userId) ||
        String(member.id) === String(userId),
    );

    return match?.role || match?.firm_role || null;
  },

  async getStaffDetails(userId, knownRole = null) {
    let staffMember;
    const role = knownRole || (await adminStaffService.resolveStaffRole(userId));

    if (role) {
      const config = adminStaffService.roleConfig(role);
      const { data } = await axiosInstance.get(
        `/admin/staff/${config.segment}/${userId}/`,
      );
      staffMember = data[config.detailKey] || {};
    }

    if (!staffMember || !role) {
      const notFoundError = new Error('Staff member not found.');
      notFoundError.response = { status: 404 };
      throw notFoundError;
    }

    const availablePermissions = (staffMember.available_permissions || []).map(
      (permission) => ({
        code: permission.code,
        name: permission.name || permission.label || permission.code,
      }),
    );

    return {
      data: {
        user: {
          full_name: staffMember.full_name,
          email: staffMember.email,
          system_role: 'STAFF',
          firm_role: staffMember.firm_role || role,
          status: staffMember.employment_status,
          is_active: staffMember.is_active,
          is_verified: true,
          phone_number: staffMember.phone_number,
          national_id: staffMember.national_id_number,
          created_at: staffMember.created_at,
        },
        membership: {
          role: staffMember.firm_role || role,
          is_active: staffMember.is_active,
        },
        permissions: staffMember.permissions || [],
        available_permissions: availablePermissions,
        analytics: staffMember.analytics || {},
        workload: staffMember.workload || {
          active_cases: 0,
          closed_cases: 0,
          total_cases: 0,
          it_management: staffMember.analytics?.it_management || null,
        },
        it_management: staffMember.analytics?.it_management || null,
        secretary_metrics: staffMember.analytics
          ? {
              assigned_tasks: 0,
              completed_tasks: 0,
              managed_appointments: 0,
              documents_processed: 0,
              assigned_lawyers: staffMember.analytics.assigned_lawyers || 0,
              active_permissions: staffMember.analytics.active_permissions || 0,
            }
          : {},
        recent_cases: [],
        recent_activity: [],
        lawyer: role === 'LAWYER' ? staffMember : null,
        secretary: role === 'SECRETARY' ? staffMember : null,
        accountant: role === 'ACCOUNTANT' ? staffMember : null,
        hr: role === 'HR' ? staffMember : null,
        it: role === 'IT' ? staffMember : null,
        staff_member: staffMember,
      },
    };
  },

  /* ======================================================
     CREATE STAFF
  ====================================================== */
  // async createStaff(payload) {
  //   const { data } = await axiosInstance.post('/auth/staff/create/', payload);

  //   return data;
  // },

  async createStaff(payload) {
    try {
      const { first_name: firstName, last_name: lastName } =
        adminStaffService.splitName(payload);

      const basePayload = {
        first_name: firstName,
        last_name: lastName,
        email: payload.email,
        phone_number: payload.phone_number,
        national_id_number: payload.national_id || payload.national_id_number,
        staff_number: payload.staff_number || undefined,
        employee_number: payload.employee_number || undefined,
        department: payload.department || '',
        branch: payload.branch || null,
        department_unit: payload.department_unit || null,
        job_title: payload.job_title || 'Lawyer',
        work_email: payload.work_email || payload.email,
        work_phone: payload.work_phone || payload.phone_number,
        office_location: payload.office_location || '',
        employment_type: payload.employment_type || 'PERMANENT',
        date_hired: payload.date_hired,
        probation_end_date: payload.probation_end_date || null,
      };

      if (payload.firm_role === 'SECRETARY') {
        const secretaryPayload = {
          ...basePayload,
          job_title: payload.job_title || 'Secretary',
          can_prepare_documents: payload.can_prepare_documents ?? true,
          can_schedule_appointments: payload.can_schedule_appointments ?? true,
          can_manage_client_intake: payload.can_manage_client_intake ?? true,
          can_receive_documents: payload.can_receive_documents ?? true,
          permission_codes: payload.permission_codes || [],
          notes: payload.notes || '',
        };

        const { data } = await axiosInstance.post(
          '/admin/staff/secretaries/create/',
          secretaryPayload,
        );

        return data;
      }

      if (payload.firm_role === 'ACCOUNTANT') {
        const accountantPayload = {
          ...basePayload,
          job_title: payload.job_title || 'Accountant',
          accounting_specialization: payload.accounting_specialization || '',
          professional_license_number:
            payload.professional_license_number || '',
          can_manage_invoices: payload.can_manage_invoices ?? true,
          can_manage_payments: payload.can_manage_payments ?? true,
          can_manage_expenses: payload.can_manage_expenses ?? false,
          can_view_financial_reports:
            payload.can_view_financial_reports ?? true,
          permission_codes: payload.permission_codes || [],
          notes: payload.notes || '',
        };

        const { data } = await axiosInstance.post(
          '/admin/staff/accountants/create/',
          accountantPayload,
        );

        return data;
      }

      if (payload.firm_role === 'HR') {
        const hrPayload = {
          ...basePayload,
          job_title: payload.job_title || 'Human Resource Officer',
          hr_specialization: payload.hr_specialization || '',
          can_manage_staff_records:
            payload.can_manage_staff_records ?? true,
          can_manage_recruitment:
            payload.can_manage_recruitment ?? false,
          can_manage_leave: payload.can_manage_leave ?? true,
          can_manage_payroll_records:
            payload.can_manage_payroll_records ?? false,
          permission_codes: payload.permission_codes || [],
          notes: payload.notes || '',
        };

        const { data } = await axiosInstance.post(
          '/admin/staff/hr/create/',
          hrPayload,
        );

        return data;
      }

      if (payload.firm_role === 'IT') {
        const itPayload = {
          ...basePayload,
          job_title: payload.job_title || 'IT Support',
          technical_specialization: payload.technical_specialization || '',
          certification: payload.certification || '',
          can_manage_users: payload.can_manage_users ?? false,
          can_manage_system_settings:
            payload.can_manage_system_settings ?? false,
          can_manage_security: payload.can_manage_security ?? false,
          can_access_audit_logs: payload.can_access_audit_logs ?? true,
          permission_codes: payload.permission_codes || [],
          notes: payload.notes || '',
        };

        const { data } = await axiosInstance.post(
          '/admin/staff/it/create/',
          itPayload,
        );

        return data;
      }

      const lawyerPayload = {
        ...basePayload,
        job_title: payload.job_title || 'Lawyer',
        admission_number: payload.admission_number,
        practicing_certificate_number:
          payload.practicing_certificate_number || '',
        bar_admission_date: payload.bar_admission_date || null,
        is_notary: Boolean(payload.is_notary),
        can_commission_oaths: Boolean(payload.can_commission_oaths),
        is_court_approved: payload.is_court_approved ?? true,
        permission_codes: payload.permission_codes || [],
        professional_summary: payload.professional_summary || '',
      };

      const { data } = await axiosInstance.post(
        '/admin/staff/lawyers/create/',
        lawyerPayload,
      );

      return data;
    } catch (error) {
      console.log('CREATE STAFF ERROR');
      console.log(error.response?.data);
      console.log(error.response?.data?.errors?.phone_number);

      throw error;
    }
  },

  /* ======================================================
     UPDATE PERMISSIONS
  ==================================================== */
  async updateStaffPermissions(userId, payload) {
    const role =
      payload.role ||
      (await adminStaffService.resolveStaffRole(userId));
    if (!role) {
      throw new Error('Staff member not found.');
    }
    const config = adminStaffService.roleConfig(role);
    const endpoint = `/admin/staff/${config.segment}/${userId}/permissions/`;
    const body = { permission_codes: payload.permissions || [] };

    const { data } = await axiosInstance.post(endpoint, body);

    return data;
  },

  /* ======================================================
     TOGGLE STATUS
  ====================================================== */
  async toggleStaffStatus(staffMemberOrId) {
    const userId = staffMemberOrId?.user_id || staffMemberOrId?.id || staffMemberOrId;
    const role = staffMemberOrId?.role;
    const isActive = staffMemberOrId?.is_active;

    if (!role) {
      const details = await adminStaffService.getStaffDetails(userId);
      const resolvedRole = details.data?.membership?.role;
      const resolvedIsActive =
        details.data?.staff_member?.is_active ??
        details.data?.lawyer?.is_active ??
        details.data?.secretary?.is_active ??
        details.data?.accountant?.is_active ??
        details.data?.hr?.is_active ??
        details.data?.it?.is_active;
      return adminStaffService.toggleStaffStatus({
        user_id: userId,
        role: resolvedRole,
        is_active: resolvedIsActive,
      });
    }

    const action = isActive ? 'deactivate' : 'activate';
    const segment = adminStaffService.roleConfig(role).segment;
    const { data } = await axiosInstance.post(
      `/admin/staff/${segment}/${userId}/${action}/`,
    );

    return data;
  },

  /* ======================================================
     DELETE STAFF
  ====================================================== */
  async deleteStaff(staffMemberOrId) {
    const userId = staffMemberOrId?.user_id || staffMemberOrId?.id || staffMemberOrId;
    const role = staffMemberOrId?.role;

    if (!role) {
      const details = await adminStaffService.getStaffDetails(userId);
      const resolvedRole = details.data?.membership?.role;
      return adminStaffService.deleteStaff({
        user_id: userId,
        role: resolvedRole,
      });
    }

    const segment = adminStaffService.roleConfig(role).segment;
    const { data } = await axiosInstance.delete(
      `/admin/staff/${segment}/${userId}/delete/`,
    );

    return data;
  },
};

export default adminStaffService;
