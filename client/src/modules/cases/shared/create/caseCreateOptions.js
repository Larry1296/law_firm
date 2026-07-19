export const ENTRY_ROUTES = [
  { value: 'NEW_INSTRUCTION', label: 'New instruction - not yet filed' },
  { value: 'EXISTING_FILED_COURT_CASE', label: 'Existing filed court case' },
  { value: 'EXISTING_TRIBUNAL_MATTER', label: 'Existing tribunal matter' },
  { value: 'EXISTING_ARBITRATION', label: 'Existing arbitration' },
  { value: 'NON_CONTENTIOUS_MATTER', label: 'Non-contentious or advisory matter' },
];

export const PRACTICE_AREAS = [
  { value: 'CIVIL_COMMERCIAL_LITIGATION', label: 'Civil and Commercial Litigation' },
  { value: 'LAND_ENVIRONMENT', label: 'Land and Environment' },
  { value: 'EMPLOYMENT_LABOUR', label: 'Employment and Labour' },
  { value: 'SUCCESSION_PROBATE', label: 'Succession and Probate' },
  { value: 'CRIMINAL_LITIGATION', label: 'Criminal Litigation' },
  { value: 'CONSTITUTIONAL_HUMAN_RIGHTS', label: 'Constitutional and Human Rights' },
  { value: 'JUDICIAL_REVIEW', label: 'Judicial Review' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'TAX', label: 'Tax' },
  { value: 'INSOLVENCY', label: 'Insolvency' },
  { value: 'INTELLECTUAL_PROPERTY', label: 'Intellectual Property' },
  { value: 'PUBLIC_PROCUREMENT', label: 'Public Procurement' },
  { value: 'CONVEYANCING', label: 'Conveyancing' },
  { value: 'CORPORATE_COMMERCIAL', label: 'Corporate and Commercial' },
  { value: 'ARBITRATION_MEDIATION', label: 'Arbitration and Mediation' },
  { value: 'TRIBUNAL_PROCEEDINGS', label: 'Tribunal Proceedings' },
  { value: 'DEBT_RECOVERY', label: 'Debt Recovery' },
  { value: 'REGULATORY_COMPLIANCE', label: 'Regulatory and Compliance' },
  { value: 'ADVISORY', label: 'Advisory' },
];

export const MATTER_NATURES = [
  { value: 'CONTENTIOUS', label: 'Contentious' },
  { value: 'NON_CONTENTIOUS', label: 'Non-contentious' },
  { value: 'ADVISORY', label: 'Advisory' },
  { value: 'TRANSACTIONAL', label: 'Transactional' },
  { value: 'REGULATORY', label: 'Regulatory' },
  { value: 'DEBT_RECOVERY', label: 'Debt recovery' },
  { value: 'ALTERNATIVE_DISPUTE_RESOLUTION', label: 'Alternative dispute resolution' },
];

export const FORUMS = [
  { value: 'NO_FORMAL_FORUM', label: 'No formal forum' },
  { value: 'COURT', label: 'Court' },
  { value: 'TRIBUNAL', label: 'Tribunal' },
  { value: 'ARBITRATION', label: 'Arbitration' },
  { value: 'MEDIATION', label: 'Mediation' },
  { value: 'ADMINISTRATIVE_BODY', label: 'Administrative body' },
];

export const CASE_TYPES = [
  { value: 'CIVIL', label: 'Civil' },
  { value: 'CRIMINAL', label: 'Criminal' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'LAND', label: 'Land' },
  { value: 'EMPLOYMENT', label: 'Employment' },
  { value: 'COMMERCIAL', label: 'Commercial' },
  { value: 'SUCCESSION', label: 'Succession' },
  { value: 'CONSTITUTIONAL', label: 'Constitutional' },
  { value: 'TAX', label: 'Tax' },
  { value: 'IMMIGRATION', label: 'Immigration' },
  { value: 'JUDICIAL_REVIEW', label: 'Judicial Review' },
  { value: 'ELECTION_PETITION', label: 'Election Petition' },
  { value: 'TRIBUNAL', label: 'Tribunal' },
  { value: 'ARBITRATION', label: 'Arbitration' },
  { value: 'MEDIATION', label: 'Mediation' },
  { value: 'CONVEYANCING', label: 'Conveyancing' },
  { value: 'DEBT_RECOVERY', label: 'Debt Recovery' },
  { value: 'TRAFFIC', label: 'Traffic' },
  { value: 'CHILDREN', label: 'Children Matter' },
  { value: 'SMALL_CLAIM', label: 'Small Claim' },
];

