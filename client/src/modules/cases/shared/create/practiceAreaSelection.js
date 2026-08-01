import { PRACTICE_AREAS } from './caseCreateOptions';

const normalized = (value) => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');

export const normalizePracticeArea = (value) => {
  const candidate = normalized(value);
  if (!candidate) return '';

  return PRACTICE_AREAS.find(
    (area) => normalized(area.value) === candidate || normalized(area.label) === candidate,
  )?.value || '';
};

export const practiceAreaFromConflictCheck = (conflictCheck) => normalizePracticeArea(
  conflictCheck?.jurisdiction_facts?.practice_area || conflictCheck?.practice_area,
);
