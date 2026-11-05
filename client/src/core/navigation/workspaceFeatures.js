import { useEffect, useSyncExternalStore } from 'react';

// The features the search box offers are exactly the pages this person's sidebar shows: each sidebar publishes the
// links it decided to show (after role, permission and subscription checks), so search never offers a page the
// person cannot open.
let published = [];
const listeners = new Set();

const emit = () => listeners.forEach((listener) => listener());

export function publishWorkspaceFeatures(links) {
  published = (links || []).map(({ name, path, section, icon }) => ({ name, path, section, icon: icon?.props ? undefined : icon }));
  emit();
}

export function usePublishFeatures(links) {
  const key = (links || []).map((link) => `${link.name}|${link.path}`).join(';');
  useEffect(() => {
    publishWorkspaceFeatures(links);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

export function useWorkspaceFeatures() {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => published,
  );
}

// Other words people use for a page, so "diary" finds Calendar and "fee note" finds Billing.
const SYNONYMS = {
  dashboard: 'home overview summary start',
  arrivals: 'reception walk-in visitors queue consultations front desk',
  clients: 'client customers people kyc',
  cases: 'matters files suits litigation case',
  calendar: 'diary hearings mentions dates schedule events',
  courtroom: 'hearing virtual court session judge',
  'court-preparation': 'prepare brief bundle submissions',
  documents: 'files papers pleadings uploads',
  billing: 'invoices fees fee note payments money accounts',
  staff: 'employees team advocates lawyers secretaries members',
  'staff-records': 'employees team members hr records',
  communication: 'chat messages talk',
  chat: 'messages talk staff chat',
  notifications: 'alerts bell messages',
  reports: 'analytics statistics figures performance',
  'it-report': 'systems technical',
  firm: 'firm details logo branches address registration',
  subscription: 'plan renew pay package',
  'public-knowledge': 'chatbot assistant website answers',
  compliance: 'audit logs trail history who did',
  settings: 'preferences configuration options',
  profile: 'account my details name photo',
  security: 'password pin two-factor sign in',
  tasks: 'to do work jobs',
  approvals: 'approve review sign off',
  systems: 'it computers devices',
  'membership-status': 'membership firm status',
};

export const synonymsFor = (path) => SYNONYMS[String(path || '').split('/').filter(Boolean).pop()] || '';

// Actions inside a page, offered only when the page they live on is in the person's sidebar.
const ACTIONS = {
  admin: [
    { name: 'New client', path: '/admin/clients/create', under: '/admin/clients', words: 'add register onboard take on' },
    { name: 'New proposed matter', path: '/admin/clients/proposed-matters/new', under: '/admin/clients', words: 'open matter new case instruction conflict check' },
    { name: 'Add staff member', path: '/admin/staff/create', under: '/admin/staff', words: 'new employee advocate lawyer secretary register hire' },
    { name: 'Invoices', path: '/admin/billing/invoices', under: '/admin/billing', words: 'bill fee note raise invoice' },
    { name: 'Payments received', path: '/admin/billing/payments', under: '/admin/billing', words: 'receipts paid mpesa money in' },
    { name: 'Document requests', path: '/admin/documents/requests', under: '/admin/documents', words: 'ask client documents' },
    { name: 'Document templates', path: '/admin/documents/templates', under: '/admin/documents', words: 'precedents forms drafts' },
    { name: 'Generated documents', path: '/admin/documents/generated', under: '/admin/documents', words: 'drafted produced' },
    { name: 'Notifications', path: '/admin/communication/notifications', under: '/admin/communication', words: 'alerts bell' },
  ],
  secretary: [
    { name: 'New client', path: '/secretary/clients/create', under: '/secretary/clients', words: 'add register onboard take on' },
    { name: 'New proposed matter', path: '/secretary/clients/proposed-matters/new', under: '/secretary/clients', words: 'open matter new case instruction' },
  ],
  lawyer: [
    { name: 'New client', path: '/lawyer/clients/create', under: '/lawyer/cases', words: 'add register onboard take on' },
  ],
};

export function workspaceActions(base, links) {
  const visible = new Set(links.map((link) => link.path));
  const actions = (ACTIONS[base] || []).filter((action) => visible.has(action.under));
  return [...actions, { name: 'Help centre', path: `/${base}/help`, words: 'help tutorials how to guide videos' }];
}

const words = (text) => String(text || '').toLowerCase().split(/\s+/).filter(Boolean);

export function matchFeatures(features, query) {
  const terms = words(query);
  if (!terms.length) return features.slice(0, 8);
  const phrase = terms.join(' ');
  return features
    .map((feature) => {
      const name = feature.name.toLowerCase();
      const haystack = `${name} ${feature.section || ''} ${feature.words || ''} ${synonymsFor(feature.path)}`.toLowerCase();
      if (!terms.every((term) => haystack.includes(term))) return null;
      const rank = name.startsWith(phrase) ? 0 : name.includes(phrase) ? 1 : terms.every((term) => name.includes(term)) ? 2 : 3;
      return { feature, rank };
    })
    .filter(Boolean)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 8)
    .map(({ feature }) => feature);
}

