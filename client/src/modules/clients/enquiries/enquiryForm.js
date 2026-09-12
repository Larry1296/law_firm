export const urgencyOptions = [
  ['NONE', 'No known urgency'], ['COURT_DATE', 'Court date'],
  ['LIMITATION_CONCERN', 'Limitation concern'], ['ARREST_OR_CUSTODY', 'Arrest or custody'],
  ['EVICTION', 'Eviction'], ['OTHER', 'Other urgent issue'],
];

export function emptyEnquiry() {
  // Nairobi is UTC+03:00 all year. Keep the local input independent of browser timezone.
  return {
    received_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 16),
    visitor_name: '', safe_contact: '', visitor_type: 'INDIVIDUAL', organisation_name: '',
    service_category: '', related_party_names: '', urgency_type: 'NONE', urgency_note: '',
    critical_date: '', referral_source: '', description: '', privacy_acknowledged: false,
  };
}

export function enquiryPayload(form) {
  return {
    ...form,
    received_at: new Date(`${form.received_at}:00+03:00`).toISOString(),
    related_party_names: form.related_party_names.split(/\r?\n/).map((name) => name.trim()).filter(Boolean),
    organisation_name: form.visitor_type === 'ORGANISATION_REPRESENTATIVE' ? form.organisation_name.trim() : '',
    urgency_note: form.urgency_type === 'NONE' ? '' : form.urgency_note.trim(),
    critical_date: form.critical_date || null,
  };
}

export function validateEnquiry(form) {
  const errors = {};
  for (const [key, label] of Object.entries({ received_at: 'Date/time received', visitor_name: 'Visitor name', safe_contact: 'Safe contact method', service_category: 'Broad legal-service category', description: 'Short description' })) {
    if (!form[key].trim()) errors[key] = `${label} is required.`;
  }
  if (form.description.length > 500) errors.description = 'Use no more than 500 characters.';
  if (form.visitor_type === 'ORGANISATION_REPRESENTATIVE' && !form.organisation_name.trim()) errors.organisation_name = 'Organisation name is required.';
  if (form.urgency_type !== 'NONE' && !form.urgency_note.trim()) errors.urgency_note = 'A brief urgency note is required.';
  if (!form.privacy_acknowledged) errors.privacy_acknowledged = 'The visitor must acknowledge the privacy notice.';
  return errors;
}
