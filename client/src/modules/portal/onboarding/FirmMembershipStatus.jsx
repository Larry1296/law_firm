// src/modules/portal/onboarding/FirmMembershipStatus.jsx

import { motion } from "framer-motion";
import {
  ShieldCheck,
  Clock3,
  CheckCircle2,
  Building2,
  UserCheck,
  FileText,
  ArrowRight,
  Mail,
  Phone,
} from "lucide-react";

const timeline = [
  {
    id: 1,
    title: "Account Created",
    description: "Your portal account was successfully registered.",
    status: "completed",
    date: "12 May 2026",
    icon: <UserCheck size={18} />,
  },
  {
    id: 2,
    title: "Documents Submitted",
    description: "Identity and intake documents uploaded.",
    status: "completed",
    date: "14 May 2026",
    icon: <FileText size={18} />,
  },
  {
    id: 3,
    title: "Firm Review",
    description: "Your onboarding request is under legal team review.",
    status: "pending",
    date: "In Progress",
    icon: <Clock3 size={18} />,
  },
  {
    id: 4,
    title: "Firm Membership Activation",
    description: "You will gain access to case collaboration tools.",
    status: "upcoming",
    date: "Pending",
    icon: <Building2 size={18} />,
  },
];

const requirements = [
  "National ID or Passport Verification",
  "Signed engagement agreement",
  "Conflict check approval",
  "Consultation assessment completed",
  "Initial intake documents uploaded",
];

export default function FirmMembershipStatus() {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Firm Membership Status
          </h1>

          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
            Track your onboarding progress and monitor your transition into a
            fully managed law firm client account.
          </p>
        </div>

        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
          <Clock3 size={20} className="text-amber-600 dark:text-amber-400" />

          <div>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Current Status
            </p>

            <p className="font-semibold text-amber-800 dark:text-amber-200">
              Under Review
            </p>
          </div>
        </div>
      </div>

      {/* STATUS OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MEMBERSHIP CARD */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-surface-dark shadow-soft p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-brand-primary" size={22} />

                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Membership Progress
                </h2>
              </div>

              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Your onboarding request is currently being processed by the
                firm's client intake department.
              </p>
            </div>

            <div className="hidden sm:flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-primary/10">
              <span className="text-xl font-bold text-brand-primary">75%</span>
            </div>
          </div>

          {/* PROGRESS */}
          <div className="mt-6">
            <div className="w-full h-3 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
              <div className="h-full w-[75%] bg-brand-primary rounded-full" />
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Application Submitted</span>
              <span>Awaiting Final Approval</span>
            </div>
          </div>

          {/* TIMELINE */}
          <div className="mt-8 space-y-5">
            {timeline.map((item) => (
              <div key={item.id} className="flex items-start gap-4 relative">
                {/* LINE */}
                {item.id !== timeline.length && (
                  <div className="absolute left-[17px] top-10 h-14 w-[2px] bg-gray-200 dark:bg-gray-700" />
                )}

                {/* ICON */}
                <div
                  className={`relative z-10 flex items-center justify-center w-9 h-9 rounded-full border ${
                    item.status === "completed"
                      ? "bg-emerald-100 border-emerald-200 text-emerald-600"
                      : item.status === "pending"
                        ? "bg-amber-100 border-amber-200 text-amber-600"
                        : "bg-gray-100 border-gray-200 text-gray-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400"
                  }`}
                >
                  {item.status === "completed" ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    item.icon
                  )}
                </div>

                {/* CONTENT */}
                <div className="flex-1 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {item.title}
                    </h3>

                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {item.date}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* REQUIREMENTS */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-surface-dark shadow-soft p-6"
        >
          <div className="flex items-center gap-2">
            <FileText className="text-brand-primary" size={20} />

            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Verification Checklist
            </h2>
          </div>

          <div className="mt-5 space-y-4">
            {requirements.map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="mt-1">
                  <CheckCircle2
                    size={18}
                    className={`${
                      index <= 2
                        ? "text-emerald-500"
                        : "text-gray-300 dark:text-gray-600"
                    }`}
                  />
                </div>

                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {item}
                </p>
              </div>
            ))}
          </div>

          <button className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-primary hover:bg-blue-700 text-white px-4 py-3 text-sm font-medium transition">
            Continue Onboarding
            <ArrowRight size={16} />
          </button>
        </motion.div>
      </div>

      {/* BENEFITS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            title: "Case Collaboration",
            text: "Access live case updates and communicate with assigned legal teams.",
            icon: <Building2 size={22} />,
          },
          {
            title: "Secure Documents",
            text: "Receive contracts, filings, and legal notices directly in your portal.",
            icon: <ShieldCheck size={22} />,
          },
          {
            title: "Priority Support",
            text: "Get dedicated support and consultation scheduling assistance.",
            icon: <UserCheck size={22} />,
          },
        ].map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-surface-dark shadow-soft p-6"
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary">
              {item.icon}
            </div>

            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              {item.title}
            </h3>

            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {item.text}
            </p>
          </motion.div>
        ))}
      </div>

      {/* SUPPORT */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-gradient-to-r from-brand-primary to-blue-700 p-8 text-white shadow-medium"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold">
              Need help with your onboarding?
            </h2>

            <p className="mt-2 text-sm text-blue-100 max-w-2xl">
              Our intake and support team can assist you with missing documents,
              verification issues, and membership activation questions.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className="inline-flex items-center gap-2 rounded-2xl bg-white text-brand-primary px-5 py-3 text-sm font-semibold hover:bg-gray-100 transition">
              <Mail size={16} />
              Contact Support
            </button>

            <button className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-5 py-3 text-sm font-semibold hover:bg-white/10 transition">
              <Phone size={16} />
              Call Intake Team
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
