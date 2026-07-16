import React from 'react';
import { displayEnum } from '@/core/utils/textFormatter';
import { formatDateTime } from '@/core/utils/dateFormatter';

export const statusBadgeClass = (value) => {
  const key = String(value || '').toUpperCase();
  const styles = {
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-200',
    PENDING_FILING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-200',
    FILED: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200',
    IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200',
    HEARING: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-200',
    JUDGMENT_DELIVERED: 'bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-200',
    ON_APPEAL: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/15 dark:text-fuchsia-200',
    CLOSED: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-200',
    SETTLED: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-200',
    DISMISSED: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-200',
    WITHDRAWN: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-200',
    ARCHIVED: 'bg-slate-100 text-slate-800 dark:bg-slate-500/15 dark:text-slate-200',
  };
  return styles[key] || 'bg-gray-100 text-gray-800 dark:bg-gray-500/15 dark:text-gray-200';
};

export const priorityBadgeClass = (value) => {
  const key = String(value || '').toUpperCase();
  const styles = {
    LOW: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-200',
    MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-200',
    HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-200',
    URGENT: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-200',
  };
  return styles[key] || 'bg-gray-100 text-gray-800 dark:bg-gray-500/15 dark:text-gray-200';
};

export const badge = (value, className) => (
  React.createElement(
    'span',
    {
      className: `rounded-full px-2 py-1 text-xs font-semibold ${className}`,
    },
    displayEnum(value) || 'Not Set',
  )
);

export const casePartyLabel = (caseItem) =>
  caseItem?.case_owner?.party_role_label ||
  displayEnum(caseItem?.case_owner?.party_role) ||
  'Client Role';

export const casePartyName = (caseItem) =>
  caseItem?.case_owner?.full_name ||
  caseItem?.plaintiff_name ||
  caseItem?.plaintiff ||
  caseItem?.client_name ||
  'Not Set';

export const renderStatusBadge = (value) => badge(value, statusBadgeClass(value));

export const renderPriorityBadge = (value) => badge(value, priorityBadgeClass(value));

export const renderEnum = (value) => displayEnum(value) || 'Not Set';

export const renderDateTime = (value) => (value ? formatDateTime(value) : 'Not Set');
