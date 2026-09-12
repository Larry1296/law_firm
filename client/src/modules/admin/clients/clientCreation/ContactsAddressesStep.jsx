import React from 'react';
import { CountryField, Field, KenyaCountyField, SelectField, StepPanel } from './Fields';
import { roleOptionsForClientType } from './representativeOptions';

const CONTACT_CHANNELS = [
  { value: 'IN_PERSON', label: 'In person' }, { value: 'PHONE', label: 'Phone' },
  { value: 'EMAIL', label: 'Email' }, { value: 'SMS', label: 'SMS' },
  { value: 'WHATSAPP', label: 'WhatsApp' }, { value: 'OTHER', label: 'Other' },
];

export default function ContactsAddressesStep({ state, setSection }) {
  const contact = state.contacts[0] || {};
  const address = state.addresses[0] || {};
  const setContact = (value) => setSection('contacts', [{ ...contact, contact_type: 'PRIMARY', is_primary: true, ...value }]);
  const setAddress = (value) => setSection('addresses', [{ ...address, address_type: 'REGISTERED', is_primary: true, ...value }]);
  const roleOptions = roleOptionsForClientType(state.client.client_type);

  return <StepPanel title='Contacts and addresses' description='Keep organization contact channels separate from the authorized person giving instructions.'>
    <div className='grid gap-4 md:grid-cols-2'>
      <Field label='Contact name' value={contact.full_name} onChange={(value)=>setContact({full_name:value})}/>
      <SelectField label='Role / designation' value={contact.role_or_designation} onChange={(value)=>setContact({role_or_designation:value})} options={roleOptions}/>
      <Field label='Email' type='email' value={contact.email} onChange={(value)=>setContact({email:value})}/>
      <Field label='Phone' value={contact.phone_number} onChange={(value)=>setContact({phone_number:value})}/>
      <SelectField label='Preferred contact channel' value={contact.preferred_channel} onChange={(value)=>setContact({preferred_channel:value})} options={CONTACT_CHANNELS}/>
      <CountryField label='Country' required value={address.country} onChange={(value)=>setAddress({country:value,county:'',city:'',street:''})}/>
      <KenyaCountyField label={address.country === 'Kenya' ? 'County' : 'State / region / county'} country={address.country} value={address.county} onChange={(value)=>setAddress({county:value,city:'',street:''})}/>
      <Field label='City / town' value={address.city} onChange={(value)=>setAddress({city:value})}/>
      <Field label='Street / locality' value={address.street} onChange={(value)=>setAddress({street:value})}/>
      <Field label='Building / plot' value={address.building_or_plot} onChange={(value)=>setAddress({building_or_plot:value})}/>
      <Field label='Full formatted address' required value={address.full_address} onChange={(value)=>setAddress({full_address:value})}/>
    </div>
  </StepPanel>;
}
