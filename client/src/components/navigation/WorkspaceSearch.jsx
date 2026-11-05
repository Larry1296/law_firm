import { Briefcase, CornerDownLeft, FileSearch, Search, User, UserCog, X, Zap } from 'lucide-react';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import axios from '@/core/api/axios';
import AuthContext from '@/core/store/AuthContext';
import { matchFeatures, useWorkspaceFeatures, workspaceActions } from '@/core/navigation/workspaceFeatures';

// Search the workspace like the search box in a word processor: type what you want to do or find and go straight
// there. It finds the features this person's sidebar shows (and the actions inside those pages) and, from the
// server, records of the firm the workspace belongs to only; a search in Mutiso Advocates never reaches another firm.

// Where each kind of record opens in each workspace. A workspace not listed here has no record pages to open.
const RECORD_PATHS = {
  admin: {
    matter: (row) => `/admin/cases/${row.id}`,
    client: (row) => `/admin/clients/${row.id}`,
    staff: (row) => `/admin/staff/${row.id}?role=${encodeURIComponent(row.role || '')}`,
  },
  lawyer: { matter: (row) => `/lawyer/cases/${row.id}` },
  secretary: { matter: (row) => `/secretary/cases/${row.id}`, client: (row) => `/secretary/clients/${row.id}` },
  client: { matter: (row) => `/client/cases/${row.id}` },
};

const KIND = {
  matter: { label: 'Matters', icon: Briefcase },
  client: { label: 'Clients', icon: User },
  staff: { label: 'Staff', icon: UserCog },
};

const typing = (target) => target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName);

