// src/modules/portal/consultations/PortalConsultations.jsx

import {
  CalendarDays,
  Clock3,
  MapPin,
  Video,
  UserCircle2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Filter,
} from "lucide-react";

import { useState } from "react";

export default function PortalConsultations() {
  /* =========================================================
     STATE
  ========================================================= */

  const [search, setSearch] = useState("");

  /* =========================================================
     DUMMY DATA
  ========================================================= */

  const consultations = [
    {
      id: 1,
      title: "Family Law Consultation",
      lawyer: "Adv. Sarah Wanjiku",
      type: "Virtual",
      location: "Google Meet",
      date: "24 May 2026",
      time: "10:00 AM",
      status: "Confirmed",
    },
    {
      id: 2,
      title: "Land Dispute Advisory",
      lawyer: "Adv. Brian Otieno",
      type: "Physical",
      location: "Nairobi Office",
      date: "28 May 2026",
      time: "2:30 PM",
      status: "Pending",
    },
    {
      id: 3,
      title: "Contract Review Session",
      lawyer: "Pending Assignment",
      type: "Virtual",
      location: "Awaiting Link",
      date: "30 May 2026",
      time: "11:00 AM",
      status: "Awaiting Approval",
    },
  ];

  const filteredConsultations = consultations.filter((consultation) =>
    consultation.title.toLowerCase().includes(search.toLowerCase()),
  );

  /* =========================================================
     COMPONENT
  ========================================================= */

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* =====================================================
          HERO
      ===================================================== */}
      <section
        className="
          rounded-2xl
          bg-gradient-to-r from-brand-primary to-blue-700
          text-white
          p-6 lg:p-8
          shadow-medium
        "
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="uppercase tracking-widest text-sm text-blue-100 mb-2">
              Legal Consultations
            </p>

            <h1 className="text-3xl lg:text-4xl font-bold mb-3">
              Consultations & Meetings
            </h1>

            <p className="text-blue-100 max-w-2xl">
              Schedule consultations, monitor upcoming legal meetings, and
              communicate securely with legal professionals.
            </p>
          </div>

          <button
            className="
              flex items-center justify-center gap-2
              bg-white text-brand-primary
              px-5 py-3 rounded-xl
              font-semibold
              hover:scale-105
              transition
            "
          >
            <Plus size={18} />
            Book Consultation
          </button>
        </div>
      </section>

      {/* =====================================================
          STATS
      ===================================================== */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {[
          {
            label: "Total Consultations",
            value: "12",
            icon: CalendarDays,
          },
          {
            label: "Upcoming Meetings",
            value: "4",
            icon: Clock3,
          },
          {
            label: "Confirmed",
            value: "8",
            icon: CheckCircle2,
          },
          {
            label: "Pending Approval",
            value: "2",
            icon: AlertCircle,
          },
        ].map((stat, index) => {
          const Icon = stat.icon;

          return (
            <div
              key={index}
              className="
                bg-surface-light dark:bg-surface-dark
                border border-border-light dark:border-border-dark
                rounded-2xl
                p-5
                shadow-soft
              "
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {stat.label}
                  </p>

                  <h3 className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">
                    {stat.value}
                  </h3>
                </div>

                <div className="w-14 h-14 rounded-xl bg-brand-primary/10 flex items-center justify-center">
                  <Icon className="text-brand-primary" size={28} />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* =====================================================
          FILTER BAR
      ===================================================== */}
      <section
        className="
          bg-surface-light dark:bg-surface-dark
          border border-border-light dark:border-border-dark
          rounded-2xl
          shadow-soft
          p-5
        "
      >
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          {/* SEARCH */}
          <div className="relative w-full lg:max-w-md">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              placeholder="Search consultations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="
                w-full pl-11 pr-4 py-3
                rounded-xl
                border border-border-light dark:border-border-dark
                bg-background-light dark:bg-background-dark
                text-gray-900 dark:text-white
                outline-none
                focus:ring-2 focus:ring-brand-primary
              "
            />
          </div>

          {/* FILTERS */}
          <div className="flex items-center gap-3">
            <button
              className="
                flex items-center gap-2
                px-4 py-3
                rounded-xl
                border border-border-light dark:border-border-dark
                bg-background-light dark:bg-background-dark
                hover:border-brand-primary
                transition
              "
            >
              <Filter size={18} />
              Filters
            </button>

            <button
              className="
                px-5 py-3 rounded-xl
                bg-brand-primary
                text-white
                font-medium
                hover:opacity-90
                transition
              "
            >
              Export
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================
          CONSULTATIONS LIST
      ===================================================== */}
      <section className="space-y-5">
        {filteredConsultations.map((consultation) => (
          <div
            key={consultation.id}
            className="
              bg-surface-light dark:bg-surface-dark
              border border-border-light dark:border-border-dark
              rounded-2xl
              shadow-soft
              p-6
              hover:shadow-medium
              transition-all
            "
          >
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
              {/* LEFT */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {consultation.title}
                  </h2>

                  <div className="flex items-center gap-2 mt-2 text-gray-600 dark:text-gray-400">
                    <UserCircle2 size={18} />

                    <span>{consultation.lawyer}</span>
                  </div>
                </div>

                {/* META */}
                <div className="flex flex-wrap gap-5">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <CalendarDays size={16} />
                    {consultation.date}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Clock3 size={16} />
                    {consultation.time}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    {consultation.type === "Virtual" ? (
                      <Video size={16} />
                    ) : (
                      <MapPin size={16} />
                    )}

                    {consultation.location}
                  </div>
                </div>
              </div>

              {/* RIGHT */}
              <div className="flex flex-col items-start xl:items-end gap-4">
                <span
                  className={`
                    px-4 py-2 rounded-full text-xs font-semibold
                    ${
                      consultation.status === "Confirmed"
                        ? "bg-success/10 text-success"
                        : consultation.status === "Pending"
                          ? "bg-warning/10 text-warning"
                          : "bg-info/10 text-info"
                    }
                  `}
                >
                  {consultation.status}
                </span>

                <div className="flex flex-wrap gap-3">
                  <button
                    className="
                      px-4 py-2 rounded-xl
                      border border-border-light dark:border-border-dark
                      hover:border-brand-primary
                      transition
                      text-sm
                    "
                  >
                    View Details
                  </button>

                  <button
                    className="
                      px-4 py-2 rounded-xl
                      bg-brand-primary
                      text-white
                      hover:opacity-90
                      transition
                      text-sm
                    "
                  >
                    Join Meeting
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