export const PROCEDURE_TRACKS = [
  {
    value: 'CIVIL_SUIT',
    label: 'Plaint / Civil Suit',
    forums: ['COURT'],
    practiceAreas: ['CIVIL_COMMERCIAL_LITIGATION', 'LAND_ENVIRONMENT', 'DEBT_RECOVERY', 'INSURANCE'],
  },
  {
    value: 'COMMERCIAL_PETITION',
    label: 'Commercial Petition',
    forums: ['COURT'],
    practiceAreas: ['CIVIL_COMMERCIAL_LITIGATION', 'CORPORATE_COMMERCIAL', 'INSOLVENCY'],
  },
  {
    value: 'MISC_APPLICATION',
    label: 'Miscellaneous Application',
    forums: ['COURT'],
    practiceAreas: ['CIVIL_COMMERCIAL_LITIGATION', 'LAND_ENVIRONMENT', 'EMPLOYMENT_LABOUR', 'FAMILY_LAW', 'JUDICIAL_REVIEW'],
  },
  {
    value: 'CONSTITUTIONAL_PETITION',
    label: 'Constitutional Petition',
    forums: ['COURT'],
    practiceAreas: ['CONSTITUTIONAL_HUMAN_RIGHTS'],
  },
  {
    value: 'PETITION',
    label: 'Petition',
    forums: ['COURT'],
    practiceAreas: ['CONSTITUTIONAL_HUMAN_RIGHTS', 'PUBLIC_PROCUREMENT', 'REGULATORY_COMPLIANCE'],
  },
  {
    value: 'JUDICIAL_REVIEW',
    label: 'Judicial Review Application',
    forums: ['COURT'],
    practiceAreas: ['JUDICIAL_REVIEW', 'PUBLIC_PROCUREMENT', 'REGULATORY_COMPLIANCE'],
  },
  {
    value: 'APPEAL',
    label: 'Appeal',
    forums: ['COURT'],
    practiceAreas: ['CIVIL_COMMERCIAL_LITIGATION', 'LAND_ENVIRONMENT', 'EMPLOYMENT_LABOUR', 'CRIMINAL_LITIGATION', 'FAMILY_LAW'],
  },
  {
    value: 'SUCCESSION_CAUSE',
    label: 'Succession Cause',
    forums: ['COURT'],
    practiceAreas: ['SUCCESSION_PROBATE'],
  },
  {
    value: 'FAMILY_CAUSE',
    label: 'Family Cause',
    forums: ['COURT'],
    practiceAreas: ['FAMILY_LAW'],
  },
  {
    value: 'EMPLOYMENT_CLAIM',
    label: 'Statement of Claim',
    forums: ['COURT'],
    practiceAreas: ['EMPLOYMENT_LABOUR'],
  },
  {
    value: 'ELC_SUIT',
    label: 'ELC Suit',
    forums: ['COURT'],
    practiceAreas: ['LAND_ENVIRONMENT'],
  },
  {
    value: 'SMALL_CLAIM',
    label: 'Small Claim',
    forums: ['COURT'],
    practiceAreas: ['CIVIL_COMMERCIAL_LITIGATION', 'DEBT_RECOVERY', 'INSURANCE'],
  },
  {
    value: 'CRIMINAL_CASE',
    label: 'Criminal Case',
    forums: ['COURT'],
    practiceAreas: ['CRIMINAL_LITIGATION'],
  },
  {
    value: 'CRIMINAL_TRIAL',
    label: 'Criminal Trial',
    forums: ['COURT'],
    practiceAreas: ['CRIMINAL_LITIGATION'],
  },
  {
    value: 'CRIMINAL_APPEAL',
    label: 'Criminal Appeal',
    forums: ['COURT'],
    practiceAreas: ['CRIMINAL_LITIGATION'],
  },
  {
    value: 'CHILDREN_MATTER',
    label: 'Children Matter',
    forums: ['COURT'],
    practiceAreas: ['FAMILY_LAW'],
  },
  {
    value: 'TRIBUNAL_MATTER',
    label: 'Tribunal Complaint / Reference',
    forums: ['TRIBUNAL'],
    practiceAreas: ['TRIBUNAL_PROCEEDINGS', 'REGULATORY_COMPLIANCE', 'EMPLOYMENT_LABOUR'],
  },
  {
    value: 'ARBITRATION',
    label: 'Arbitration Reference',
    forums: ['ARBITRATION'],
    practiceAreas: ['ARBITRATION_MEDIATION', 'CIVIL_COMMERCIAL_LITIGATION'],
  },
  {
    value: 'MEDIATION',
    label: 'Mediation',
    forums: ['MEDIATION'],
    practiceAreas: ['ARBITRATION_MEDIATION'],
  },
  {
    value: 'ADR',
    label: 'Alternative Dispute Resolution',
    forums: ['MEDIATION', 'ARBITRATION'],
    practiceAreas: ['ARBITRATION_MEDIATION'],
  },
  {
    value: 'NON_CONTENTIOUS',
    label: 'Advisory / Transactional Instruction',
    forums: ['NO_FORMAL_FORUM'],
    practiceAreas: ['ADVISORY', 'CORPORATE_COMMERCIAL', 'CONVEYANCING', 'REGULATORY_COMPLIANCE'],
  },
];