export default function WorkspaceSearch({ className = '' }) {
  const [open, setOpen] = useState(false);
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const base = location.pathname.split('/').filter(Boolean)[0] || '';

  useEffect(() => {
    const onKey = (event) => {
      const shortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
      if (shortcut || (event.key === '/' && !typing(event.target))) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button
        type='button'
        onClick={() => setOpen(true)}
        className={`flex items-center gap-2 px-3 py-2 rounded border border-white/15 text-sm text-white/80 ${className}`}
        aria-label='Search features and records'
        title='Search (Ctrl K)'
      >
        <Search size={16} />
        <span className='hidden md:inline'>Search</span>
        <kbd className='hidden md:inline text-[11px] px-1.5 py-0.5 rounded bg-white/10'>Ctrl K</kbd>
      </button>
      {open && <SearchDialog base={base} firmName={user?.firm?.name || ''} onClose={() => setOpen(false)} />}
    </>
  );
}

function SearchDialog({ base, firmName, onClose }) {
  const navigate = useNavigate();
  const links = useWorkspaceFeatures();
  const [query, setQuery] = useState('');
  const [records, setRecords] = useState({ query: '', rows: [], firm: '' });
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const recordPaths = RECORD_PATHS[base];

  const features = useMemo(() => [...links, ...workspaceActions(base, links)], [links, base]);
  const featureHits = useMemo(() => matchFeatures(features, query), [features, query]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const q = query.trim();
  const lookUp = Boolean(recordPaths) && q.length >= 2;
  useEffect(() => {
    if (!lookUp) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const { data } = await axios.get('/search/', { params: { q }, signal: controller.signal });
        setRecords({ query: q, rows: (data?.results || []).filter((row) => recordPaths[row.kind]), firm: data?.firm || '' });
      } catch {
        if (!controller.signal.aborted) setRecords({ query: q, rows: [], firm: '' });
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [q, lookUp, recordPaths]);
  const recordRows = useMemo(() => (lookUp && records.query === q ? records.rows : []), [lookUp, records, q]);
  const loading = lookUp && records.query !== q;

  const items = useMemo(() => [
    ...featureHits.map((feature) => ({ key: `f:${feature.path}`, group: 'Features', title: feature.name, detail: feature.section || '', icon: feature.icon || Zap, to: feature.path })),
    ...recordRows.map((row) => ({ key: `${row.kind}:${row.id}`, group: KIND[row.kind]?.label || row.kind, title: row.title, detail: row.detail, icon: KIND[row.kind]?.icon || FileSearch, to: recordPaths[row.kind](row) })),
  ], [featureHits, recordRows, recordPaths]);

  const current = Math.min(active, Math.max(items.length - 1, 0));
  useEffect(() => { listRef.current?.querySelector(`[data-index="${current}"]`)?.scrollIntoView?.({ block: 'nearest' }); }, [current]);

  const go = (item) => { if (item) { onClose(); navigate(item.to); } };
  const onKeyDown = (event) => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    else if (event.key === 'ArrowDown') { event.preventDefault(); setActive(Math.min(current + 1, items.length - 1)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(Math.max(current - 1, 0)); }
    else if (event.key === 'Enter') { event.preventDefault(); go(items[current]); }
  };

  const firm = records.firm || firmName;
  const searched = q.length >= 2;
  let lastGroup = '';

  return (
    <div className='fixed inset-0 z-[60] flex items-start justify-center bg-black/50 px-4 pt-[10vh]' onMouseDown={onClose}>
      <div
        role='dialog'
        aria-modal='true'
        aria-label='Search'
        className='w-full max-w-xl overflow-hidden rounded-xl border shadow-2xl'
        style={{ background: 'var(--surface)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className='flex items-center gap-3 border-b px-4' style={{ borderColor: 'var(--border)' }}>
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => { setQuery(event.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
            placeholder={recordPaths && firm ? `Search features, matters and clients in ${firm}` : 'Search features'}
            aria-label='Search'
            role='combobox'
            aria-expanded='true'
            aria-controls='workspace-search-results'
            aria-activedescendant={items[current] ? `workspace-search-${current}` : undefined}
            className='h-14 min-w-0 flex-1 bg-transparent text-base outline-none'
          />
          <button type='button' onClick={onClose} aria-label='Close search' className='p-1 rounded' style={{ color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>
        <ul id='workspace-search-results' ref={listRef} role='listbox' aria-label='Results' className='max-h-[60vh] overflow-y-auto py-2'>
          {items.map((item, index) => {
            const heading = item.group !== lastGroup ? item.group : '';
            lastGroup = item.group;
            const Icon = item.icon;
            return (
              <li key={item.key} role='presentation'>
                {heading && (
                  <p className='px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-widest' style={{ color: 'var(--text-muted)' }}>
                    {heading}{heading !== 'Features' && firm ? ` · ${firm}` : ''}
                  </p>
                )}
                <button
                  type='button'
                  id={`workspace-search-${index}`}
                  data-index={index}
                  role='option'
                  aria-selected={index === current}
                  onMouseMove={() => setActive(index)}
                  onClick={() => go(item)}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left ${index === current ? 'bg-black/5 dark:bg-white/10' : ''}`}
                >
                  <Icon size={17} className='shrink-0' style={{ color: 'var(--text-muted)' }} />
                  <span className='min-w-0 flex-1'>
                    <span className='block truncate font-medium'>{item.title}</span>
                    {item.detail && <span className='block truncate text-xs' style={{ color: 'var(--text-muted)' }}>{item.detail}</span>}
                  </span>
                  {index === current && <CornerDownLeft size={15} className='shrink-0' style={{ color: 'var(--text-muted)' }} />}
                </button>
              </li>
            );
          })}
          {!items.length && (
            <li className='px-4 py-6 text-center text-sm' style={{ color: 'var(--text-muted)' }}>
              {loading ? 'Searching…' : searched
                ? `Nothing found for “${query.trim()}”${recordPaths && firm ? ` in ${firm}` : ''}.`
                : 'Type what you want to do or find.'}
            </li>
          )}
          {loading && items.length > 0 && (
            <li className='px-4 py-2 text-xs' style={{ color: 'var(--text-muted)' }}>Searching {firm || 'the firm'}…</li>
          )}
        </ul>
        <p className='border-t px-4 py-2 text-xs' style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          ↑ ↓ to move · Enter to open · Esc to close{recordPaths && firm ? ` · Records from ${firm} only` : ''}
        </p>
      </div>
    </div>
  );
}
