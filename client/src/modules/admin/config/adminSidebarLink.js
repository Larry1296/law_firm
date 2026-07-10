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
  {
    name: 'Dashboard',
    path: '/admin/dashboard',
    icon: LayoutDashboard,
    end: true,
  },

  /* ================= CASES ================= */
  { name: 'Cases', path: '/admin/cases', icon: Briefcase },

  /* ================= HEARINGS ================= */
  { name: 'Hearings', path: '/admin/hearings', icon: Scale },

  /* ================= CLIENTS ================= */
  { name: 'Clients', path: '/admin/clients', icon: Users },

  /* ================= STAFF ================= */
  { name: 'Staff', path: '/admin/staff', icon: UserCog },

  /* ================= CALENDAR ================= */
  { name: 'Calendar', path: '/admin/calendar', icon: Calendar },

  /* ================= DOCUMENTS ================= */
  { name: 'Documents', path: '/admin/documents', icon: FileText },

  /* ================= BILLING ================= */
  { name: 'Billing', path: '/admin/billing', icon: CreditCard },

  /* ================= REPORTS ================= */
  { name: 'Reports', path: '/admin/reports', icon: BarChart },
  { name: 'IT Report', path: '/admin/it-report', icon: MonitorCog },

  /* ================= COMMUNICATION ================= */
  { name: 'Staff Chat', path: '/admin/communication', icon: MessageSquare },

  /* ================= COMPLIANCE ================= */
  { name: 'Compliance', path: '/admin/compliance', icon: ShieldCheck },

  /* ================= AI MODULE ================= */
  {
    name: 'AI Overview',
    path: '/admin/ai',
    icon: Bot,
  },
  {
    name: 'AI Recommendations',
    path: '/admin/ai/recommendations',
    icon: Lightbulb,
  },
  {
    name: 'Case Predictions',
    path: '/admin/ai/predictions',
    icon: Brain,
  },

  /* ================= SETTINGS ================= */
  { name: 'Settings', path: '/admin/settings', icon: Settings },

  /* ================= FIRM ================= */
  { name: 'Firm', path: '/admin/firm', icon: Building2 },
];
