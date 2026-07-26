const EMPTY_VALUES = new Set(['', null, undefined]);

export const individualAccessTypeForMode = (mode) =>
  mode === 'assisted' ? 'ASSISTED' : 'PORTAL_ENABLED';

const trim = (value) => (typeof value === 'string' ? value.trim() : value);
const collapse = (value) => {
  const next = trim(value);
  return next ? String(next).replace(/\s+/g, ' ') : next;
};
const lower = (value) => {
  const next = trim(value);
  return next ? String(next).toLowerCase() : next;
};
const upper = (value) => {
  const next = trim(value);
  return next ? String(next).toUpperCase() : next;
};
const clean = (payload) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => !EMPTY_VALUES.has(value)),
  );
const isValidEmail = (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const normalizePhone = (value) => {
  const next = trim(value)?.replace(/[\s-]/g, '');
  if (!next) return next;
  if (/^0[17]\d{8}$/.test(next)) return `+254${next.slice(1)}`;
  if (/^254[17]\d{8}$/.test(next)) return `+${next}`;
  return next;
};
const isValidPhone = (value) => !value || /^\+?[1-9]\d{7,14}$/.test(normalizePhone(value));
const parseDateOnly = (value) => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getIndividualClientAge = (dateOfBirth) => {
  const dob = parseDateOnly(dateOfBirth);
  if (!dob) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const birthdayPassed =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!birthdayPassed) age -= 1;
  return age;
};

export const isMinorIndividualClient = (dateOfBirth) => {
  const age = getIndividualClientAge(dateOfBirth);
  return age !== null && age < 18;
};

export const buildIndividualClientPayload = (formData, mode = 'portal') => {
  const accessType = individualAccessTypeForMode(mode);
  const identificationType = formData.identification_type || (formData.passport_number ? 'PASSPORT' : 'NATIONAL_ID');
  const identificationNumber = upper(
    formData.identification_number ||
      (identificationType === 'PASSPORT' ? formData.passport_number : formData.national_id),
  );
  const addressDescription = trim(formData.address_description || formData.full_address);

  return clean({
    full_name: collapse(formData.full_name),
    preferred_name: collapse(formData.preferred_name),
    email: lower(formData.email),
    phone_number: normalizePhone(formData.phone_number),
    access_type: accessType,
    identification_type: identificationType,
    identification_number: identificationNumber,
    identification_country: trim(formData.identification_country) || (identificationType === 'NATIONAL_ID' ? 'Kenya' : ''),
    identification_expiry_date: formData.identification_expiry_date || null,
    identification_document_reference: trim(formData.identification_document_reference),
    national_id: identificationType === 'NATIONAL_ID' ? identificationNumber : '',
    passport_number: identificationType === 'PASSPORT' ? identificationNumber : '',
    kra_pin: upper(formData.kra_pin),
    date_of_birth: formData.date_of_birth || null,
    gender: formData.gender || null,
    marital_status: formData.marital_status || null,
    occupation_status: formData.occupation_status,
    occupation: trim(formData.occupation),
    employer: trim(formData.employer),
    business_name: trim(formData.business_name),
    nationality: trim(formData.nationality),
    citizenship: trim(formData.citizenship),
    postal_address: trim(formData.postal_address),
    preferred_language: trim(formData.preferred_language),
    preferred_contact_channel: formData.preferred_contact_channel || null,
    disability_or_accessibility_notes: trim(formData.disability_or_accessibility_notes),
    guardian_name: collapse(formData.guardian_name),
    guardian_relationship: trim(formData.guardian_relationship),
    guardian_phone: normalizePhone(formData.guardian_phone),
    guardian_email: lower(formData.guardian_email),
    country: trim(formData.country),
    county_or_region: trim(formData.county_or_region || formData.county),
    city_or_town: trim(formData.city_or_town || formData.city),
    street_or_locality: trim(formData.street_or_locality || formData.street),
    postal_code: trim(formData.postal_code),
    address_description: addressDescription,
    full_address: addressDescription,
    next_of_kin_name: collapse(formData.next_of_kin_name),
    next_of_kin_relationship: trim(formData.next_of_kin_relationship),
    next_of_kin_phone: normalizePhone(formData.next_of_kin_phone),
    next_of_kin_email: lower(formData.next_of_kin_email),
    next_of_kin_identification_number: upper(formData.next_of_kin_identification_number || formData.next_of_kin_national_id),
    next_of_kin_address: trim(formData.next_of_kin_address || formData.next_of_kin_physical_address),
    privacy_notice_version: trim(formData.privacy_notice_version),
    personal_data_source: formData.personal_data_source,
    notes: trim(formData.notes),
  });
};

