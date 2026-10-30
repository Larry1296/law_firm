export const CASE_STATUS_TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'ACTIVE', label: 'Open' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'CLOSED', label: 'Closed' },
];

// Matter statuses as the server records them, with the older list values they replaced.
const OPEN_STATUSES = ['MATTER_OPEN', 'ACTIVE', 'SETTLEMENT_IN_PROGRESS', 'CLOSURE_PENDING', 'IN_PROGRESS', 'OPEN'];
const CLOSED_STATUSES = ['CLOSED', 'ARCHIVED', 'CANCELLED', 'COMPLETED'];
const PENDING_STATUSES = [
  'DRAFT', 'INSTRUCTIONS_RECEIVED', 'CONFLICT_CHECK_PENDING', 'CONFLICT_CLEARED', 'CONFLICT_IDENTIFIED',
  'ENGAGEMENT_PENDING', 'ENGAGEMENT_CONFIRMED', 'ON_HOLD', 'PENDING', 'PROSPECTIVE',
];

export const caseStatusGroup = (caseItem) => {
  const status = String(
    caseItem?.matter_status || caseItem?.status || '',
  ).toUpperCase();

  if (OPEN_STATUSES.includes(status)) return 'ACTIVE';
  if (CLOSED_STATUSES.includes(status)) return 'CLOSED';
  if (PENDING_STATUSES.includes(status)) return 'PENDING';
  return status;
};

export const countCasesByStatus = (cases) =>
  cases.reduce(
    (counts, caseItem) => {
      const group = caseStatusGroup(caseItem);
      if (Object.hasOwn(counts, group)) counts[group] += 1;
      return counts;
    },
    { ALL: cases.length, ACTIVE: 0, PENDING: 0, CLOSED: 0 },
  );
