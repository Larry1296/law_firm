import {
  Building2,
  CreditCard,
  Inbox,
  LayoutDashboard,
  Layers,
  PlusCircle,
  Users,
} from 'lucide-react';

// The platform console uses the same dashboard shell as the firm dashboards.
export const platformLayoutConfig = {
  label: 'Platform administrator',
  title: 'Platform Console',
  basePath: '/platform',
  // The platform has no notifications inbox.
  showNotifications: false,
  assistant: 'platform',
  // Platform pages leave their outer spacing to the shell.
  contentClassName: 'mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8',
  navLinks: [
    { name: 'Overview', path: '/platform/overview', icon: LayoutDashboard, section: 'Monitor' },
    { name: 'Users', path: '/platform/users', icon: Users, section: 'Monitor' },
    { name: 'Law firms', path: '/platform/firms', icon: Building2, end: true, section: 'Firms' },
    { name: 'Register a firm', path: '/platform/firms/register', icon: PlusCircle, section: 'Firms' },
    { name: 'Onboarding requests', path: '/platform/requests', icon: Inbox, section: 'Firms' },
    { name: 'Plans', path: '/platform/plans', icon: Layers, section: 'Billing' },
    { name: 'Payments', path: '/platform/payments', icon: CreditCard, section: 'Billing' },
  ],
};
