export const buildCaseThreadTitle = (caseItem = {}) =>
  `${caseItem.case_number || 'Case'} - ${caseItem.title || 'Untitled case'}`;

export default {
  buildCaseThreadTitle,
};
