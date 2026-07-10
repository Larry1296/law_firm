// src/modules/portal/notifications/PortalNotifications.jsx

import { useContext, useMemo, useState } from "react";
import {
  Bell,
  Search,
  CheckCheck,
  Filter,
  Calendar,
  FileText,
  ShieldAlert,
  MessageSquare,
  Briefcase,
  Clock3,
  Trash2,
} from "lucide-react";

import ThemeContext from "@/core/store/ThemeContext";

import Card from "@/components/ui/Card";
import Button3D from "@/components/ui/Button3D";

const notificationsData = [
  {
    id: 1,
    title: "Consultation Approved",
    message: "Your legal consultation request has been approved and scheduled.",
    type: "consultation",
    date: "21 May 2026 • 09:30 AM",
    read: false,
  },
  {
    id: 2,
    title: "Document Review Completed",
    message: "The legal team has reviewed the agreement you uploaded.",
    type: "documents",
    date: "20 May 2026 • 02:10 PM",
    read: true,
  },
  {
    id: 3,
    title: "New Portal Message",
    message: "You received a new secure message from the intake department.",
    type: "messages",
    date: "19 May 2026 • 11:40 AM",
    read: false,
  },
  {
    id: 4,
    title: "Intake Form Requires Update",
    message: "Additional information is required for your intake submission.",
    type: "compliance",
    date: "18 May 2026 • 04:50 PM",
    read: false,
  },
  {
    id: 5,
    title: "Matter Status Updated",
    message: "Your matter has moved into the review and evaluation phase.",
    type: "case",
    date: "17 May 2026 • 08:15 AM",
    read: true,
  },
];

