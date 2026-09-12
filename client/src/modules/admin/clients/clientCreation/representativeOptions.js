const option = (value, label = value) => ({ value, label });

export const REPRESENTATIVE_RULES = {
  INDIVIDUAL: {
    capacities: ['AUTHORIZED_AGENT', 'OTHER'],
    roles: ['Guardian', 'Parent', 'Attorney under power of attorney', 'Next friend', 'Personal representative', 'Other authorized representative'],
    authorities: ['POWER_OF_ATTORNEY', 'COURT_ORDER', 'STATUTORY_AUTHORITY', 'PARENTAL_OR_GUARDIAN_AUTHORITY', 'CLIENT_AUTHORIZATION'],
  },
  SOLE_PROPRIETORSHIP: {
    capacities: ['PROPRIETOR', 'AUTHORIZED_AGENT'], roles: ['Proprietor', 'Business manager', 'Authorized agent'],
    authorities: ['PROPRIETOR_AUTHORIZATION', 'POWER_OF_ATTORNEY', 'BUSINESS_REGISTRATION'],
  },
  COMPANY: {
    capacities: ['DIRECTOR', 'COMPANY_SECRETARY', 'AUTHORIZED_AGENT'], roles: ['Director', 'Company Secretary', 'Chief Executive Officer', 'Legal and Compliance Manager', 'Authorized Officer'],
    authorities: ['BOARD_RESOLUTION', 'POWER_OF_ATTORNEY', 'COMPANY_CONSTITUTION', 'WRITTEN_AUTHORIZATION'],
  },
  PARTNERSHIP: {
    capacities: ['PARTNER', 'AUTHORIZED_AGENT'], roles: ['Partner', 'Managing Partner', 'Authorized Agent'],
    authorities: ['PARTNERSHIP_AGREEMENT', 'PARTNER_RESOLUTION', 'POWER_OF_ATTORNEY', 'WRITTEN_AUTHORIZATION'],
  },
  LIMITED_LIABILITY_PARTNERSHIP: {
    capacities: ['DESIGNATED_PARTNER', 'PARTNER', 'AUTHORIZED_AGENT'], roles: ['Designated Partner', 'Partner', 'LLP Manager', 'Authorized Agent'],
    authorities: ['LLP_AGREEMENT', 'PARTNER_RESOLUTION', 'POWER_OF_ATTORNEY', 'WRITTEN_AUTHORIZATION'],
  },
  COOPERATIVE: {
    capacities: ['COOPERATIVE_OFFICER', 'AUTHORIZED_AGENT'], roles: ['Chairperson', 'Secretary', 'Treasurer', 'Chief Executive Officer', 'Co-operative Officer'],
    authorities: ['MANAGEMENT_COMMITTEE_RESOLUTION', 'BYLAWS', 'POWER_OF_ATTORNEY', 'WRITTEN_AUTHORIZATION'],
  },
  SOCIETY_OR_ASSOCIATION: {
    capacities: ['SOCIETY_OFFICIAL', 'AUTHORIZED_AGENT'], roles: ['Chairperson', 'Secretary', 'Treasurer', 'Association Official', 'Authorized Agent'],
    authorities: ['GOVERNING_BODY_RESOLUTION', 'CONSTITUTION', 'POWER_OF_ATTORNEY', 'WRITTEN_AUTHORIZATION'],
  },
  NON_PROFIT_ORGANIZATION: {
    capacities: ['PBO_OFFICIAL', 'AUTHORIZED_AGENT'], roles: ['Board Chairperson', 'Trustee', 'Executive Director', 'PBO Official', 'Authorized Officer'],
    authorities: ['BOARD_RESOLUTION', 'CONSTITUTION', 'POWER_OF_ATTORNEY', 'WRITTEN_AUTHORIZATION'],
  },
  TRUST: {
    capacities: ['TRUSTEE', 'AUTHORIZED_AGENT'], roles: ['Trustee', 'Managing Trustee', 'Professional Trustee', 'Authorized Agent'],
    authorities: ['TRUST_DEED', 'TRUSTEE_RESOLUTION', 'COURT_ORDER', 'POWER_OF_ATTORNEY'],
  },
  ESTATE: {
    capacities: ['EXECUTOR', 'ADMINISTRATOR', 'AUTHORIZED_AGENT'], roles: ['Executor', 'Administrator', 'Personal Representative', 'Advocate for the Estate'],
    authorities: ['GRANT_OF_PROBATE', 'LETTERS_OF_ADMINISTRATION', 'COURT_ORDER', 'POWER_OF_ATTORNEY'],
  },
  PUBLIC_ENTITY: {
    capacities: ['ATTORNEY_GENERAL_REPRESENTATIVE', 'COUNTY_ATTORNEY', 'AUTHORIZED_PUBLIC_OFFICER', 'AUTHORIZED_AGENT'], roles: ['Attorney-General Representative', 'County Attorney', 'Accounting Officer', 'Authorized Public Officer', 'Head of Legal Services'],
    authorities: ['STATUTORY_AUTHORITY', 'OFFICIAL_APPOINTMENT', 'DELEGATION_INSTRUMENT', 'WRITTEN_AUTHORIZATION'],
  },
  INTERNATIONAL_ORGANIZATION: {
    capacities: ['AUTHORIZED_AGENT', 'OTHER'], roles: ['Head of Mission', 'Country Representative', 'Legal Officer', 'Authorized Organization Representative'],
    authorities: ['FOUNDING_INSTRUMENT', 'DELEGATION_INSTRUMENT', 'POWER_OF_ATTORNEY', 'WRITTEN_AUTHORIZATION'],
  },
  OTHER_REQUIRES_REVIEW: {
    capacities: ['AUTHORIZED_AGENT', 'OTHER'], roles: ['Authorized Representative', 'Office Bearer', 'Legal Representative'],
    authorities: ['ENABLING_INSTRUMENT', 'COURT_ORDER', 'POWER_OF_ATTORNEY', 'WRITTEN_AUTHORIZATION'],
  },
};

const title = (value) => value.split('_').map((part) => part[0] + part.slice(1).toLowerCase()).join(' ');

export const rulesForClientType = (clientType) => REPRESENTATIVE_RULES[clientType] || REPRESENTATIVE_RULES.OTHER_REQUIRES_REVIEW;
export const roleOptionsForClientType = (clientType) => rulesForClientType(clientType).roles.map((value) => option(value));
export const authorityOptionsForClientType = (clientType) => rulesForClientType(clientType).authorities.map((value) => option(value, title(value)));
export const capacityOptionsForClientType = (clientType, metadataOptions = []) => {
  const allowed = new Set(rulesForClientType(clientType).capacities);
  return metadataOptions.filter(({ value }) => allowed.has(value));
};
