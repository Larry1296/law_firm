// src/modules/portal/consultations/BookConsultation.jsx

import { useContext, useState } from "react";
import {
  CalendarDays,
  Clock3,
  FileText,
  Search,
  Video,
  Phone,
  Building2,
  Upload,
  CheckCircle2,
  Briefcase,
  Scale,
  ShieldCheck,
  Users,
} from "lucide-react";

import ThemeContext from "@/core/store/ThemeContext";

import Card from "@/components/ui/Card";
import Button3D from "@/components/ui/Button3D";
import Select3D from "@/components/ui/Select3D";

const lawyers = [
  {
    id: 1,
    name: "Adv. Sarah Wanjiku",
    specialty: "Family Law",
    experience: "8 Years",
    availability: "Available Tomorrow",
  },
  {
    id: 2,
    name: "Adv. Brian Otieno",
    specialty: "Land & Property",
    experience: "12 Years",
    availability: "Available Today",
  },
  {
    id: 3,
    name: "Adv. Mercy Kilonzo",
    specialty: "Corporate Law",
    experience: "6 Years",
    availability: "Available Friday",
  },
];

const practiceAreas = [
  {
    title: "Family Law",
    icon: <Users size={18} />,
  },
  {
    title: "Corporate Law",
    icon: <Briefcase size={18} />,
  },
  {
    title: "Criminal Law",
    icon: <ShieldCheck size={18} />,
  },
  {
    title: "Civil Litigation",
    icon: <Scale size={18} />,
  },
];

