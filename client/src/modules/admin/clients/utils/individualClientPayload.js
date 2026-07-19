const EMPTY_VALUES = new Set(['', null, undefined]);

export const individualAccessTypeForMode = (mode) =>
  mode === 'assisted' ? 'ASSISTED_CLIENT' : 'PROSPECT';

const trim = (value) => (typeof value === 'string' ? value.trim() : value);

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

export const buildIndividualClientPayload = (formData, mode = 'portal') => {
  const accessType = individualAccessTypeForMode(mode);

  return clean({
    full_name: trim(formData.full_name),
    first_name: trim(formData.first_name),
    middle_name: trim(formData.middle_name),
    last_name: trim(formData.last_name),
    preferred_name: trim(formData.preferred_name),
    email: lower(formData.email),
    phone_number: trim(formData.phone_number),
    access_type: accessType,
    national_id: trim(formData.national_id),
    passport_number: upper(formData.passport_number),
    kra_pin: upper(formData.kra_pin),
    date_of_birth: formData.date_of_birth || null,
    gender: formData.gender || null,
    marital_status: formData.marital_status || null,
    occupation: trim(formData.occupation),
    employer: trim(formData.employer),
    nationality: trim(formData.nationality) || 'Kenyan',
    citizenship: trim(formData.citizenship) || 'Kenya',
    county_of_residence: trim(formData.county_of_residence),
    physical_address: trim(formData.physical_address),
    postal_address: trim(formData.postal_address),
    preferred_language: trim(formData.preferred_language),
    preferred_contact_channel: formData.preferred_contact_channel || null,
    disability_or_accessibility_notes: trim(formData.disability_or_accessibility_notes),
    country: trim(formData.country) || 'Kenya',
    county: trim(formData.county),
    city: trim(formData.city),
    street: trim(formData.street),
    postal_code: trim(formData.postal_code),
    full_address: trim(formData.full_address),
    next_of_kin_name: trim(formData.next_of_kin_name),
    next_of_kin_relationship: trim(formData.next_of_kin_relationship),
    next_of_kin_phone: trim(formData.next_of_kin_phone),
    next_of_kin_email: lower(formData.next_of_kin_email),
    next_of_kin_national_id: trim(formData.next_of_kin_national_id),
    next_of_kin_physical_address: trim(formData.next_of_kin_physical_address),
    notes: trim(formData.notes),
  });
};

export const validateIndividualClientForm = (formData, mode = 'portal') => {
  const errors = {};
  const isPortal = individualAccessTypeForMode(mode) === 'PROSPECT';

  if (!trim(formData.full_name)) {
    errors.full_name = 'Full legal name is required.';
  }

  if (isPortal && !trim(formData.email)) {
    errors.email = 'Portal individual clients require a login email address.';
  }

  if (!isValidEmail(trim(formData.email))) {
    errors.email = 'Enter a valid email address.';
  }

  if (isPortal && !trim(formData.phone_number)) {
    errors.phone_number = 'Portal individual clients require a phone number.';
  }

  if (!trim(formData.national_id) && !trim(formData.passport_number)) {
    errors.identification = 'Record either a National ID or passport number.';
  }

  if (formData.date_of_birth) {
    const dob = new Date(`${formData.date_of_birth}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(dob.getTime())) {
      errors.date_of_birth = 'Enter a valid date of birth.';
    } else if (dob > today) {
      errors.date_of_birth = 'Date of birth cannot be in the future.';
    }
  }

  const kraPin = upper(formData.kra_pin);
  if (kraPin && kraPin.length < 8) {
    errors.kra_pin = 'Enter a valid KRA PIN.';
  }

  if (!isValidEmail(trim(formData.next_of_kin_email))) {
    errors.next_of_kin_email = 'Enter a valid next-of-kin email address.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
