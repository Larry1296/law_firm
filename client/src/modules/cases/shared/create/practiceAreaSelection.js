import { COURT_LEVEL_BY_TYPE, COURT_TYPES, PRACTICE_AREAS } from './caseCreateOptions';

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

// Choosing a practice area sets the matter category and the usual court and procedure for it.
const PRACTICE_AREA_DEFAULTS = {
  LAND_ENVIRONMENT: {
    case_type: 'LAND',
    court_type: 'ENVIRONMENT_LAND',
    court_level: COURT_LEVEL_BY_TYPE.ENVIRONMENT_LAND,
    court_division: 'ELC',
    procedure_track: 'ELC_SUIT',
  },
  EMPLOYMENT_LABOUR: {
    case_type: 'EMPLOYMENT',
    court_type: 'EMPLOYMENT_LABOUR',
    court_level: COURT_LEVEL_BY_TYPE.EMPLOYMENT_LABOUR,
    court_division: 'ELRC',
    procedure_track: 'EMPLOYMENT_CLAIM',
  },
  SUCCESSION_PROBATE: {
    case_type: 'SUCCESSION',
    court_type: 'HIGH_COURT',
    court_level: COURT_LEVEL_BY_TYPE.HIGH_COURT,
    court_division: 'FAMILY',
    procedure_track: 'SUCCESSION_CAUSE',
  },
  CRIMINAL_LITIGATION: {
    case_type: 'CRIMINAL',
    court_type: 'MAGISTRATE',
    court_level: COURT_LEVEL_BY_TYPE.MAGISTRATE,
    court_division: 'CRIMINAL',
    procedure_track: 'CRIMINAL_CASE',
    monetary_relief_type: 'NO_MONETARY_RELIEF',
    claim_amount: '',
  },
  INSURANCE: {
    case_type: 'CIVIL',
    court_type: 'MAGISTRATE',
    court_level: COURT_LEVEL_BY_TYPE.MAGISTRATE,
    court_division: 'CIVIL',
    procedure_track: 'CIVIL_SUIT',
  },
  CIVIL_COMMERCIAL_LITIGATION: {
    case_type: 'COMMERCIAL',
    procedure_track: 'CIVIL_SUIT',
    court_type: 'HIGH_COURT',
    court_level: COURT_LEVEL_BY_TYPE.HIGH_COURT,
    court_division: 'COMMERCIAL_TAX',
  },
  JUDICIAL_REVIEW: {
    case_type: 'JUDICIAL_REVIEW',
    procedure_track: 'JUDICIAL_REVIEW',
    court_type: 'HIGH_COURT',
    court_level: COURT_LEVEL_BY_TYPE.HIGH_COURT,
    court_division: 'JUDICIAL_REVIEW',
  },
  CONSTITUTIONAL_HUMAN_RIGHTS: {
    case_type: 'CONSTITUTIONAL',
    procedure_track: 'CONSTITUTIONAL_PETITION',
    court_type: 'HIGH_COURT',
    court_level: COURT_LEVEL_BY_TYPE.HIGH_COURT,
    court_division: 'CONSTITUTIONAL_HUMAN_RIGHTS',
  },
};

export const practiceAreaDefaults = (practiceArea) => ({ ...(PRACTICE_AREA_DEFAULTS[practiceArea] || {}) });

// A matter opened from a cleared proposal starts from its practice area and the court the advocate confirmed.
export const matterDefaultsFromConflictCheck = (conflictCheck) => {
  const practiceArea = practiceAreaFromConflictCheck(conflictCheck);
  if (!practiceArea) return {};
  const defaults = { practice_area: practiceArea, ...practiceAreaDefaults(practiceArea) };
  const jurisdiction = conflictCheck?.jurisdiction;
  if (jurisdiction?.is_final && COURT_TYPES.some((type) => type.value === jurisdiction.final_court_type)) {
    defaults.forum = 'COURT';
    defaults.court_type = jurisdiction.final_court_type;
    defaults.court_level = COURT_LEVEL_BY_TYPE[jurisdiction.final_court_type] || defaults.court_level;
    if (jurisdiction.final_station) defaults.court_station = jurisdiction.final_station;
  }
  return defaults;
};
