import {
  LayoutDashboard,
  Briefcase,
  Scale,
  Users,
  UserCog,
  Calendar,
  FileText,
  CreditCard,
  BarChart,
  MessageSquare,
  ShieldCheck,
  Settings,
  Building2,
  Bot,
  Brain,
  Lightbulb,
  MonitorCog,
} from 'lucide-react';

export const adminSidebarLinks = [
  { name: 'Staff', path: '/admin/staff', icon: UserCog, section: 'Staff' },
  { name: 'Staff Chat', path: '/admin/communication', icon: MessageSquare, section: 'Staff' },

  {
    name: 'Clients',
    path: '/admin/clients',
    icon: Users,
    section: 'Clients',
    ownerOnly: true,
  },

  { name: 'Cases', path: '/admin/cases', icon: Briefcase, section: 'Cases', ownerOnly: true },
  { name: 'Hearings', path: '/admin/hearings', icon: Scale, section: 'Cases', ownerOnly: true },
  { name: 'Calendar', path: '/admin/calendar', icon: Calendar, section: 'Cases', ownerOnly: true },
  {
    name: 'Case Predictions',
    path: '/admin/ai/predictions',
    icon: Brain,
    section: 'Cases',
    ownerOnly: true,
  },

  {
    name: 'Dashboard',
    path: '/admin/dashboard',
    icon: LayoutDashboard,
    end: true,
    section: 'Overview',
  },

  { name: 'Documents', path: '/admin/documents', icon: FileText, section: 'Documents & Billing' },
  { name: 'Billing', path: '/admin/billing', icon: CreditCard, section: 'Documents & Billing' },

  { name: 'Reports', path: '/admin/reports', icon: BarChart, section: 'Reports & Intelligence' },
  { name: 'IT Report', path: '/admin/it-report', icon: MonitorCog, section: 'Reports & Intelligence' },

  {
    name: 'AI Overview',
    path: '/admin/ai',
    icon: Bot,
    section: 'Reports & Intelligence',
  },
  {
    name: 'AI Recommendations',
    path: '/admin/ai/recommendations',
    icon: Lightbulb,
    section: 'Reports & Intelligence',
  },

  { name: 'Firm', path: '/admin/firm', icon: Building2, section: 'Firm Administration' },
  { name: 'Compliance', path: '/admin/compliance', icon: ShieldCheck, section: 'Firm Administration' },
  { name: 'Settings', path: '/admin/settings', icon: Settings, section: 'Firm Administration' },
];
