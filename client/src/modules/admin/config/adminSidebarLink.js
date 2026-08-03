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
  Globe2,
  // INTERNAL AI TEMPORARILY PAUSED: Bot, Brain, Lightbulb,
  MonitorCog,
  User,
} from 'lucide-react';

export const adminSidebarLinks = [
  {
    name: 'Dashboard',
    path: '/admin/dashboard',
    icon: LayoutDashboard,
    end: true,
    section: 'Overview',
  },

  {
    name: 'Clients',
    path: '/admin/clients',
    icon: Users,
    section: 'Clients',
    ownerOnly: true,
  },

  { name: 'Cases', path: '/admin/cases', icon: Briefcase, section: 'Cases', ownerOnly: true },
  { name: 'Courtroom', path: '/admin/courtroom', icon: Scale, section: 'Cases', ownerOnly: true },
  { name: 'Calendar', path: '/admin/calendar', icon: Calendar, section: 'Cases', ownerOnly: true },
  // INTERNAL AI TEMPORARILY PAUSED
  // Uncomment this block when internal AI development resumes after the
  // essential Sheria Master law-firm workflows have been completed and verified.
  // { name: 'AI Matter Intelligence', path: '/admin/ai/matters', icon: Brain, section: 'Cases', ownerOnly: true },

  { name: 'Documents', path: '/admin/documents', icon: FileText, section: 'Documents & Billing' },
  { name: 'Billing', path: '/admin/billing', icon: CreditCard, section: 'Documents & Billing' },

  { name: 'Staff', path: '/admin/staff', icon: UserCog, section: 'Staff' },
  { name: 'Staff Chat', path: '/admin/communication', icon: MessageSquare, section: 'Staff' },

  { name: 'Reports', path: '/admin/reports', icon: BarChart, section: 'Reports & Intelligence' },
  { name: 'IT Report', path: '/admin/it-report', icon: MonitorCog, section: 'Reports & Intelligence' },

  // INTERNAL AI TEMPORARILY PAUSED
  // { name: 'AI Overview', path: '/admin/ai', icon: Bot, section: 'Reports & Intelligence' },
  // { name: 'AI Recommendations', path: '/admin/ai/recommendations', icon: Lightbulb, section: 'Reports & Intelligence' },

  { name: 'Firm', path: '/admin/firm', icon: Building2, section: 'Firm Administration' },
  { name: 'Chatbot Knowledge', path: '/admin/public-knowledge', icon: Globe2, section: 'Firm Administration' },
  { name: 'Compliance', path: '/admin/compliance', icon: ShieldCheck, section: 'Firm Administration' },
  { name: 'Settings', path: '/admin/settings', icon: Settings, section: 'Firm Administration' },
  { name: 'Profile', path: '/admin/profile', icon: User, section: 'Account' },
];
