import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axiosInstance from '@/core/api/axios';
import BackLink from '@/components/ui/BackLink';
import useAuth from '@/core/hooks/useAuth';
import adminClientsService from '../services/adminClientsService';

const input = 'w-full rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm dark:border-border-dark';

export default function AdminClientCommunicationPage() {
  const { id } = useParams();
  const { user } = useAuth() || {};
  const [client, setClient] = useState(null);
  const [matterId, setMatterId] = useState('');
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState({ communication_type: 'ATTENDANCE_NOTE', occurred_at: '', participants: [], participants_text: '', direction: 'OUTGOING', channel: 'EMAIL', subject: '', summary: '', advice_given: '', instructions_received: '', instructions_confirmed_in_writing: false, follow_up_required: false, follow_up_deadline: '', responsible_staff: '' });
  useEffect(() => { adminClientsService.getClientDetails(id).then((data) => setClient(data.client)); }, [id]);
  useEffect(() => { if (!matterId) return; axiosInstance.get(`/communications/matters/${matterId}/records/`).then(({ data }) => setRecords(data.communications || [])); }, [matterId]);
  const submit = async (event) => { event.preventDefault(); const payload = { ...form, responsible_staff: form.responsible_staff || user?.id, participants: form.participants_text.split(',').map((x) => x.trim()).filter(Boolean) }; delete payload.participants_text; if (!payload.follow_up_deadline) payload.follow_up_deadline = null; await axiosInstance.post(`/communications/matters/${matterId}/records/`, payload); const { data } = await axiosInstance.get(`/communications/matters/${matterId}/records/`); setRecords(data.communications || []); };
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
  return <div className='space-y-5 p-6'><BackLink label='Back to Client' fallbackPath={`/admin/clients/${id}`} /><div><p className='text-xs font-semibold uppercase tracking-widest text-brand-primary'>Attendance notes</p><h1 className='text-2xl font-bold'>Client Communications</h1></div><select className={input} value={matterId} onChange={(e) => setMatterId(e.target.value)}><option value=''>Select a matter</option>{(client?.cases || []).map((matter) => <option key={matter.id} value={matter.id}>{matter.reference} · {matter.title}</option>)}</select>{matterId && <form className='grid gap-3 rounded-xl border p-5 md:grid-cols-2 dark:border-border-dark' onSubmit={submit}>{['occurred_at','participants_text','subject','summary','advice_given','instructions_received'].map((name) => <input className={input} key={name} name={name} type={name === 'occurred_at' ? 'datetime-local' : 'text'} placeholder={name.replaceAll('_', ' ')} value={form[name]} onChange={change} required={['occurred_at','subject','summary'].includes(name)} />)}<select className={input} name='channel' value={form.channel} onChange={change}>{['IN_PERSON','TELEPHONE','EMAIL','WHATSAPP','CLIENT_PORTAL','LETTER','VIDEO','COURT_ATTENDANCE','OTHER'].map((x) => <option key={x}>{x}</option>)}</select><label className='flex items-center gap-2'><input type='checkbox' name='instructions_confirmed_in_writing' checked={form.instructions_confirmed_in_writing} onChange={change}/>Instructions confirmed in writing</label><button className='rounded-lg bg-brand-primary px-4 py-2 font-semibold text-white'>Save attendance note</button></form>}<div className='space-y-3'>{records.map((record) => <article className='rounded-xl border p-4 dark:border-border-dark' key={record.id}><b>{record.subject}</b><p className='text-sm'>{record.channel} · {new Date(record.occurred_at).toLocaleString()}</p><p className='mt-2'>{record.summary}</p>{record.instructions_received && <p className='mt-2 text-sm'><b>Instructions:</b> {record.instructions_received}</p>}</article>)}</div></div>;
}
