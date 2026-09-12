import React from 'react';
import { Field, SelectField, StepPanel } from './Fields';
import {
  authorityOptionsForClientType,
  capacityOptionsForClientType,
  roleOptionsForClientType,
} from './representativeOptions';

export default function RepresentativesStep({ state, metadata, setList }) {
  const clientType = state.client.client_type;
  const capacityOptions = capacityOptionsForClientType(clientType, metadata.representative_categories);
  const roleOptions = roleOptionsForClientType(clientType);
  const authorityOptions = authorityOptionsForClientType(clientType);
  const update = (index, value) => setList(
    state.representatives.map((representative, position) => position === index ? { ...representative, ...value } : representative),
  );
  const addRepresentative = () => setList([...state.representatives, {
    full_legal_name: '',
    representative_category: capacityOptions[0]?.value || '',
    role_title: roleOptions[0]?.value || '',
    authority_type: '',
    authority_document_reference: '',
    is_primary: state.representatives.length === 0,
    is_portal_contact: false,
    is_authorized_to_give_instructions: true,
  }]);

  return <StepPanel title='Representatives / authority' description='Choose roles and authority sources applicable to this client’s legal form.'>
    <div className='space-y-4'>{state.representatives.map((representative,index)=><div key={index} className='grid gap-3 rounded-lg border p-3 md:grid-cols-2'>
      <Field label='Full legal name' required value={representative.full_legal_name} onChange={(value)=>update(index,{full_legal_name:value})}/>
      <SelectField label='Legal capacity' required value={representative.representative_category} onChange={(value)=>{ const capacityLabel=capacityOptions.find((item)=>item.value===value)?.label; update(index,{representative_category:value,role_title:roleOptions.some((item)=>item.value===capacityLabel)?capacityLabel:(roleOptions[0]?.value||'')}); }} options={capacityOptions}/>
      <SelectField label='Role / title' required value={representative.role_title} onChange={(value)=>update(index,{role_title:value})} options={roleOptions}/>
      <Field label='ID / passport' value={representative.national_id_or_passport} onChange={(value)=>update(index,{national_id_or_passport:value})}/>
      <Field label='Email' type='email' value={representative.email} onChange={(value)=>update(index,{email:value})}/>
      <Field label='Phone' value={representative.telephone} onChange={(value)=>update(index,{telephone:value})}/>
      <SelectField label='Authority source' required value={representative.authority_type} onChange={(value)=>update(index,{authority_type:value})} options={authorityOptions}/>
      <Field label='Authority evidence reference' value={representative.authority_document_reference} onChange={(value)=>update(index,{authority_document_reference:value})}/>
      <fieldset className='space-y-3 rounded-xl bg-blue-50/70 p-4 md:col-span-2 dark:bg-blue-950/20'>
        <legend className='px-1 text-sm font-bold'>Permissions and portal access for this representative</legend>
        <Field label='Authorized to give instructions' help='This person may give legally relevant instructions to the firm for this client.' type='checkbox' value={representative.is_authorized_to_give_instructions} onChange={(value)=>update(index,{is_authorized_to_give_instructions:value})}/>
        <Field label='Client portal contact' help='Create or associate the client dashboard login with this representative.' type='checkbox' value={representative.is_portal_contact} onChange={(value)=>update(index,{is_portal_contact:value})}/>
      </fieldset>
      <button type='button' className='text-left text-sm text-red-600' onClick={()=>setList(state.representatives.filter((_,position)=>position!==index))}>Remove representative</button>
    </div>)}</div>
    <button type='button' className='rounded-lg bg-blue-600 px-4 py-2 text-white' onClick={addRepresentative}>Add representative</button>
  </StepPanel>;
}
