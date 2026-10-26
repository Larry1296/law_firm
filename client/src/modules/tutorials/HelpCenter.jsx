import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import useAuth from '@/core/hooks/useAuth';
import Card from '@/components/ui/Card';
import VideoPlayer from './VideoPlayer';
import { tutorials, formatTime, helpBase } from './api';
const message = e => e.userMessage || e.message || 'Unable to load tutorials.';
export function TutorialCard({
  tutorial,
  base,
  search = ''
}) {
  const chapter = search && tutorial.chapters.find(c => c.title.toLowerCase().includes(search.toLowerCase()));
  return <Card className='overflow-hidden'>
<Link className='block p-4 space-y-2 focus-visible:outline' to={`${base}/${tutorial.id}${chapter ? `?t=${chapter.start}` : ''}`}>
    {tutorial.thumbnail ? <img loading='lazy' referrerPolicy='no-referrer' className='aspect-video object-cover w-full rounded-lg' src={tutorial.thumbnail} alt='' /> : <div className='aspect-video bg-black/10 grid place-content-center rounded-lg'>▶ Video tutorial</div>}
    <p className='text-sm'>{tutorial.category_name}{tutorial.featured ? ' · Featured' : ''}</p>
<h2 className='font-semibold text-lg'>{tutorial.title}</h2>
    <p>{formatTime(tutorial.duration)} · {tutorial.chapters.length} chapters · {tutorial.tutorial_type === 'complete' ? 'Complete guide' : 'Feature guide'}</p>
    {chapter && <p>Chapter: {chapter.title} · {formatTime(chapter.start)}</p>}
    {tutorial.progress && <p>{tutorial.progress.completed ? 'Completed' : `Resume from ${formatTime(tutorial.progress.position)}`} · {Math.round(tutorial.progress.percentage)}% watched</p>}
  </Link>
</Card>;
}
export default function HelpCenter() {
  const {
      user
    } = useAuth(),
    location = useLocation(),
    base = helpBase(location.pathname);
  const [search, setSearch] = useState(''),
    [category, setCategory] = useState(''),
    [page, setPage] = useState(1);
  const [data, setData] = useState(null),
    [categories, setCategories] = useState([]),
    [recent, setRecent] = useState([]),
    [featured, setFeatured] = useState([]),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    Promise.all([tutorials.categories(), tutorials.recent(), tutorials.featured()]).then(([c, r, f]) => {
      if (active) {
        setCategories(c);
        setRecent(r.results);
        setFeatured(f.results);
      }
    }).catch(e => { if (e?.isActionCancelled) return;
      if (active) setError(message(e));
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setData(null);
      setError('');
      tutorials.list({
        search,
        category,
        page
      }).then(r => {
        if (active) setData(r);
      }).catch(e => { if (e?.isActionCancelled) return;
        if (active) setError(message(e));
      });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, category, page]);
  return <section className='p-4 sm:p-6 space-y-6 max-w-7xl mx-auto'>
    <div className='flex flex-wrap items-center justify-between gap-4'>
<h1 className='text-2xl font-bold'>Help & Video Tutorials</h1>{user?.role === 'PLATFORM_ADMIN' && <Link className='underline' to={`${base}/manage`}>Manage tutorials</Link>}</div>
    <p>Learn at your own pace with complete platform guides and focused feature tutorials.</p>
    <div className='flex flex-wrap gap-4'>
<label className='flex-1 min-w-48'>Search tutorials<input className='block w-full p-3 border rounded-lg bg-transparent' value={search} onChange={e => {
          setSearch(e.target.value);
          setPage(1);
        }} placeholder='Search titles, chapters, or features' />
</label>
<label>Category<select className='block p-3 border rounded-lg bg-[color:var(--surface)]' value={category} onChange={e => {
          setCategory(e.target.value);
          setPage(1);
        }}>
<option value=''>All categories</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
</label>
</div>
    {!search && !category && featured.length > 0 && <section className='space-y-3'>
      <h2 className='text-xl font-semibold'>Featured platform guides</h2>
      <div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-4'>{featured.slice(0, 3).map(t => <TutorialCard key={t.id} tutorial={t} base={base} />)}</div>
    </section>}
    {!search && !category && recent.length > 0 && <section className='space-y-3'>
<h2 className='text-xl font-semibold'>Recently watched · Continue learning</h2>
<div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-4'>{recent.slice(0, 3).map(t => <TutorialCard key={t.id} tutorial={t} base={base} />)}</div>
</section>}
    {error && <p role='alert'>{error}</p>}{!data && !error && <p role='status'>Loading tutorials…</p>}
    {data && <>
<h2 className='text-xl font-semibold'>{search || category ? 'Search results' : 'Recommended for your role'}</h2>{!data.results.length && <Card className='p-6'>No tutorials are available for these filters. Try another search or check back later.</Card>}<div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-4'>{[...data.results].sort((a, b) => Number(b.featured) - Number(a.featured)).map(t => <TutorialCard key={t.id} tutorial={t} base={base} search={search} />)}</div>
<div className='flex gap-4'>
<button disabled={!data.previous} onClick={() => setPage(p => p - 1)}>Previous</button>
<span>Page {page}</span>
<button disabled={!data.next} onClick={() => setPage(p => p + 1)}>Next</button>
</div>
</>}
  </section>;
}
export function TutorialDetail() {
  const { id } = useParams();
  return <TutorialDetailContent key={id} />;
}
function TutorialDetailContent() {
  const {
      id
    } = useParams(),
    [params] = useSearchParams();
  const [tutorial, setTutorial] = useState(null),
    [error, setError] = useState(''),
    [position, setPosition] = useState(0),
    [seek, setSeek] = useState(() => {
      const time = Number(params.get('t'));
      return params.has('t') && Number.isFinite(time) && time >= 0 ? {time} : null;
    });
  const activeRef = useRef(null);
  useEffect(() => {
    let live = true;
    tutorials.get(id).then(t => {
      if (live) setTutorial(t);
    }).catch(e => { if (e?.isActionCancelled) return;
      if (live) setError(message(e));
    });
    return () => {
      live = false;
    };
  }, [id]);
  const active = tutorial?.chapters.filter(c => c.start <= position && (c.end == null || position < c.end)).at(-1);
  useEffect(() => {
    const item = activeRef.current;
    const list = item?.parentElement;
    if (!item || !list) return;
    const row = item.getBoundingClientRect(), panel = list.getBoundingClientRect();
    if (row.top < panel.top) list.scrollTop -= panel.top - row.top;
    else if (row.bottom > panel.bottom) list.scrollTop += row.bottom - panel.bottom;
  }, [active?.id]);
  if (error) return <p role='alert' className='p-6'>{error}</p>;
  if (!tutorial) return <p role='status' className='p-6'>Loading tutorial…</p>;
  const choose = time => {
    setSeek({
      time,
      nonce: Date.now()
    });
    setPosition(time);
  };
  const requested = Number(params.get('t'));
  return <section className='p-4 sm:p-6 max-w-7xl mx-auto space-y-5'>
<h1 className='text-2xl font-bold'>{tutorial.title}</h1>
<p>{tutorial.category_name} · {formatTime(tutorial.duration)}</p>
    <div className='flex flex-wrap gap-4'>{tutorial.progress?.position > 0 && <button className='underline' onClick={() => choose(tutorial.progress.position)}>Resume from {formatTime(tutorial.progress.position)}</button>}{params.has('t') && Number.isFinite(requested) && requested >= 0 && (!tutorial.duration || requested <= tutorial.duration) && <button className='underline' onClick={() => choose(requested)}>Go to {formatTime(requested)}</button>}</div>
    <div className='grid lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] gap-5 items-start'>
<VideoPlayer key={id} tutorial={tutorial} seek={seek} onPosition={setPosition} />
<Card className='p-4'>
<details open>
<summary className='font-semibold cursor-pointer p-2'>Chapters ({tutorial.chapters.length})</summary>
<ol className='max-h-96 overflow-y-auto space-y-2'>{tutorial.chapters.map(c => <li key={c.id} ref={active?.id === c.id ? activeRef : null}>
<button aria-current={active?.id === c.id ? 'true' : undefined} className={`w-full text-left rounded-lg p-3 ${active?.id === c.id ? 'bg-blue-600 text-white' : 'hover:bg-black/10'}`} onClick={() => choose(c.start)}>
<span className='font-mono'>{formatTime(c.start)}</span> — {c.title}{c.description && <span className='block text-sm'>{c.description}</span>}</button>
</li>)}</ol>
</details>
</Card>
</div>
<Card className='p-5 whitespace-pre-wrap'>{tutorial.description}</Card>
  </section>;
}
