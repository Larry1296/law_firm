// Empty address and contact records, shared by client creation and the client's record.
export const freshAddress = (isIndividual) => ({ address_type: isIndividual ? 'HOME' : 'REGISTERED', country: 'Kenya', county: '', city: '', street: '', building_or_plot: '', postal_address: '', postal_code: '', full_address: '', is_primary: false });
export const freshContact = () => ({ contact_type: 'EMERGENCY', full_name: '', role_or_designation: '', phone_number: '', email: '', preferred_channel: 'PHONE', is_primary: false });

// Only filled-in fields are sent.
export const filledFields = (values) => Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ''));
