import { useEffect, useState } from 'react';
import useAuth from '@/core/hooks/useAuth';
import Card from '@/components/ui/Card';
import TextInput from '@/components/forms/TextInput';
import TextArea from '@/components/forms/TextArea';
import SelectInput from '@/components/forms/SelectInput';
import VideoPlayer from './VideoPlayer';
import { tutorials, parseTime, formatTime } from './api';
const blank = {
  title: '',
  slug: '',
  description: '',
  category: '',
  provider: 'youtube',
  video_reference: '',
  thumbnail: '',
  duration: 0,
  tutorial_type: 'feature',
  status: 'draft',
  featured: false,
  display_order: 0,
  feature: '',
  chapters: [],
  audiences: []
};
const roles = ['ADMIN', 'STAFF', 'OFFICIAL_CLIENT', 'PROSPECT', 'PLATFORM_ADMIN'];
const firmRoles = ['LAWYER', 'SECRETARY', 'ACCOUNTANT', 'HR', 'IT', 'OFFICIAL_CLIENT'];
const features = ['dashboard', 'clients', 'cases', 'documents', 'calendar', 'billing', 'finance', 'settings', 'employees'];
export default function TutorialAdmin() {
  const {
    user
  } = useAuth();
  const [items, setItems] = useState([]),
    [categories, setCategories] = useState([]),
    [form, setForm] = useState(blank),
    [category, setCategory] = useState({
      name: '',
      slug: '',
      description: '',
      display_order: 0,
      is_active: true
    }),
    [status, setStatus] = useState(''),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(null),
    [next, setNext] = useState(null),
    [loading, setLoading] = useState(true);
  const refresh = () => Promise.all([tutorials.list({
    manage: 1
  }), tutorials.categories(true)]).then(([t, c]) => {
    setItems(t.results);
    setNext(t.next ? 2 : null);
    setCategories(c);
  });
  useEffect(() => {
    refresh().catch(e => { if (e?.isActionCancelled) return; return setStatus(e.userMessage || e.message); }).finally(() => setLoading(false));
  }, []);
  if (user?.role !== 'PLATFORM_ADMIN') return <p role='alert'>Platform administrator access is required.</p>;
  const update = (key, value) => setForm(f => ({
    ...f,
    [key]: value
  }));
  const chapter = (index, key, value) => update('chapters', form.chapters.map((c, i) => i === index ? {
    ...c,
    [key]: value
  } : c));
  const move = (index, direction) => {
    const rows = [...form.chapters],
      target = index + direction;
    if (target < 0 || target >= rows.length) return;
    [rows[index], rows[target]] = [rows[target], rows[index]];
    update('chapters', rows);
  };
  const edit = t => {
    setForm({
      ...t,
      chapters: t.chapters.map(c => ({
        ...c,
        time: formatTime(c.start),
        endTime: c.end == null ? '' : formatTime(c.end)
      }))
    });
    setPreview(null);
    setStatus('');
  };
  const save = async e => {
    e.preventDefault();
    setBusy(true);
    setStatus('');
    try {
      const data = {
        ...form,
        duration: Number(form.duration),
        display_order: Number(form.display_order),
        chapters: form.chapters.map((c, i) => ({
          title: c.title,
          description: c.description || '',
          start: parseTime(c.time),
          end: c.endTime ? parseTime(c.endTime) : null,
          display_order: i,
          feature: c.feature || ''
        }))
      };
      for (const field of ['id', 'category_name', 'progress', 'created_at', 'updated_at', 'published_at']) delete data[field];
      const saved = await tutorials.save(form.id, data);
      edit(saved);
      setStatus('Tutorial saved.');
      await refresh();
    } catch (e) { if (e?.isActionCancelled) return;
      setStatus(e.userMessage || e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };
  return <section className='p-4 sm:p-6 max-w-7xl mx-auto space-y-6'>
<h1 className='text-2xl font-bold'>Manage video tutorials</h1>
<p>Publish sanitized demonstration content only. YouTube videos remain accessible outside this application.</p>
    {loading && <p role='status'>Loading tutorials…</p>}<p role='status' className='whitespace-pre-wrap'>{status}</p>
    <Card className='p-4 space-y-3'>
<div className='flex flex-wrap gap-3'>
<button className='underline' onClick={() => {
          setForm({
            ...blank
          });
          setPreview(null);
        }}>New tutorial</button>{items.map(t => <button className='border rounded-lg p-2' key={t.id} onClick={() => edit(t)}>{t.title} · {t.status}</button>)}</div>{next && <button onClick={async () => {
        try {
          const r = await tutorials.list({
            manage: 1,
            page: next
          });
          setItems(v => [...v, ...r.results]);
          setNext(r.next ? next + 1 : null);
        } catch (e) { if (e?.isActionCancelled) return;
          setStatus(e.message);
        }
      }}>Load more tutorials</button>}</Card>
    <form onSubmit={save}>
<Card className='p-5 space-y-5'>
<h2 className='text-xl font-semibold'>{form.id ? 'Edit tutorial' : 'Create tutorial'}</h2>
<div className='grid sm:grid-cols-2 gap-4'>
      <TextInput label='Title' name='title' required value={form.title} onChange={e => update('title', e.target.value)} />
      <TextInput label='Slug' name='slug' required value={form.slug} onChange={e => update('slug', e.target.value)} />
      <SelectInput label='Category' name='category' required value={form.category} onChange={e => update('category', e.target.value)} options={categories.map(c => ({
            value: c.id,
            label: c.name
          }))} />
      <SelectInput label='Video provider' name='provider' value={form.provider} onChange={e => update('provider', e.target.value)} placeholder={null} options={[{
            value: 'youtube',
            label: 'YouTube'
          }, {
            value: 'html5',
            label: 'Approved HTML5 source'
          }]} />
      <TextInput label='YouTube URL / video ID or approved HTTPS video URL' name='video_reference' required value={form.video_reference} onChange={e => update('video_reference', e.target.value)} />
      <TextInput label='Thumbnail HTTPS URL (optional)' name='thumbnail' type='url' value={form.thumbnail} onChange={e => update('thumbnail', e.target.value)} />
      <TextInput label='Duration in seconds (0 if unknown)' name='duration' type='number' min='0' required value={form.duration} onChange={e => update('duration', e.target.value)} />
      <TextInput label='Display order' name='display_order' type='number' min='0' value={form.display_order} onChange={e => update('display_order', e.target.value)} />
      <SelectInput label='Related feature' name='feature' value={form.feature} onChange={e => update('feature', e.target.value)} options={features.map(f => ({
            value: f,
            label: f
          }))} />
      <SelectInput label='Guide type' name='tutorial_type' value={form.tutorial_type} onChange={e => update('tutorial_type', e.target.value)} placeholder={null} options={[{
            value: 'feature',
            label: 'Feature guide'
          }, {
            value: 'complete',
            label: 'Complete platform guide'
          }]} />
      <SelectInput label='Publication status' name='status' value={form.status} onChange={e => update('status', e.target.value)} placeholder={null} options={['draft', 'published', 'archived'].map(v => ({
            value: v,
            label: v
          }))} />
      <label className='flex items-center gap-2'>
<input type='checkbox' checked={form.featured} onChange={e => update('featured', e.target.checked)} />Featured tutorial</label>
    </div>
<TextArea label='Description' name='description' value={form.description} onChange={e => update('description', e.target.value)} />
    <fieldset className='space-y-3'>
<legend className='font-semibold'>Audiences</legend>
<p>No audience rows allows all authenticated users. Within a row both selected roles must match; multiple rows provide alternatives.</p>{form.audiences.map((a, i) => <div className='flex flex-wrap gap-3' key={i}>
<SelectInput label='User role' name={`role-${i}`} value={a.role} onChange={e => update('audiences', form.audiences.map((v, j) => j === i ? {
              ...v,
              role: e.target.value
            } : v))} options={roles.map(r => ({
              value: r,
              label: r
            }))} />
<SelectInput label='Firm role' name={`firm-role-${i}`} value={a.firm_role} onChange={e => update('audiences', form.audiences.map((v, j) => j === i ? {
              ...v,
              firm_role: e.target.value
            } : v))} options={firmRoles.map(r => ({
              value: r,
              label: r
            }))} />
<button type='button' onClick={() => update('audiences', form.audiences.filter((_, j) => i !== j))}>Remove audience</button>
</div>)}<button type='button' className='underline' onClick={() => update('audiences', [...form.audiences, {
            role: '',
            firm_role: ''
          }])}>Add audience</button>
</fieldset>
    <fieldset className='space-y-4'>
<legend className='font-semibold'>Chapters · MM:SS or HH:MM:SS</legend>{form.chapters.map((c, i) => <Card className='p-4 space-y-3' key={i}>
<div className='grid sm:grid-cols-2 gap-3'>
<TextInput label={`Chapter ${i + 1} title`} name={`chapter-${i}`} required value={c.title} onChange={e => chapter(i, 'title', e.target.value)} />
<TextInput label='Start timestamp' name={`start-${i}`} required value={c.time} onChange={e => chapter(i, 'time', e.target.value)} />
<TextInput label='End timestamp (optional)' name={`end-${i}`} value={c.endTime} onChange={e => chapter(i, 'endTime', e.target.value)} />
<SelectInput label='Related feature' name={`feature-${i}`} value={c.feature || ''} onChange={e => chapter(i, 'feature', e.target.value)} options={features.map(f => ({
                value: f,
                label: f
              }))} />
</div>
<TextArea label='Chapter description' name={`description-${i}`} value={c.description || ''} onChange={e => chapter(i, 'description', e.target.value)} />
<div className='flex gap-4'>
<button type='button' disabled={i === 0} onClick={() => move(i, -1)}>Move up</button>
<button type='button' disabled={i === form.chapters.length - 1} onClick={() => move(i, 1)}>Move down</button>
<button type='button' onClick={() => update('chapters', form.chapters.filter((_, j) => j !== i))}>Remove chapter</button>
</div>
</Card>)}<button type='button' className='underline' onClick={() => update('chapters', [...form.chapters, {
            title: '',
            time: '00:00',
            endTime: '',
            description: '',
            feature: ''
          }])}>Add chapter</button>
</fieldset>
    <div className='flex gap-4'>
<button disabled={busy} className='bg-blue-600 text-white px-5 py-3 rounded-lg'>{busy ? 'Saving…' : 'Save tutorial'}</button>
<button type='button' disabled={!form.id} onClick={async () => {
            try { setPreview(await tutorials.get(form.id, true)); }
            catch (e) { if (e?.isActionCancelled) return;  setStatus(e.userMessage || e.message); }
          }}>Preview saved video</button>
</div>{form.id && <p>Changing the video source resets viewing progress. Editing text or chapters preserves progress.</p>}
    </Card>
</form>{preview && <VideoPlayer key={preview.id + preview.video_reference} tutorial={preview} trackProgress={false} />}
    <Card className='p-5'>
<details>
<summary className='font-semibold cursor-pointer'>Manage categories</summary>
<form className='space-y-4 mt-4' onSubmit={async e => {
          e.preventDefault();
          setBusy(true);
          try {
            await tutorials.category(category.id, category);
            setCategory({
              name: '',
              slug: '',
              description: '',
              display_order: 0,
              is_active: true
            });
            await refresh();
            setStatus('Category saved.');
          } catch (e) { if (e?.isActionCancelled) return;
            setStatus(e.userMessage || e.response?.data?.message || e.message);
          } finally {
            setBusy(false);
          }
        }}>
<div className='flex flex-wrap gap-3'>{categories.map(c => <button key={c.id} type='button' className='underline' onClick={() => setCategory(c)}>{c.name}</button>)}</div>
<TextInput label='Category name' name='category-name' required value={category.name} onChange={e => setCategory({
            ...category,
            name: e.target.value
          })} />
<TextInput label='Category slug' name='category-slug' required value={category.slug} onChange={e => setCategory({
            ...category,
            slug: e.target.value
          })} />
<TextArea label='Category description' name='category-description' value={category.description} onChange={e => setCategory({
            ...category,
            description: e.target.value
          })} />
<TextInput label='Category display order' name='category-order' type='number' min='0' value={category.display_order} onChange={e => setCategory({
            ...category,
            display_order: Number(e.target.value)
          })} />
<label>
<input type='checkbox' checked={category.is_active} onChange={e => setCategory({
              ...category,
              is_active: e.target.checked
            })} /> Active</label>
<button className='block underline' disabled={busy}>Save category</button>
<button type='button' onClick={() => setCategory({
            name: '',
            slug: '',
            description: '',
            display_order: 0,
            is_active: true
          })}>New category</button>
</form>
</details>
</Card>
  </section>;
}
