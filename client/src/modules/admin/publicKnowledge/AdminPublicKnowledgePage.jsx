import { useEffect, useState } from 'react';
import { AlertTriangle, Plus, RefreshCw } from 'lucide-react';

import { actOnPublicKnowledge, createPublicKnowledge, listPublicKnowledge, updatePublicKnowledge } from './publicKnowledgeService';

const EMPTY = { title: '', public_category: 'firm_overview', summary: '', body: '', visibility: 'public', source_type: 'public_page', source_url: '', expires_at: '' };

export default function AdminPublicKnowledgePage() {
  const [data, setData] = useState({ results: [], categories: [], statuses: [] });
  const [filters, setFilters] = useState({ search: '', category: '', status: '' });
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [state, setState] = useState({ loading: true, saving: false, error: '' });

  const load = async () => {
    setState((value) => ({ ...value, loading: true, error: '' }));
    try { setData(await listPublicKnowledge(filters)); } catch (error) { setState((value) => ({ ...value, error: error.message || 'Could not load public knowledge.' })); } finally { setState((value) => ({ ...value, loading: false })); }
  };
  useEffect(() => { load(); }, [filters.search, filters.category, filters.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const edit = (item) => { setSelected(item); setForm({ ...EMPTY, ...item, expires_at: item.expires_at?.slice(0, 16) || '' }); };
  const save = async (event) => {
    event.preventDefault(); setState((value) => ({ ...value, saving: true, error: '' }));
    try {
      const payload = { ...form, expires_at: form.expires_at || null };
      const saved = selected ? await updatePublicKnowledge(selected.id, payload) : await createPublicKnowledge(payload);
      setSelected(saved); setForm({ ...EMPTY, ...saved, expires_at: saved.expires_at?.slice(0, 16) || '' }); await load();
    } catch (error) { setState((value) => ({ ...value, error: error.response?.data?.body?.[0] || error.message || 'Could not save.' })); } finally { setState((value) => ({ ...value, saving: false })); }
  };
  const action = async (name) => {
    if (!selected) return;
    if (name === 'publish' && !window.confirm('Confirm that this information is intended for public visitors and contains no confidential information.')) return;
    try { const saved = await actOnPublicKnowledge(selected.id, name, name === 'publish' ? { confirmed: true } : {}); edit(saved); await load(); } catch (error) { setState((value) => ({ ...value, error: error.message || 'Action failed.' })); }
  };
  const editable = !selected || ['draft', 'rejected'].includes(selected.approval_status);

  return <main className='space-y-5 p-4 md:p-6'>
    <div><h1 className='text-2xl font-bold'>Public Website · Chatbot Knowledge</h1><p className='mt-1 text-sm text-text-muted-light dark:text-text-muted-dark'>Control exactly what the firm legal assistant may use for firm-related answers.</p></div>
    <div className='flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100'><AlertTriangle className='shrink-0' size={20}/><p><strong>Only publish information intended for public visitors.</strong> Do not include client, matter, financial, staff-private or confidential information.</p></div>
    {state.error && <p role='alert' className='rounded-lg bg-red-50 p-3 text-sm text-red-800'>{state.error}</p>}
    <div className='grid gap-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(420px,1.2fr)]'>
      <section className='rounded-xl border border-border-light p-4 dark:border-border-dark'>
        <div className='mb-3 flex items-center justify-between'><h2 className='font-bold'>Published-information records</h2><button type='button' onClick={() => { setSelected(null); setForm(EMPTY); }} className='inline-flex items-center gap-1 rounded-lg bg-success px-3 py-2 text-xs font-bold text-white'><Plus size={15}/>New draft</button></div>
        <div className='grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3'><input aria-label='Search public knowledge' value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder='Search' className='rounded-lg border p-2'/><select aria-label='Filter by category' value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className='rounded-lg border p-2'><option value=''>All categories</option>{data.categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><select aria-label='Filter by status' value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className='rounded-lg border p-2'><option value=''>All statuses</option>{data.statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
        <div className='mt-3 space-y-2'>{state.loading ? <p>Loading…</p> : data.results.length ? data.results.map((item) => <button type='button' key={item.id} onClick={() => edit(item)} className='block w-full rounded-lg border p-3 text-left focus-visible:ring-2 focus-visible:ring-success'><span className='font-semibold'>{item.title}</span><span className='mt-1 flex justify-between text-xs text-text-muted-light'><span>{item.category_label}</span><span>{item.status_label} · v{item.version}</span></span></button>) : <p className='py-8 text-center text-sm text-text-muted-light'>No public knowledge items match these filters.</p>}</div>
      </section>
      <section className='rounded-xl border border-border-light p-4 dark:border-border-dark'>
        <h2 className='font-bold'>{selected ? `Version ${selected.version}: ${selected.title}` : 'Create public-information draft'}</h2>
        {!editable && <p className='mt-2 text-sm text-amber-700'>Published or approved content is immutable. Create a revised version to make changes.</p>}
        <form onSubmit={save} className='mt-4 space-y-3'><label className='block text-sm font-semibold'>Title<input required disabled={!editable} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className='mt-1 w-full rounded-lg border p-2 font-normal'/></label><label className='block text-sm font-semibold'>Category<select disabled={!editable} value={form.public_category} onChange={(e) => setForm({ ...form, public_category: e.target.value })} className='mt-1 w-full rounded-lg border p-2 font-normal'>{data.categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className='block text-sm font-semibold'>Short summary<input disabled={!editable} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} className='mt-1 w-full rounded-lg border p-2 font-normal'/></label><label className='block text-sm font-semibold'>Exact public content<textarea required disabled={!editable} rows={9} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className='mt-1 w-full rounded-lg border p-2 font-normal'/></label><label className='block text-sm font-semibold'>Public HTTPS source URL (optional)<input disabled={!editable} type='url' value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} className='mt-1 w-full rounded-lg border p-2 font-normal'/></label><label className='block text-sm font-semibold'>Expires at (optional)<input disabled={!editable} type='datetime-local' value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className='mt-1 w-full rounded-lg border p-2 font-normal'/></label>{editable && <button disabled={state.saving} className='rounded-lg bg-brand-primary px-4 py-2 text-sm font-bold text-white'>{state.saving ? 'Saving…' : 'Save draft'}</button>}</form>
        {selected && <div className='mt-4 flex flex-wrap gap-2 border-t pt-4'>{selected.approval_status === 'draft' && <button onClick={() => action('submit')} className='rounded-lg border px-3 py-2 text-sm'>Submit for approval</button>}{selected.approval_status === 'pending' && <><button onClick={() => action('approve')} className='rounded-lg bg-success px-3 py-2 text-sm font-bold text-white'>Approve</button><button onClick={() => action('reject')} className='rounded-lg border px-3 py-2 text-sm'>Reject</button></>}{selected.approval_status === 'approved' && <button onClick={() => action('publish')} className='rounded-lg bg-success px-3 py-2 text-sm font-bold text-white'>Publish</button>}{selected.approval_status === 'published' && <><button onClick={() => action('revise')} className='inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm'><RefreshCw size={15}/>Create revision</button><button onClick={() => action('withdraw')} className='rounded-lg bg-red-700 px-3 py-2 text-sm font-bold text-white'>Withdraw immediately</button></>}</div>}
        {selected && <section className='mt-5'><h3 className='font-semibold'>Public preview</h3><div className='mt-2 whitespace-pre-wrap rounded-lg bg-background-light p-4 text-sm dark:bg-background-dark'>{selected.body}</div></section>}
      </section>
    </div>
  </main>;
}