export const COURT_TYPES = [
  {
    value: 'SUPREME_COURT',
    label: 'Supreme Court',
    practiceAreas: ['CONSTITUTIONAL_HUMAN_RIGHTS', 'JUDICIAL_REVIEW'],
  },
  {
    value: 'COURT_OF_APPEAL',
    label: 'Court of Appeal',
    practiceAreas: ['CIVIL_COMMERCIAL_LITIGATION', 'LAND_ENVIRONMENT', 'EMPLOYMENT_LABOUR', 'CRIMINAL_LITIGATION', 'FAMILY_LAW'],
  },
  {
    value: 'HIGH_COURT',
    label: 'High Court',
    practiceAreas: ['CIVIL_COMMERCIAL_LITIGATION', 'FAMILY_LAW', 'SUCCESSION_PROBATE', 'CONSTITUTIONAL_HUMAN_RIGHTS', 'JUDICIAL_REVIEW', 'INSURANCE', 'DEBT_RECOVERY'],
  },
  {
    value: 'ENVIRONMENT_LAND',
    label: 'Environment and Land Court',
    practiceAreas: ['LAND_ENVIRONMENT'],
  },
  {
    value: 'EMPLOYMENT_LABOUR',
    label: 'Employment and Labour Court',
    practiceAreas: ['EMPLOYMENT_LABOUR'],
  },
  {
    value: 'MAGISTRATE',
    label: 'Magistrates Court',
    practiceAreas: ['CIVIL_COMMERCIAL_LITIGATION', 'DEBT_RECOVERY', 'INSURANCE', 'FAMILY_LAW', 'CRIMINAL_LITIGATION', 'LAND_ENVIRONMENT'],
  },
  {
    value: 'KADHI',
    label: 'Kadhi Court',
    practiceAreas: ['FAMILY_LAW', 'SUCCESSION_PROBATE'],
  },
  {
    value: 'SMALL_CLAIMS',
    label: 'Small Claims Court',
    practiceAreas: ['DEBT_RECOVERY', 'CIVIL_COMMERCIAL_LITIGATION', 'INSURANCE'],
  },
  {
    value: 'COURT_MARTIAL',
    label: 'Court Martial',
    practiceAreas: ['CRIMINAL_LITIGATION'],
  },
  { value: 'OTHER', label: 'Other', practiceAreas: [] },
];


