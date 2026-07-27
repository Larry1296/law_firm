export const CASE_STATUS_TABS = [
  { key: 'ALL', label: 'All Cases' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'CLOSED', label: 'Closed' },
];

export const caseStatusGroup = (caseItem) => {
  const status = String(
    caseItem?.matter_status || caseItem?.status || '',
  ).toUpperCase();

  if (['ACTIVE', 'IN_PROGRESS', 'OPEN'].includes(status)) return 'ACTIVE';
  if (['CLOSED', 'ARCHIVED', 'COMPLETED'].includes(status)) return 'CLOSED';
  if (['PENDING', 'PROSPECTIVE'].includes(status)) return 'PENDING';
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
