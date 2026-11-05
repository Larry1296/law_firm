import { useSyncExternalStore } from 'react';

// The tabs and sections of the tabbed pages this person has opened, so the search box can take them straight to
// "Deadlines, workstream & closing" from anywhere. The page they are on is offered first; for other record pages,
// the one most recently opened of each kind (e.g. the last matter). Kept for this browser tab only.

export const GOTO_SECTION_EVENT = 'sheria:goto-section';
const STORE_KEY = 'sheria:page-sections';

// One entry per kind of page: /admin/cases/<id> and /admin/cases/<other id> are the same kind.
const kindOf = (path) => path.replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}(?=\/|$)/gi, '/:id').replace(/\/\d+(?=\/|$)/g, '/:id');

const read = () => {
  try {
    return JSON.parse(window.sessionStorage.getItem(STORE_KEY) || '{}') || {};
  } catch {
    return {};
  }
};

let pages = read();
const listeners = new Set();

export function publishPageSections({ path, title, entries }) {
  const kind = kindOf(path);
  const previous = pages[kind];
  if (previous && previous.path === path && previous.title === title && JSON.stringify(previous.entries) === JSON.stringify(entries)) return;
  pages = { ...pages, [kind]: { path, title, entries } };
  try {
    window.sessionStorage.setItem(STORE_KEY, JSON.stringify(pages));
  } catch {
    // Search still offers this page's sections while it is open.
  }
  listeners.forEach((listener) => listener());
}

export function usePageSections() {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => pages,
  );
}

// Search results for tabs and sections: this page's first, then the last-opened page of every other kind.
export function matchPageSections(allPages, query, currentPath) {
  const terms = String(query || '').toLowerCase().replace(/[,&]/g, ' ').split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const phrase = terms.join(' ');
  const currentKind = kindOf(currentPath);
  return Object.entries(allPages)
    .filter(([kind, page]) => kind !== currentKind || page.path === currentPath)
    .flatMap(([kind, page]) => page.entries.map((entry) => ({ ...entry, page, here: kind === currentKind })))
    .map((entry) => {
      const name = entry.label.toLowerCase().replace(/[,&]/g, ' ').replace(/\s+/g, ' ');
      const haystack = `${name} ${entry.tab.toLowerCase()} ${entry.page.title.toLowerCase()}`;
      if (!terms.every((term) => haystack.includes(term))) return null;
      const rank = (name.startsWith(phrase) ? 0 : name.includes(phrase) ? 1 : 2) + (entry.here ? 0 : 3);
      return { entry, rank };
    })
    .filter(Boolean)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 8)
    .map(({ entry }) => ({
      key: `s:${entry.page.path}#${entry.id}`,
      title: entry.label,
      detail: entry.here
        ? (entry.isTab ? 'Tab on this page' : `${entry.tab} tab · this page`)
        : `${entry.page.title} · ${entry.isTab ? 'tab' : `${entry.tab} tab`}`,
      to: `${entry.page.path}#${entry.id}`,
      here: entry.here,
      id: entry.id,
    }));
}

// Opening a section on the page already open: the page is told directly, as the address does not change page.
export const gotoSection = (id) => window.dispatchEvent(new CustomEvent(GOTO_SECTION_EVENT, { detail: { id } }));
