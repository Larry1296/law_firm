import { QueryClient } from '@tanstack/react-query';

// Every screen keeps itself current: after any change it makes, when the user comes back to it,
// and on a short interval while it is open, so changes made by colleagues appear too.
export const LIVE_REFRESH_MS = 30 * 1000;
export const DATA_CHANGED_EVENT = 'sheria:data-changed';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 15 * 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchInterval: LIVE_REFRESH_MS,
      refetchIntervalInBackground: false,
    },
  },
});

const READS = new Set(['get', 'head', 'options']);
// Requests that do not change firm records: signing in, keeping the session, and assistant chat.
const NOT_A_CHANGE = ['/login', '/token/refresh', '/auth/unlock/', '/auth/me/', '/knowledge-base/ask/', '/legal-assistant/', '/assistant/', '/public/'];

export const changesData = (config) => {
  const method = (config?.method || 'get').toLowerCase();
  if (READS.has(method) || config?.skipLiveRefresh) return false;
  return !NOT_A_CHANGE.some((path) => config?.url?.includes(path));
};

// Called once a change is saved: everything on screen refetches, and loaders outside the query cache hear of it.
export const announceDataChanged = () => {
  queryClient.invalidateQueries();
  window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
};