export const COURT_LEVELS = [
  { value: 'SUPERIOR_COURT', label: 'Superior Court' },
  { value: 'SUBORDINATE_COURT', label: 'Subordinate Court' },
];

export const COURT_LEVEL_BY_TYPE = {
  SUPREME_COURT: 'SUPERIOR_COURT',
  COURT_OF_APPEAL: 'SUPERIOR_COURT',
  HIGH_COURT: 'SUPERIOR_COURT',
  ENVIRONMENT_LAND: 'SUPERIOR_COURT',
  EMPLOYMENT_LABOUR: 'SUPERIOR_COURT',
  MAGISTRATE: 'SUBORDINATE_COURT',
  KADHI: 'SUBORDINATE_COURT',
  SMALL_CLAIMS: 'SUBORDINATE_COURT',
  COURT_MARTIAL: 'SUBORDINATE_COURT',
  TRIBUNAL: 'SUBORDINATE_COURT',
};

export const COURT_DIVISIONS = [
  { value: 'CIVIL', label: 'Civil Division' },
  { value: 'COMMERCIAL_TAX', label: 'Commercial and Tax Division' },
  { value: 'CONSTITUTIONAL_HUMAN_RIGHTS', label: 'Constitutional and Human Rights Division' },
  { value: 'FAMILY', label: 'Family Division' },
  { value: 'JUDICIAL_REVIEW', label: 'Judicial Review Division' },
  { value: 'CRIMINAL', label: 'Criminal Division' },
  { value: 'ANTI_CORRUPTION_ECONOMIC_CRIMES', label: 'Anti-Corruption and Economic Crimes Division' },
  { value: 'ELC', label: 'Environment and Land Court Registry' },
  { value: 'ELRC', label: 'Employment and Labour Relations Registry' },
  { value: 'SMALL_CLAIMS', label: 'Small Claims Court' },
  { value: 'KADHI', label: 'Kadhi Court' },
  { value: 'TRIBUNAL', label: 'Tribunal' },
  { value: 'APPELLATE', label: 'Appellate' },
  { value: 'GENERAL', label: 'General Registry' },
  { value: 'OTHER', label: 'Other' },
];

export const PARTY_ROLES = {
  CIVIL_SUIT: ['PLAINTIFF', 'DEFENDANT', 'INTERESTED_PARTY', 'THIRD_PARTY', 'APPLICANT', 'RESPONDENT'],
  SUCCESSION_CAUSE: ['PETITIONER', 'ADMINISTRATOR', 'EXECUTOR', 'BENEFICIARY', 'OBJECTOR', 'PROTESTOR', 'APPLICANT', 'RESPONDENT'],
  JUDICIAL_REVIEW: ['EX_PARTE_APPLICANT', 'RESPONDENT', 'INTERESTED_PARTY'],
  PETITION: ['PETITIONER', 'RESPONDENT', 'INTERESTED_PARTY', 'AMICUS_CURIAE'],
  CRIMINAL_CASE: ['ACCUSED', 'COMPLAINANT', 'PROSECUTION', 'VICTIM', 'INTERESTED_PARTY'],
  APPEAL: ['APPELLANT', 'RESPONDENT', 'INTERESTED_PARTY'],
  EMPLOYMENT_CLAIM: ['CLAIMANT', 'RESPONDENT', 'INTERESTED_PARTY'],
  DEFAULT: ['PLAINTIFF', 'DEFENDANT', 'APPLICANT', 'RESPONDENT', 'CLAIMANT', 'OTHER'],
};

export const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

export const MONETARY_RELIEF_TYPES = [
  { value: 'NO_MONETARY_RELIEF', label: 'No monetary relief' },
  { value: 'QUANTIFIED', label: 'Yes - quantified' },
  { value: 'PARTLY_QUANTIFIED', label: 'Yes - partly quantified' },
  { value: 'TO_BE_ASSESSED', label: 'Yes - amount to be assessed' },
  { value: 'VALUE_ONLY', label: 'Value only, not a claim' },
];