export const validateIndividualClientForm = (formData, mode = 'portal') => {
  const errors = {};
  const isPortal = individualAccessTypeForMode(mode) === 'PORTAL_ENABLED';
  const identificationType = formData.identification_type || (formData.passport_number ? 'PASSPORT' : 'NATIONAL_ID');
  const identificationNumber = trim(formData.identification_number || (identificationType === 'PASSPORT' ? formData.passport_number : formData.national_id));

  if (!collapse(formData.full_name)) errors.full_name = 'Full legal name is required.';
  if (!identificationType) errors.identification_type = 'Identification type is required.';
  if (!identificationNumber) errors.identification_number = 'Identification number is required.';
  if (!trim(formData.identification_country) && identificationType !== 'NATIONAL_ID') errors.identification_country = 'Identification country is required.';
  if (identificationType === 'PASSPORT' && !formData.identification_expiry_date) errors.identification_expiry_date = 'Passport expiry date is required.';
  if (identificationType === 'PASSPORT' && formData.identification_expiry_date) {
    const expiry = parseDateOnly(formData.identification_expiry_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!expiry) errors.identification_expiry_date = 'Enter a valid passport expiry date.';
    else if (expiry <= today) errors.identification_expiry_date = 'Passport expiry date must be in the future.';
  }
  if (!formData.date_of_birth) errors.date_of_birth = 'Date of birth is required.';
  if (formData.date_of_birth) {
    const dob = parseDateOnly(formData.date_of_birth);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!dob) errors.date_of_birth = 'Enter a valid date of birth.';
    else if (dob >= today) errors.date_of_birth = 'Date of birth must be in the past.';
  }
  if (!trim(formData.nationality)) errors.nationality = 'Nationality is required.';
  if (!formData.occupation_status) errors.occupation_status = 'Occupation status is required.';
  if (formData.occupation_status === 'EMPLOYED' && !trim(formData.employer)) errors.employer = 'Employer is required for employed clients.';
  if (formData.occupation_status === 'BUSINESS_OWNER' && !trim(formData.business_name)) errors.business_name = 'Business name is required for business owners.';
  if (!trim(formData.email) && !trim(formData.phone_number)) errors.contact_method = 'At least one reliable contact method is required.';
  if (isPortal && !trim(formData.email)) errors.email = 'Portal individual clients require a login email address.';
  if (!isValidEmail(trim(formData.email))) errors.email = 'Enter a valid email address.';
  if (isPortal && !trim(formData.phone_number)) errors.phone_number = 'Portal individual clients require a phone number.';
  if (!isValidPhone(formData.phone_number)) errors.phone_number = 'Enter a valid Kenyan or international phone number.';
  if (!trim(formData.country)) errors.country = 'Residential country is required.';
  if (!trim(formData.city_or_town || formData.city) && !trim(formData.street_or_locality || formData.street)) errors.city_or_town = 'Residential city, town or locality is required.';
  if (!trim(formData.address_description || formData.full_address)) errors.address_description = 'Residential address description is required.';
  if (!formData.preferred_contact_channel) errors.preferred_contact_channel = 'Preferred contact channel is required.';
  if (formData.preferred_contact_channel === 'EMAIL' && !trim(formData.email)) errors.preferred_contact_channel = 'Email is required when preferred channel is email.';
  if (['PHONE', 'SMS', 'WHATSAPP'].includes(formData.preferred_contact_channel) && !trim(formData.phone_number)) errors.preferred_contact_channel = 'Phone number is required for this preferred channel.';
  if (!trim(formData.privacy_notice_version)) errors.privacy_notice_version = 'Privacy notice version is required.';
  if (!formData.personal_data_source) errors.personal_data_source = 'Personal data source is required.';
  if (isMinorIndividualClient(formData.date_of_birth)) {
    if (!collapse(formData.guardian_name)) errors.guardian_name = 'Guardian or legal representative name is required for minor clients.';
    if (!trim(formData.guardian_phone) && !trim(formData.guardian_email)) errors.guardian_contact = 'Guardian phone or guardian email is required for minor clients.';
  }
  if (!isValidPhone(formData.guardian_phone)) errors.guardian_phone = 'Enter a valid guardian phone number.';
  if (!isValidEmail(trim(formData.guardian_email))) errors.guardian_email = 'Enter a valid guardian email address.';
  if (!isValidEmail(trim(formData.next_of_kin_email))) errors.next_of_kin_email = 'Enter a valid next-of-kin email address.';

  return { isValid: Object.keys(errors).length === 0, errors };
};
