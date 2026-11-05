import { CountryField, Field, KenyaCountyField, SelectField } from '@/modules/admin/clients/clientCreation/Fields';
import { roleOptionsForClientType } from '@/modules/admin/clients/clientCreation/representativeOptions';

const ADDRESS_TYPES = {
  INDIVIDUAL: [['HOME', 'Home'], ['WORK', 'Work'], ['POSTAL', 'Postal'], ['SERVICE', 'Address for service'], ['OTHER', 'Other']],
  ORGANISATION: [['REGISTERED', 'Registered office'], ['PRINCIPAL_BUSINESS', 'Principal place of business'], ['POSTAL', 'Postal'], ['BILLING', 'Billing'], ['SERVICE', 'Address for service'], ['OTHER', 'Other']],
};
const CONTACT_TYPES = [['PRIMARY', 'Primary contact'], ['SECONDARY', 'Secondary contact'], ['EMERGENCY', 'Emergency contact / next of kin'], ['BILLING', 'Billing contact'], ['OTHER', 'Other']];
// An individual's contacts are the people close to them; an organisation's are its officers, as in onboarding.
const INDIVIDUAL_RELATIONSHIPS = ['Spouse', 'Parent', 'Child', 'Sibling', 'Next of kin', 'Employer', 'Other'];
const CONTACT_CHANNELS = [['PHONE', 'Phone'], ['SMS', 'SMS'], ['WHATSAPP', 'WhatsApp'], ['EMAIL', 'Email'], ['IN_PERSON', 'In person'], ['OTHER', 'Other']];
const options = (pairs) => pairs.map(([value, label]) => ({ value, label }));

// The full address written from its parts in the usual Kenyan order, e.g.
// "Mutiso Plaza, Ngei Road, Machakos, Machakos County, P.O. Box 123-90100". The country is added outside Kenya.
const composeAddress = (values) => {
  const box = String(values.postal_address || '').trim().replace(/^(p\.?\s*o\.?\s*)?box\s*/i, '');
  const code = String(values.postal_code || '').trim();
  return [
    values.building_or_plot, values.street, values.city,
    values.county ? `${values.county} County` : '',
    box ? `P.O. Box ${box}${code ? `-${code}` : ''}` : code,
    values.country && values.country !== 'Kenya' ? values.country : '',
  ].map((part) => String(part || '').trim()).filter(Boolean).join(', ');
};
const ADDRESS_PARTS = ['building_or_plot', 'street', 'city', 'county', 'postal_address', 'postal_code', 'country'];

// The address and contact fields, shared by client creation and the client's record.
export function AddressFields({ values, set: setValues, isIndividual, required = true }) {
  // Until the full address is typed by hand, it follows the parts as they are filled in.
  const set = (changes) => {
    if ('full_address' in changes) {
      setValues({ ...changes, _fullAddressTyped: Boolean(String(changes.full_address).trim()) });
      return;
    }
    const next = { ...values, ...changes };
    const follows = !values._fullAddressTyped && Object.keys(changes).some((key) => ADDRESS_PARTS.includes(key));
    setValues(follows ? { ...changes, full_address: composeAddress(next) } : changes);
  };
  return (
    <>
            <SelectField label='Type of address' required={required} value={values.address_type} onChange={(value) => set({ address_type: value })} options={options(ADDRESS_TYPES[isIndividual ? 'INDIVIDUAL' : 'ORGANISATION'])} />
            <CountryField label='Country' required={required} value={values.country} onChange={(value) => set({ country: value, county: '', city: '', street: '' })} />
            <KenyaCountyField label={values.country === 'Kenya' ? 'County' : 'State / region / county'} country={values.country} value={values.county} onChange={(value) => set({ county: value, city: '', street: '' })} />
            <Field label='City / town' value={values.city} onChange={(value) => set({ city: value })} />
            <Field label='Street / locality' value={values.street} onChange={(value) => set({ street: value })} />
            <Field label='Building / plot' value={values.building_or_plot} onChange={(value) => set({ building_or_plot: value })} />
            <Field label='P.O. Box' value={values.postal_address} onChange={(value) => set({ postal_address: value })} />
            <Field label='Postal code' value={values.postal_code} onChange={(value) => set({ postal_code: value })} />
            <Field label='Full formatted address' required={required} value={values.full_address} onChange={(value) => set({ full_address: value })} />
    </>
  );
}

export function ContactFields({ values, set, isIndividual, clientType, required = true }) {
  const roleOptions = isIndividual ? INDIVIDUAL_RELATIONSHIPS.map((value) => ({ value, label: value })) : roleOptionsForClientType(clientType);
  return (
    <>
            <SelectField label='Type of contact' required value={values.contact_type} onChange={(value) => set({ contact_type: value })} options={options(CONTACT_TYPES)} />
            <Field label='Contact name' required={required} value={values.full_name} onChange={(value) => set({ full_name: value })} />
            <SelectField label={isIndividual ? 'Relationship to the client' : 'Role / designation'} value={values.role_or_designation} onChange={(value) => set({ role_or_designation: value })} options={roleOptions} />
            <Field label='Phone' value={values.phone_number} onChange={(value) => set({ phone_number: value })} />
            <Field label='Email' type='email' value={values.email} onChange={(value) => set({ email: value })} />
            <SelectField label='Preferred contact channel' value={values.preferred_channel} onChange={(value) => set({ preferred_channel: value })} options={options(CONTACT_CHANNELS)} />
    </>
  );
}
