import { useEffect, useMemo, useState } from 'react';
import { FileUp, ShieldCheck } from 'lucide-react';

const REFERENCE_FIELDS = [
  ['identification_document_reference', 'Identity document', 'IDENTIFICATION'],
  ['identification_number', 'Identity document', 'IDENTIFICATION'],
  ['kra_pin', 'KRA PIN certificate', 'TAX'],
  ['tax_pin', 'Tax registration certificate', 'TAX'],
  ['business_kra_pin', 'Business KRA PIN certificate', 'TAX'],
  ['proprietor_kra_pin', 'Proprietor KRA PIN certificate', 'TAX'],
  ['registration_document_reference', 'Registration certificate', 'REGISTRATION'],
  ['registration_number', 'Registration certificate', 'REGISTRATION'],
  ['business_registration_number', 'Business registration certificate', 'REGISTRATION'],
  ['partnership_agreement_reference', 'Partnership agreement', 'CONTRACT'],
  ['llp_registration_number', 'LLP registration certificate', 'REGISTRATION'],
  ['director_verification_reference', 'Director identity evidence', 'IDENTIFICATION'],
  ['owner_evidence_reference', 'Beneficial ownership evidence', 'REGISTRATION'],
  ['representative_authority_reference', 'Representative authority / board resolution', 'LEGAL'],
  ['authority_document_reference', 'Authority to act', 'LEGAL'],
  ['contact_national_id_number', 'Authorised representative identity', 'IDENTIFICATION'],
  ['proprietor_identifier', 'Proprietor identity document', 'IDENTIFICATION'],
  ['partner_one_identifier', 'First partner identity document', 'IDENTIFICATION'],
  ['partner_two_identifier', 'Second partner identity document', 'IDENTIFICATION'],
  ['designated_partner_identifier', 'Designated partner identity document', 'IDENTIFICATION'],
  ['trustee_identifier', 'Trustee identity document', 'IDENTIFICATION'],
  ['personal_representative_identifier', 'Personal representative identity document', 'IDENTIFICATION'],
  ['cooperative_officer_identifier', 'Cooperative officer identity document', 'IDENTIFICATION'],
  ['association_official_identifier', 'Association official identity document', 'IDENTIFICATION'],
  ['nonprofit_official_identifier', 'Non-profit official identity document', 'IDENTIFICATION'],
  ['religious_official_identifier', 'Religious official identity document', 'IDENTIFICATION'],
  ['public_officer_identifier', 'Public officer identity document', 'IDENTIFICATION'],
  ['school_representative_identifier', 'School representative identity document', 'IDENTIFICATION'],
  ['international_representative_identifier', 'International organisation representative identity', 'IDENTIFICATION'],
  ['trust_deed_reference', 'Trust deed', 'LEGAL'],
  ['constitution_reference', 'Constitution', 'LEGAL'],
  ['litigation_authority_reference', 'Authority to litigate', 'LEGAL'],
  ['enabling_instrument', 'Enabling instrument', 'LEGAL'],
  ['founding_instrument', 'Founding instrument', 'LEGAL'],
  ['license_number', 'Regulatory licence', 'REGISTRATION'],
  ['probate_number', 'Grant / probate document', 'COURT_ORDER'],
  ['court_reference', 'Court or succession document', 'COURT_ORDER'],
  ['deceased_id_number', 'Deceased person identity record', 'IDENTIFICATION'],
  ['next_of_kin_identification_number', 'Next-of-kin identity document', 'IDENTIFICATION'],
  ['guardian_identification_number', 'Guardian identity document', 'IDENTIFICATION'],
  ['privacy_acknowledgement_reference', 'Privacy notice acknowledgement', 'LEGAL'],
];

export default function KycDocumentUploads({ formData, onChange }) {
  const references = useMemo(() => {
    const seen = new Set();
    return REFERENCE_FIELDS.flatMap(([field, label, documentType]) => {
      const value = String(formData[field] || '').trim();
      const key = `${label}:${value}`;
      if (!value || seen.has(key)) return [];
      seen.add(key);
      return [{ key: field, label, document_type: documentType, source_reference: value }];
    });
  }, [formData]);
  const [uploads, setUploads] = useState({});

  useEffect(() => {
    const selected = references.flatMap((item) => uploads[item.key]?.file ? [{ ...item, ...uploads[item.key] }] : []);
    onChange(selected);
  }, [references, uploads, onChange]);

  const update = (key, values) => setUploads((current) => ({
    ...current,
    [key]: {
      source_copy_type: 'ORIGINAL_INSPECTED', physical_copy_retained: true,
      physical_storage_location: 'KYC drawer', ...(current[key] || {}), ...values,
    },
  }));

  return <section className='space-y-4 rounded-2xl border border-[color:var(--border)] p-5'>
    <div className='flex gap-3'><ShieldCheck className='text-brand-primary'/><div><h3 className='font-semibold'>Optional scanned KYC documents</h3><p className='text-sm text-[color:var(--text-secondary)]'>Physical originals or certified copies may remain in the controlled KYC drawer. Uploading a scan creates a confidential client-file document linked to the reference recorded above. A scan does not itself prove authenticity.</p></div></div>
    {references.length === 0 ? <p className='text-sm text-[color:var(--text-secondary)]'>Enter a document number or reference above and its optional scan upload will appear here.</p> : <div className='space-y-3'>{references.map((item) => {
      const value = uploads[item.key] || {};
      return <div key={item.key} className='rounded-xl border border-[color:var(--border)] p-4'>
        <div className='flex items-center gap-2'><FileUp size={17}/><strong>{item.label}</strong><span className='text-xs text-[color:var(--text-secondary)]'>Reference: {item.source_reference}</span></div>
        <div className='mt-3 grid gap-3 md:grid-cols-2'>
          <input type='file' accept='.pdf,.doc,.docx,.jpg,.jpeg,.png' className='rounded-xl border p-3' onChange={(e) => update(item.key, { file: e.target.files?.[0] || null })}/>
          <select className='rounded-xl border p-3 dark:bg-background-dark' value={value.source_copy_type || 'ORIGINAL_INSPECTED'} onChange={(e) => update(item.key, { source_copy_type: e.target.value })}><option value='ORIGINAL_INSPECTED'>Original inspected and scanned</option><option value='CERTIFIED_COPY'>Certified copy scanned</option><option value='CLIENT_COPY'>Client-supplied copy</option><option value='OFFICIAL_ELECTRONIC'>Official electronic record</option></select>
          <label className='flex items-center gap-2'><input type='checkbox' checked={value.physical_copy_retained ?? true} onChange={(e) => update(item.key, { physical_copy_retained: e.target.checked })}/> Physical copy retained by the firm</label>
          {(value.physical_copy_retained ?? true) && <input className='rounded-xl border p-3 dark:bg-background-dark' placeholder='Physical location, e.g. KYC drawer A / file 104' value={value.physical_storage_location || 'KYC drawer'} onChange={(e) => update(item.key, { physical_storage_location: e.target.value })}/>} 
        </div>
      </div>;
    })}</div>}
  </section>;
}