export default function PortalNotifications() {
  const { theme } = useContext(ThemeContext);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const isDark = theme === "dark";

  const pageBg = isDark
    ? "bg-background-dark text-text-primary-dark"
    : "bg-background-light text-slate-800";

  const cardBg = isDark
    ? "bg-surface-dark border-border-dark"
    : "bg-surface-light border-border-light";

  const mutedText = isDark ? "text-text-muted-dark" : "text-slate-500";

  const filters = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread" },
    { key: "consultation", label: "Consultations" },
    { key: "documents", label: "Documents" },
    { key: "messages", label: "Messages" },
  ];

  const filteredNotifications = useMemo(() => {
    return notificationsData.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.message.toLowerCase().includes(search.toLowerCase());

      const matchesFilter =
        activeFilter === "all"
          ? true
          : activeFilter === "unread"
            ? !item.read
            : item.type === activeFilter;

      return matchesSearch && matchesFilter;
    });
  }, [search, activeFilter]);

  const getTypeIcon = (type) => {
    switch (type) {
      case "consultation":
        return <Calendar className="text-info" size={20} />;

      case "documents":
        return <FileText className="text-success" size={20} />;

      case "messages":
        return <MessageSquare className="text-brand-primary" size={20} />;

      case "compliance":
        return <ShieldAlert className="text-warning" size={20} />;

      case "case":
        return <Briefcase className="text-error" size={20} />;

      default:
        return <Bell className="text-brand-primary" size={20} />;
    }
  };

  return (
    <div className={`min-h-screen ${pageBg} p-4 md:p-6 animate-fadeIn`}>
      {/* HEADER */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bell className="text-brand-primary" size={32} />
            Notifications
          </h1>

          <p className={`mt-2 ${mutedText}`}>
            Stay updated with portal activities, consultations, messages, and
            legal process updates.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button3D variant="secondary" className="flex items-center gap-2">
            <CheckCheck size={18} />
            Mark All Read
          </Button3D>

          <Button3D variant="primary" className="flex items-center gap-2">
            <Filter size={18} />
            Notification Settings
          </Button3D>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <Card className={`p-5 border rounded-2xl shadow-soft ${cardBg}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={mutedText}>Total Notifications</p>

              <h2 className="text-3xl font-bold mt-2">
                {notificationsData.length}
              </h2>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center">
              <Bell className="text-brand-primary" size={28} />
            </div>
          </div>
        </Card>

        <Card className={`p-5 border rounded-2xl shadow-soft ${cardBg}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={mutedText}>Unread</p>

              <h2 className="text-3xl font-bold mt-2 text-warning">
                {notificationsData.filter((item) => !item.read).length}
              </h2>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-warning/10 flex items-center justify-center">
              <Clock3 className="text-warning" size={28} />
            </div>
          </div>
        </Card>

        <Card className={`p-5 border rounded-2xl shadow-soft ${cardBg}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={mutedText}>Messages</p>

              <h2 className="text-3xl font-bold mt-2 text-info">
                {
                  notificationsData.filter((item) => item.type === "messages")
                    .length
                }
              </h2>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-info/10 flex items-center justify-center">
              <MessageSquare className="text-info" size={28} />
            </div>
          </div>
        </Card>
      </div>

      {/* SEARCH + FILTERS */}
      <Card className={`p-5 border rounded-2xl shadow-soft mb-8 ${cardBg}`}>
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          {/* SEARCH */}
          <div className="relative w-full lg:max-w-md">
            <Search
              size={18}
              className={`absolute left-4 top-1/2 -translate-y-1/2 ${mutedText}`}
            />

            <input
              type="text"
              placeholder="Search notifications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full rounded-2xl border pl-11 pr-4 py-3 outline-none transition-all ${
                isDark
                  ? "bg-black/20 border-border-dark text-white placeholder:text-slate-500 focus:border-brand-primary"
                  : "bg-white border-border-light text-slate-800 placeholder:text-slate-400 focus:border-brand-primary"
              }`}
            />
          </div>

          {/* FILTERS */}
          <div className="flex flex-wrap gap-3">
            {filters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeFilter === filter.key
                    ? "bg-brand-primary text-white"
                    : isDark
                      ? "bg-black/20 text-slate-300 hover:bg-black/40"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* NOTIFICATION LIST */}
      <div className="space-y-5">
        {filteredNotifications.map((notification) => (
          <Card
            key={notification.id}
            className={`border rounded-2xl shadow-soft transition-all hover:scale-[1.01] ${cardBg}`}
          >
            <div className="p-5 flex flex-col xl:flex-row xl:items-start gap-5">
              {/* ICON */}
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                  isDark ? "bg-black/20" : "bg-slate-100"
                }`}
              >
                {getTypeIcon(notification.type)}
              </div>

              {/* CONTENT */}
              <div className="flex-1">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-lg font-semibold">
                        {notification.title}
                      </h2>

                      {!notification.read && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-warning/20 text-warning">
                          Unread
                        </span>
                      )}
                    </div>

                    <p className={`${mutedText} max-w-3xl`}>
                      {notification.message}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className={`p-3 rounded-xl transition-all ${
                        isDark
                          ? "bg-black/20 hover:bg-black/40"
                          : "bg-slate-100 hover:bg-slate-200"
                      }`}
                    >
                      <CheckCheck size={18} />
                    </button>

                    <button
                      className={`p-3 rounded-xl transition-all ${
                        isDark
                          ? "bg-black/20 hover:bg-error/20"
                          : "bg-slate-100 hover:bg-error/10"
                      }`}
                    >
                      <Trash2 size={18} className="text-error" />
                    </button>
                  </div>
                </div>

                {/* FOOTER */}
                <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div
                    className={`flex items-center gap-2 text-sm ${mutedText}`}
                  >
                    <Clock3 size={16} />
                    {notification.date}
                  </div>

                  <Button3D variant="secondary" className="w-full sm:w-auto">
                    View Details
                  </Button3D>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* EMPTY */}
      {filteredNotifications.length === 0 && (
        <Card
          className={`p-10 border rounded-2xl shadow-soft text-center mt-8 ${cardBg}`}
        >
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-brand-primary/10 flex items-center justify-center">
              <Bell className="text-brand-primary" size={34} />
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-2">No Notifications Found</h2>

          <p className={mutedText}>
            There are currently no notifications matching your search or
            filters.
          </p>
        </Card>
      )}
    </div>
  );
}
