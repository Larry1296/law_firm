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
  { value: 'JUDICIAL_REVIEW', label: 'Judicial Review' },
  { value: 'ARBITRATION', label: 'Arbitration' },
  { value: 'MEDIATION', label: 'Mediation' },
  { value: 'DEBT_RECOVERY', label: 'Debt Recovery' },
  { value: 'SMALL_CLAIM', label: 'Small Claim' },
];

export const PROCEDURE_TRACKS = [
  { value: 'CIVIL_SUIT', label: 'Civil Suit', forums: ['COURT'] },
  { value: 'MISC_APPLICATION', label: 'Miscellaneous Application', forums: ['COURT'] },
  { value: 'PETITION', label: 'Petition', forums: ['COURT'] },
  { value: 'JUDICIAL_REVIEW', label: 'Judicial Review Application', forums: ['COURT'] },
  { value: 'APPEAL', label: 'Appeal', forums: ['COURT'] },
  { value: 'SUCCESSION_CAUSE', label: 'Succession Cause', forums: ['COURT'] },
  { value: 'EMPLOYMENT_CLAIM', label: 'Employment Claim', forums: ['COURT'] },
  { value: 'ELC_SUIT', label: 'Environment and Land Suit', forums: ['COURT'] },
  { value: 'SMALL_CLAIM', label: 'Small Claim', forums: ['COURT'] },
  { value: 'TRIBUNAL_MATTER', label: 'Tribunal Complaint', forums: ['TRIBUNAL'] },
  { value: 'ARBITRATION', label: 'Arbitration', forums: ['ARBITRATION'] },
  { value: 'MEDIATION', label: 'Mediation', forums: ['MEDIATION'] },
  { value: 'NON_CONTENTIOUS', label: 'Advisory Instruction', forums: ['NO_FORMAL_FORUM'] },
];

export const COURT_TYPES = [
  { value: 'SUPREME_COURT', label: 'Supreme Court' },
  { value: 'COURT_OF_APPEAL', label: 'Court of Appeal' },
  { value: 'HIGH_COURT', label: 'High Court' },
  { value: 'ENVIRONMENT_LAND', label: 'Environment and Land Court' },
  { value: 'EMPLOYMENT_LABOUR', label: 'Employment and Labour Relations Court' },
  { value: 'MAGISTRATE', label: 'Magistrates Court' },
  { value: 'KADHI', label: 'Kadhi Court' },
  { value: 'SMALL_CLAIMS', label: 'Small Claims Court' },
  { value: 'TRIBUNAL', label: 'Tribunal' },
  { value: 'OTHER', label: 'Other' },
];

export const COURT_DIVISIONS = [
  { value: 'CIVIL', label: 'Civil Division' },
  { value: 'COMMERCIAL_TAX', label: 'Commercial and Tax Division' },
  { value: 'CONSTITUTIONAL_HUMAN_RIGHTS', label: 'Constitutional and Human Rights Division' },
  { value: 'FAMILY', label: 'Family Division' },
  { value: 'JUDICIAL_REVIEW', label: 'Judicial Review Division' },
  { value: 'ELC', label: 'Environment and Land Court Registry' },
  { value: 'ELRC', label: 'Employment and Labour Relations Registry' },
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
