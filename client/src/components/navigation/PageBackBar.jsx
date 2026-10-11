import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { historyIndex, pageAt, recordPage } from '@/core/navigation/pageHistory';
import { workspaceBase } from '@/modules/notifications/utils/notificationLinks';
import { labelFromPath, parentPath } from '@/core/navigation/backTarget';

const TITLE_LIMIT = 48;

const pageTitle = (container) => {
  const heading = container?.querySelector('h1') || container?.querySelector('h2');
  const text = heading?.textContent.replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > TITLE_LIMIT ? `${text.slice(0, TITLE_LIMIT - 1)}…` : text;
};

/**
 * The back control above every dashboard page. It names where it leads: the page
 * the user came from in this workspace, or — when the page was opened directly — its section.
 */
export default function PageBackBar({ inset = true }) {
  const location = useLocation();
  const navigate = useNavigate();
  const index = historyIndex();

  // Remember this page and, once it has rendered, its heading.
  useEffect(() => {
    recordPage(index, { path: `${location.pathname}${location.search}` });
    const container = document.querySelector('[data-page-content]');
    if (!container) return undefined;
    let frame = 0;
    const capture = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const title = pageTitle(container);
        if (title) recordPage(index, { title });
      });
    };
    capture();
    const observer = new MutationObserver(capture);
    observer.observe(container, { childList: true, subtree: true, characterData: true });
    // Lazy pages and their data settle quickly; stop watching after that.
    const stop = setTimeout(() => observer.disconnect(), 5000);
    return () => { observer.disconnect(); clearTimeout(stop); cancelAnimationFrame(frame); };
  }, [index, location.pathname, location.search]);

  const base = workspaceBase(location.pathname);
  const previous = index > 0 ? pageAt(index - 1) : null;
  const cameFromWorkspace = Boolean(base && previous?.path?.startsWith(`${base}/`));

  let target;
  if (cameFromWorkspace) {
    target = { label: previous.title || labelFromPath(previous.path), go: () => navigate(-1) };
  } else {
    const parent = parentPath(location.pathname);
    if (!parent) return null;
    target = { label: labelFromPath(parent), go: () => navigate(parent) };
  }

  return (
    <nav aria-label='Back' className={`print:hidden ${inset ? 'px-4 pt-4 sm:px-6' : 'mb-4'}`}>
      <button
        type='button'
        onClick={target.go}
        className='-ml-2 inline-flex max-w-full items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-[color:var(--form-primary)] transition hover:bg-[color:color-mix(in_srgb,var(--form-primary)_12%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--form-primary)]'
      >
        <ArrowLeft size={16} aria-hidden='true' className='shrink-0' />
        <span className='truncate'>Back to {target.label}</span>
      </button>
    </nav>
  );
}