export default function BookConsultation() {
  const { theme } = useContext(ThemeContext);

  const isDark = theme === "dark";

  const [selectedType, setSelectedType] = useState("Virtual");
  const [practiceArea, setPracticeArea] = useState("Family Law");

  const [selectedLawyer, setSelectedLawyer] = useState(null);

  const consultationTypes = [
    {
      name: "Virtual",
      icon: <Video size={18} />,
    },
    {
      name: "Phone",
      icon: <Phone size={18} />,
    },
    {
      name: "Physical",
      icon: <Building2 size={18} />,
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* PAGE HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div>
          <h1
            className={`text-3xl font-bold ${
              isDark ? "text-white" : "text-slate-800"
            }`}
          >
            Book Consultation
          </h1>

          <p
            className={`mt-1 text-sm ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Schedule a legal consultation with a lawyer from the firm.
          </p>
        </div>

        <div
          className={`px-4 py-3 rounded-2xl border shadow-soft ${
            isDark
              ? "bg-[color:var(--surface-dark)] border-[color:var(--border-dark)]"
              : "bg-white border-[color:var(--border-light)]"
          }`}
        >
          <p
            className={`text-xs ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Average Response Time
          </p>

          <h3 className="text-lg font-bold text-brand-primary">
            Under 2 Hours
          </h3>
        </div>
      </div>

      {/* PRACTICE AREAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {practiceAreas.map((area) => (
          <Card
            key={area.title}
            className={`rounded-2xl border shadow-soft p-5 transition hover:-translate-y-1 cursor-pointer ${
              isDark
                ? "bg-[color:var(--surface-dark)] border-[color:var(--border-dark)] hover:bg-slate-900"
                : "bg-white border-[color:var(--border-light)] hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-brand-primary/10 text-brand-primary">
                {area.icon}
              </div>

              <div>
                <h3
                  className={`font-semibold ${
                    isDark ? "text-white" : "text-slate-800"
                  }`}
                >
                  {area.title}
                </h3>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* FORM */}
        <div className="xl:col-span-2">
          <Card
            className={`rounded-2xl border shadow-soft p-6 ${
              isDark
                ? "bg-[color:var(--surface-dark)] border-[color:var(--border-dark)]"
                : "bg-white border-[color:var(--border-light)]"
            }`}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-brand-primary/10 text-brand-primary">
                <CalendarDays size={22} />
              </div>

              <div>
                <h2
                  className={`text-xl font-bold ${
                    isDark ? "text-white" : "text-slate-800"
                  }`}
                >
                  Consultation Details
                </h2>

                <p
                  className={`text-sm ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Fill in the details below to request a consultation.
                </p>
              </div>
            </div>

            <form className="space-y-6">
              {/* SUBJECT */}
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    isDark ? "text-slate-300" : "text-slate-700"
                  }`}
                >
                  Consultation Subject
                </label>

                <input
                  type="text"
                  placeholder="e.g Land Ownership Dispute"
                  autoComplete="on"
                  autoCorrect="on"
                  autoCapitalize="sentences"
                  spellCheck
                  className={`w-full px-4 py-3 rounded-xl border outline-none transition ${
                    isDark
                      ? "bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                      : "bg-slate-50 border-slate-200 text-slate-800"
                  }`}
                />
              </div>

              {/* PRACTICE AREA */}
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    isDark ? "text-slate-300" : "text-slate-700"
                  }`}
                >
                  Practice Area
                </label>

                <Select3D
                  value={practiceArea}
                  onChange={(event) => setPracticeArea(event.target.value)}
                  wrapperClassName="mb-0"
                  options={[
                    { value: "Family Law", label: "Family Law" },
                    { value: "Corporate Law", label: "Corporate Law" },
                    { value: "Land & Property", label: "Land & Property" },
                    { value: "Criminal Law", label: "Criminal Law" },
                    { value: "Employment Law", label: "Employment Law" },
                  ]}
                />
              </div>

              {/* CONSULTATION TYPE */}
              <div>
                <label
                  className={`block text-sm font-medium mb-3 ${
                    isDark ? "text-slate-300" : "text-slate-700"
                  }`}
                >
                  Consultation Type
                </label>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {consultationTypes.map((type) => (
                    <button
                      type="button"
                      key={type.name}
                      onClick={() => setSelectedType(type.name)}
                      className={`rounded-2xl border p-4 transition ${
                        selectedType === type.name
                          ? "border-brand-primary bg-brand-primary/10"
                          : isDark
                            ? "border-slate-700 bg-slate-900 hover:border-slate-500"
                            : "border-slate-200 bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="text-brand-primary">{type.icon}</div>

                        <span
                          className={`font-medium ${
                            isDark ? "text-white" : "text-slate-800"
                          }`}
                        >
                          {type.name}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* DATE & TIME */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Preferred Date
                  </label>

                  <div className="relative">
                    <CalendarDays
                      size={18}
                      className={`absolute left-4 top-1/2 -translate-y-1/2 ${
                        isDark ? "text-slate-500" : "text-slate-400"
                      }`}
                    />

                    <input
                      type="date"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      className={`w-full pl-11 pr-4 py-3 rounded-xl border outline-none ${
                        isDark
                          ? "bg-slate-900 border-slate-700 text-white"
                          : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Preferred Time
                  </label>

                  <div className="relative">
                    <Clock3
                      size={18}
                      className={`absolute left-4 top-1/2 -translate-y-1/2 ${
                        isDark ? "text-slate-500" : "text-slate-400"
                      }`}
                    />

                    <input
                      type="time"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      className={`w-full pl-11 pr-4 py-3 rounded-xl border outline-none ${
                        isDark
                          ? "bg-slate-900 border-slate-700 text-white"
                          : "bg-slate-50 border-slate-200 text-slate-800"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* DESCRIPTION */}
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    isDark ? "text-slate-300" : "text-slate-700"
                  }`}
                >
                  Case Summary / Notes
                </label>

                <textarea
                  rows={6}
                  placeholder="Describe your legal issue or consultation request..."
                  autoComplete="on"
                  autoCorrect="on"
                  autoCapitalize="sentences"
                  spellCheck
                  className={`w-full px-4 py-3 rounded-2xl border outline-none resize-none ${
                    isDark
                      ? "bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                      : "bg-slate-50 border-slate-200 text-slate-800"
                  }`}
                />
              </div>

              {/* FILE UPLOAD */}
              <div>
                <label
                  className={`block text-sm font-medium mb-3 ${
                    isDark ? "text-slate-300" : "text-slate-700"
                  }`}
                >
                  Supporting Documents
                </label>

                <div
                  className={`border-2 border-dashed rounded-2xl p-8 text-center ${
                    isDark
                      ? "border-slate-700 bg-slate-900"
                      : "border-slate-300 bg-slate-50"
                  }`}
                >
                  <div className="flex justify-center mb-4">
                    <div className="p-4 rounded-2xl bg-brand-primary/10 text-brand-primary">
                      <Upload size={28} />
                    </div>
                  </div>

                  <h3
                    className={`font-semibold ${
                      isDark ? "text-white" : "text-slate-800"
                    }`}
                  >
                    Upload Files
                  </h3>

                  <p
                    className={`mt-2 text-sm ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    PDF, DOCX, Images up to 10MB
                  </p>

                  <Button3D variant="secondary" className="mt-5">
                    Choose Files
                  </Button3D>
                </div>
              </div>

              {/* SUBMIT */}
              <div className="flex flex-wrap gap-4 pt-2">
                <Button3D variant="primary">Submit Request</Button3D>

                <Button3D variant="secondary">Save Draft</Button3D>
              </div>
            </form>
          </Card>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="space-y-6">
          {/* LAWYERS */}
          <Card
            className={`rounded-2xl border shadow-soft p-5 ${
              isDark
                ? "bg-[color:var(--surface-dark)] border-[color:var(--border-dark)]"
                : "bg-white border-[color:var(--border-light)]"
            }`}
          >
            <div className="flex items-center justify-between mb-5">
              <h2
                className={`text-lg font-bold ${
                  isDark ? "text-white" : "text-slate-800"
                }`}
              >
                Available Lawyers
              </h2>

              <Search
                size={18}
                className={isDark ? "text-slate-400" : "text-slate-500"}
              />
            </div>

            <div className="space-y-4">
              {lawyers.map((lawyer) => (
                <button
                  key={lawyer.id}
                  onClick={() => setSelectedLawyer(lawyer.id)}
                  className={`w-full text-left rounded-2xl border p-4 transition ${
                    selectedLawyer === lawyer.id
                      ? "border-brand-primary bg-brand-primary/10"
                      : isDark
                        ? "border-slate-700 bg-slate-900 hover:border-slate-500"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3
                        className={`font-semibold ${
                          isDark ? "text-white" : "text-slate-800"
                        }`}
                      >
                        {lawyer.name}
                      </h3>

                      <p className="text-sm text-brand-primary mt-1">
                        {lawyer.specialty}
                      </p>
                    </div>

                    {selectedLawyer === lawyer.id && (
                      <CheckCircle2 size={20} className="text-brand-primary" />
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs">
                    <span
                      className={isDark ? "text-slate-400" : "text-slate-500"}
                    >
                      {lawyer.experience}
                    </span>

                    <span className="text-emerald-500 font-medium">
                      {lawyer.availability}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* INFO */}
          <Card
            className={`rounded-2xl border shadow-soft p-5 ${
              isDark
                ? "bg-[color:var(--surface-dark)] border-[color:var(--border-dark)]"
                : "bg-white border-[color:var(--border-light)]"
            }`}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 rounded-xl bg-brand-primary/10 text-brand-primary">
                <FileText size={20} />
              </div>

              <h2
                className={`text-lg font-bold ${
                  isDark ? "text-white" : "text-slate-800"
                }`}
              >
                Consultation Guidelines
              </h2>
            </div>

            <div className="space-y-4">
              {[
                "Provide accurate case details.",
                "Upload supporting documents where possible.",
                "Arrive 10 minutes early for physical meetings.",
                "Virtual consultation links are shared via email.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-500 mt-0.5" />

                  <p
                    className={`text-sm leading-relaxed ${
                      isDark ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
