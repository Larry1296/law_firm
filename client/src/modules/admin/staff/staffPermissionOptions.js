// Grants each staff role can hold, grouped by the stage of work they unlock.
// Codes mirror the backend permission enums in server/apps/staff/models.
// The AI grants (USE_LEGAL_RESEARCH, USE_AI_TOOLS) stay out while internal AI is paused.

export const STAFF_PERMISSION_GROUPS = {
  LAWYER: [
    {
      title: 'Intake and opening',
      description: 'Take a new client from first contact to an opened matter.',
      permissions: [
        ['CREATE_PROPOSED_MATTER', 'Record proposed matters'],
        ['PERFORM_CONFLICT_CHECK', 'Run conflict checks'],
        ['APPROVE_CONFLICT_RESULT', 'Approve conflict results'],
        ['ACCEPT_DECLINE_INSTRUCTIONS', 'Accept or decline instructions'],
        ['CONFIRM_JURISDICTION', 'Confirm the court or tribunal'],
        ['REVIEW_CLIENT_COMPLIANCE', 'Review client identity and due diligence (KYC)'],
        ['APPROVE_ENGAGEMENT', 'Approve signed engagements'],
        ['WAIVE_ENGAGEMENT', 'Waive the engagement requirement'],
        ['OPEN_MATTER', 'Open matters'],
      ],
    },
    {
      title: 'Matter work',
      description: 'Run the matters assigned to this advocate.',
      permissions: [
        ['MANAGE_ASSIGNED_CASES', 'Manage assigned matters'],
        ['CREATE_CASES', 'Create legal matters'],
        ['ASSIGN_OTHER_LAWYER', 'Assign another responsible advocate'],
        ['RECORD_COURT_FILING', 'Record court filings'],
        ['SCHEDULE_HEARINGS', 'Schedule hearings'],
        ['MANAGE_CASE_DOCUMENTS', 'Manage matter documents'],
        ['APPROVE_DOCUMENTS', 'Approve documents'],
        ['MANAGE_CLIENT_COMMUNICATIONS', 'Manage client communications'],
        ['COMPLETE_LEGAL_ASSESSMENT', 'Complete legal assessments'],
        ['VIEW_BILLING', 'View billing'],
      ],
    },
    {
      title: 'Closing and archive',
      description: 'Close finished matters and look after the archive.',
      permissions: [
        ['REQUEST_MATTER_CLOSURE', 'Request matter closure'],
        ['APPROVE_MATTER_CLOSURE', 'Approve matter closure'],
        ['REOPEN_MATTER', 'Reopen closed matters'],
        ['ARCHIVE_MATTER', 'Archive closed matters'],
        ['ACCESS_RESTRICTED_ARCHIVE', 'Open restricted archives'],
        ['PLACE_LEGAL_HOLD', 'Place legal holds'],
        ['APPROVE_DESTRUCTION', 'Approve file destruction'],
      ],
    },
  ],
  SECRETARY: [
    {
      title: 'Secretary work',
      description: 'Front office, filing and diary.',
      permissions: [
        ['MANAGE_CLIENTS', 'Manage clients'],
        ['MANAGE_CASES', 'Manage matters'],
        ['MANAGE_DOCUMENTS', 'Manage documents'],
        ['MANAGE_CALENDAR', 'Manage the calendar'],
        ['MANAGE_TASKS', 'Manage tasks'],
        ['SEND_COMMUNICATIONS', 'Send communications'],
        ['VIEW_REPORTS', 'View reports'],
        ['MANAGE_BILLING', 'Manage billing'],
      ],
    },
  ],
  ACCOUNTANT: [
    {
      title: 'Fee notes',
      description: 'Prepare and approve invoices, time and disbursements.',
      permissions: [
        ['MANAGE_INVOICES', 'Prepare invoices'],
        ['APPROVE_INVOICES', 'Approve invoices'],
        ['MANAGE_EXPENSES', 'Record disbursements'],
        ['MANAGE_CLIENT_BILLING', 'Manage client billing'],
      ],
    },
    {
      title: 'Money in and out',
      description: 'Bank accounts, receipts, client money and reconciliation.',
      permissions: [
        ['RECORD_RECEIPTS', 'Record office receipts'],
        ['MANAGE_PAYMENTS', 'Manage payments'],
        ['MANAGE_CLIENT_MONEY', 'Manage client money (accounts, receipts, retainers, payment requests)'],
        ['APPROVE_CLIENT_MONEY_PAYMENTS', 'Approve client-money payments and transfers'],
        ['RECONCILE_ACCOUNTS', 'Reconcile bank accounts'],
      ],
    },
    {
      title: 'Tax, payroll and reports',
      description: '',
      permissions: [
        ['MANAGE_TAX_RECORDS', 'Manage VAT and tax settings'],
        ['MANAGE_PAYROLL', 'Manage payroll'],
        ['VIEW_FINANCIAL_REPORTS', 'View financial reports'],
      ],
    },
  ],
  HR: [
    {
      title: 'HR work',
      description: '',
      permissions: [
        ['MANAGE_STAFF_RECORDS', 'Manage staff records'],
        ['MANAGE_RECRUITMENT', 'Manage recruitment'],
        ['MANAGE_LEAVE', 'Manage leave'],
        ['MANAGE_PAYROLL_RECORDS', 'Manage payroll records'],
        ['MANAGE_PERFORMANCE', 'Manage performance'],
        ['VIEW_HR_REPORTS', 'View HR reports'],
      ],
    },
  ],
  IT: [
    {
      title: 'IT work',
      description: '',
      permissions: [
        ['MANAGE_USERS', 'Manage users'],
        ['MANAGE_SYSTEM_SETTINGS', 'Manage system settings'],
        ['MANAGE_SECURITY', 'Manage security'],
        ['VIEW_AUDIT_LOGS', 'View audit logs'],
        ['MANAGE_BACKUPS', 'Manage backups'],
        ['MANAGE_INTEGRATIONS', 'Manage integrations'],
      ],
    },
  ],
};

export const permissionCodesFor = (role) =>
  (STAFF_PERMISSION_GROUPS[role] || []).flatMap((group) => group.permissions.map(([code]) => code));
