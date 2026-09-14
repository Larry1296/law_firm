export const urgencyOptions = [
  ['NONE', 'No known urgency'], ['COURT_DATE', 'Court date'],
  ['LIMITATION_CONCERN', 'Limitation concern'], ['ARREST_OR_CUSTODY', 'Arrest or custody'],
  ['EVICTION', 'Eviction'], ['OTHER', 'Other urgent issue'],
];

export function emptyEnquiry() {
  return {
    override_received_time: false, received_at: '', received_at_reason: '', visitor_name: '', safe_contact: '',
    enquiry_for: 'SELF', prospective_person_name: '', organisation_name: '',
    visitor_capacity: '', authority_status: 'NOT_REQUIRED', service_category: '',
    related_party_names: '', urgency_type: 'NONE', urgency_note: '',
    critical_date: '', referral_source: '', description: '', privacy_acknowledged: false,
  };
}

export function enquiryPayload(form) {
  const result = {
    ...form,
    related_party_names: form.related_party_names.split(/\r?\n/).map((name) => name.trim()).filter(Boolean),
    organisation_name: form.enquiry_for === 'ORGANISATION' ? form.organisation_name.trim() : '',
    prospective_person_name: form.enquiry_for === 'OTHER' ? form.prospective_person_name.trim() : '',
    visitor_capacity: form.enquiry_for === 'SELF' ? '' : form.visitor_capacity.trim(),
    urgency_note: form.urgency_type === 'NONE' ? '' : form.urgency_note.trim(),
    critical_date: form.critical_date || null,
  };
  delete result.override_received_time;
  if (form.override_received_time && form.received_at) result.received_at = new Date(`${form.received_at}:00+03:00`).toISOString();
  else { delete result.received_at; delete result.received_at_reason; }
  return result;
}

export function validateEnquiry(form, correcting = false) {
  const errors = {};
  for (const [key, label] of Object.entries({ visitor_name: 'Visitor name', safe_contact: 'Safe contact method', service_category: 'Broad legal-service category', description: 'Short description' })) {
    if (!form[key].trim()) errors[key] = `${label} is required.`;
  }
  if (form.description.length > 500) errors.description = 'Use no more than 500 characters.';
  if (form.enquiry_for === 'ORGANISATION' && !form.organisation_name.trim()) errors.organisation_name = 'Organisation name is required.';
  if (form.enquiry_for === 'OTHER' && !form.prospective_person_name.trim()) errors.prospective_person_name = 'Prospective person name is required.';
  if (form.enquiry_for !== 'SELF' && !form.visitor_capacity.trim()) errors.visitor_capacity = 'Relationship or capacity is required.';
  if (!form.enquiry_for) errors.enquiry_for = 'Select who the enquiry is for.';
  if (!form.authority_status || (form.enquiry_for !== 'SELF' && form.authority_status === 'NOT_REQUIRED')) errors.authority_status = 'Select the authority status.';
  if (form.urgency_type !== 'NONE' && !form.urgency_note.trim()) errors.urgency_note = 'A brief urgency note is required.';
  if (form.override_received_time && !form.received_at) errors.received_at = 'Enter the received time or turn off the override.';
  if (form.override_received_time && !correcting && !form.received_at_reason.trim()) errors.received_at_reason = 'A reason is required for an entered received time.';
  if (form.override_received_time && form.received_at && Date.parse(`${form.received_at}:00+03:00`) > Date.now() + 300000) errors.received_at = 'Received time cannot be more than five minutes in the future.';
  if (!correcting && !form.privacy_acknowledged) errors.privacy_acknowledged = 'The visitor must acknowledge the privacy notice.';
  return errors;
}
