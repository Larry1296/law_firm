import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { tutorials, helpBase } from './api';
export default function ContextualHelp({
  feature
}) {
  const {
    pathname
  } = useLocation();
  const [result, setResult] = useState(null);
  useEffect(() => {
    let live = true;
    if (!feature) return;
    tutorials.list({
      feature
    }).catch(() => null).then(data => {
      if (live) setResult(data?.results?.[0] || null);
    });
    return () => {
      live = false;
    };
  }, [feature]);
  if (!result) return null;
  const chapter = result.chapters.find(c => c.feature === feature);
  return <Link className='text-sm underline' to={`${helpBase(pathname)}/${result.id}${chapter ? `?t=${chapter.start}` : ''}`}>Watch tutorial: {chapter?.title || result.title}</Link>;
}
export function WorkspaceHelp() {
  const {
    pathname
  } = useLocation();
  const parts = pathname.split('/');
  const feature = parts.find(p => ['dashboard', 'clients', 'cases', 'documents', 'calendar', 'finance', 'billing', 'settings', 'employees'].includes(p));
  if (pathname.includes('/help')) return null;
  return <div className='px-4 py-2 flex flex-wrap gap-4 print:hidden'>
<Link className='text-sm underline' to={helpBase(pathname)}>Help & Video Tutorials</Link>
<ContextualHelp key={pathname} feature={feature} />
</div>;
}
