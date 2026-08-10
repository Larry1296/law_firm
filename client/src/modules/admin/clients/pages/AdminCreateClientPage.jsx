import React, { useEffect, useReducer, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import adminClientsService from '../services/adminClientsService';
import secretaryClientsService from '@/modules/staff/secretary/clients/services/secretaryClientServices';
import ClientCreationSuccessPanel from '../components/ClientCreationSuccessPanel';
import ClientTypeStep from '../clientCreation/ClientTypeStep';
import LegalIdentityStep from '../clientCreation/LegalIdentityStep';
import RegulatoryProfileStep from '../clientCreation/RegulatoryProfileStep';
import RepresentativesStep from '../clientCreation/RepresentativesStep';
import ContactsAddressesStep from '../clientCreation/ContactsAddressesStep';
import DueDiligenceStep from '../clientCreation/DueDiligenceStep';
import PrivacyStep from '../clientCreation/PrivacyStep';
import ReviewCreateStep from '../clientCreation/ReviewCreateStep';
import { buildOnboardingPayload, initialOnboardingState, onboardingReducer } from '../clientCreation/onboardingState';

const steps=['Legal Client','Legal Identity','Sector / Regulatory','Representatives','Contacts / Addresses','Ownership / KYC','Privacy / Evidence','Review'];
export default function AdminCreateClientPage() {
  const location=useLocation(); const navigate=useNavigate(); const secretary=location.pathname.startsWith('/secretary/'); const service=secretary?secretaryClientsService:adminClientsService;
  const [state,dispatch]=useReducer(onboardingReducer,initialOnboardingState); const [metadata,setMetadata]=useState(null); const [step,setStep]=useState(0); const [error,setError]=useState(''); const [saving,setSaving]=useState(false); const [success,setSuccess]=useState(null);
  useEffect(()=>{service.getOnboardingMetadata().then(setMetadata).catch((e)=>setError(e.response?.data?.detail||'Unable to load onboarding metadata.'));},[secretary]);
  if(!metadata)return <main className='p-6'>{error||'Loading client onboarding schema…'}</main>;
  const setObject=(section,value)=>dispatch({type:'SET_SECTION',section,value}); const setList=(section,value)=>dispatch({type:'SET_LIST',section,value});
  const pages=[
    <ClientTypeStep metadata={metadata} value={state.client.client_type} onChange={(value)=>dispatch({type:'RESET_TYPE',value})}/>,
    <LegalIdentityStep state={state} metadata={metadata} setClient={(v)=>setObject('client',v)} setProfile={(v)=>setObject('legal_profile',v)}/>,
    <RegulatoryProfileStep state={state} metadata={metadata} setClient={(v)=>setObject('client',v)} setEducation={(value)=>dispatch({type:'SET_EDUCATION',value})}/>,
    <RepresentativesStep state={state} metadata={metadata} setList={(v)=>setList('representatives',v)}/>,
    <ContactsAddressesStep state={state} setSection={setList}/>,
    <DueDiligenceStep state={state} metadata={metadata} setCDD={(v)=>setObject('due_diligence',v)} setOwners={(v)=>setList('beneficial_owners',v)}/>,
    <PrivacyStep state={state} metadata={metadata} setPrivacy={(v)=>setObject('privacy',v)}/>,
    <ReviewCreateStep state={state} metadata={metadata}/>,
  ];
  const submit=async()=>{setSaving(true);setError('');try{const result=await service.createOnboardingClient(buildOnboardingPayload(state));setSuccess(result);}catch(e){setError(JSON.stringify(e.response?.data||{detail:e.message}));}finally{setSaving(false);}};
  if(success)return <main className='mx-auto max-w-4xl p-6'><ClientCreationSuccessPanel title='Client created as Prospective Client' description='The client was saved. Record proposed instructions and complete conflict clearance before matter opening.' fields={[
    {label:'Legal client name',value:success.client.full_name},{label:'Legal client type',value:success.client.client_type_label},
    {label:'Client / KYC reference',value:success.client.kyc_drawer_reference},{label:'Access mode',value:success.client.access_type},
    {label:'Classification review',value:success.client.classification_review_status},{label:'KYC status',value:success.client.due_diligence?.identity_verification_status},
  ]} onView={()=>navigate(`${secretary?'/secretary':'/admin'}/clients/${success.client.id}`)} onCreateMatter={()=>navigate(`${secretary?'/secretary':'/admin'}/clients/${success.client.id}`)} onCreateAnother={()=>window.location.reload()} onReturnToClients={()=>navigate(`${secretary?'/secretary':'/admin'}/clients`)}/></main>;
  return <main className='mx-auto max-w-6xl space-y-5 p-4 md:p-8'><header><h1 className='text-2xl font-bold'>Create prospective client</h1><p className='text-sm text-[color:var(--text-secondary)]'>Legal capacity, authority, ownership, CDD, and regulatory profile</p></header><ol className='grid grid-cols-2 gap-2 md:grid-cols-8'>{steps.map((name,i)=><li key={name} className={`rounded p-2 text-center text-xs ${i===step?'bg-blue-600 text-white':i<step?'bg-green-100 text-green-900':'bg-gray-100'}`}>{i+1}. {name}</li>)}</ol>{error&&<pre className='whitespace-pre-wrap rounded-lg bg-red-50 p-3 text-sm text-red-800'>{error}</pre>}<form onSubmit={(e)=>{e.preventDefault();step===steps.length-1?submit():setStep(step+1)}}>{React.cloneElement(pages[step],{key:step})}<div className='mt-5 flex justify-between'><button type='button' disabled={step===0} onClick={()=>setStep(step-1)} className='rounded-lg border px-4 py-2 disabled:opacity-40'>Back</button><button type='submit' disabled={saving||(!state.client.client_type&&step===0)} className='rounded-lg bg-blue-600 px-5 py-2 text-white disabled:opacity-40'>{step===steps.length-1?(saving?'Creating…':'Create Prospective Client'):'Continue'}</button></div></form></main>;
}
