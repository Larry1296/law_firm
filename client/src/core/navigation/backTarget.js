import { workspaceBase } from '@/modules/notifications/utils/notificationLinks';

const HOME = { '/platform': 'overview' };
const ID = /^(\d+|[0-9a-f]{8}-[0-9a-f-]{27}|[A-Za-z0-9]*\d[A-Za-z0-9-]{6,})$/i;

const homePath = (base) => `${base}/${HOME[base] || 'dashboard'}`;
const humanize = (segment) => {
  const words = decodeURIComponent(segment).replace(/[-_]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** 'clients/4f…' reads as 'Client', 'conflict-checks' as 'Conflict checks'. */
export function labelFromPath(path) {
  const segments = path.split('?')[0].split('/').filter(Boolean).slice(1);
  if (!segments.length) return 'Dashboard';
  const last = segments[segments.length - 1];
  if (ID.test(last) && segments.length > 1) return humanize(segments[segments.length - 2].replace(/s$/, ''));
  return humanize(last);
}

/** Where a page opened directly should lead: its section, or the dashboard from a section. */
export function parentPath(pathname) {
  const base = workspaceBase(pathname);
  if (!base) return null;
  const segments = pathname.slice(base.length).split('/').filter(Boolean);
  if (!segments.length || pathname === homePath(base)) return null;
  return segments.length === 1 ? homePath(base) : `${base}/${segments[0]}`;
}
