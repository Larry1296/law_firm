// src/modules/portal/profile/PortalProfile.jsx

import { useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Camera,
  Lock,
  Bell,
  Save,
  CreditCard,
  FileText,
  CheckCircle2,
} from "lucide-react";

export default function PortalProfile() {
  const [profile, setProfile] = useState({
    fullName: "Self Registered Client",
    email: "clientportal@test.com",
    phone: "+254 700 000 001",
    nationalId: "12345678",
    address: "Nairobi, Kenya",
    bio: "Interested in legal consultation and onboarding into the firm's client network.",
  });

  const handleChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  };

  const stats = [
    {
      label: "Uploaded Documents",
      value: 12,
      icon: <FileText size={18} />,
    },
    {
      label: "Consultations",
      value: 4,
      icon: <User size={18} />,
    },
    {
      label: "Verification Status",
      value: "Verified",
      icon: <CheckCircle2 size={18} />,
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            My Profile
          </h1>

          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage your personal information, verification details, and account
            preferences.
          </p>
        </div>

        <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-primary hover:bg-blue-700 text-white px-5 py-3 text-sm font-semibold transition">
          <Save size={18} />
          Save Changes
        </button>
      </div>

      {/* PROFILE HERO */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl overflow-hidden shadow-soft border border-gray-200 dark:border-gray-800 bg-white dark:bg-surface-dark"
      >
        {/* COVER */}
        <div className="h-40 bg-gradient-to-r from-brand-primary via-blue-600 to-indigo-600 relative">
          <button className="absolute top-4 right-4 flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur px-4 py-2 text-sm text-white hover:bg-white/20 transition">
            <Camera size={16} />
            Change Cover
          </button>
        </div>

        {/* PROFILE */}
        <div className="px-6 pb-6">
          <div className="-mt-16 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              {/* AVATAR */}
              <div className="relative">
                <div className="w-32 h-32 rounded-3xl border-4 border-white dark:border-surface-dark bg-brand-primary text-white flex items-center justify-center text-4xl font-bold shadow-medium">
                  S
                </div>

                <button className="absolute bottom-2 right-2 w-10 h-10 rounded-xl bg-white dark:bg-gray-900 shadow flex items-center justify-center hover:scale-105 transition">
                  <Camera size={16} className="text-brand-primary" />
                </button>
              </div>

              {/* INFO */}
              <div className="pt-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {profile.fullName}
                  </h2>

                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-3 py-1 text-xs font-semibold">
                    <ShieldCheck size={14} />
                    Verified Client
                  </span>
                </div>

                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Client Portal Account
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <div className="inline-flex items-center gap-2 rounded-xl bg-gray-100 dark:bg-gray-800 px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                    <Mail size={16} />
                    {profile.email}
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-xl bg-gray-100 dark:bg-gray-800 px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                    <Phone size={16} />
                    {profile.phone}
                  </div>
                </div>
              </div>
            </div>

            {/* QUICK STATS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full lg:w-auto">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-5 py-4 min-w-[160px]"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-brand-primary">{stat.icon}</div>

                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {stat.value}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* CONTENT GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* LEFT SIDE */}
        <div className="xl:col-span-2 space-y-6">
          {/* PERSONAL INFORMATION */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-surface-dark shadow-soft p-6"
          >
            <div className="flex items-center gap-2">
              <User className="text-brand-primary" size={20} />

              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Personal Information
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Full Name
                </label>

                <input
                  type="text"
                  name="fullName"
                  value={profile.fullName}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email Address
                </label>

                <input
                  type="email"
                  name="email"
                  value={profile.email}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Phone Number
                </label>

                <input
                  type="text"
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  National ID
                </label>

                <input
                  type="text"
                  name="nationalId"
                  value={profile.nationalId}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Address
                </label>

                <div className="relative mt-2">
                  <MapPin
                    size={16}
                    className="absolute left-4 top-4 text-gray-400"
                  />

                  <input
                    type="text"
                    name="address"
                    value={profile.address}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pl-11 pr-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Bio
                </label>

                <textarea
                  rows={5}
                  name="bio"
                  value={profile.bio}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
                />
              </div>
            </div>
          </motion.div>

          {/* SECURITY */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-surface-dark shadow-soft p-6"
          >
            <div className="flex items-center gap-2">
              <Lock className="text-brand-primary" size={20} />

              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Security Settings
              </h2>
            </div>

            <div className="mt-6 space-y-4">
              {[
                "Enable Two-Factor Authentication",
                "Email Login Notifications",
                "Secure Document Access",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-2xl border border-gray-200 dark:border-gray-700 px-5 py-4"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {item}
                    </p>

                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Manage your account security preferences.
                    </p>
                  </div>

                  <button className="w-12 h-7 rounded-full bg-brand-primary relative">
                    <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* RIGHT SIDE */}
        <div className="space-y-6">
          {/* ACCOUNT STATUS */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-surface-dark shadow-soft p-6"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-brand-primary" size={20} />

              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Account Status
              </h2>
            </div>

            <div className="mt-6 space-y-4">
              {[
                {
                  label: "Portal Account",
                  value: "Active",
                  color:
                    "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                },
                {
                  label: "Identity Verification",
                  value: "Verified",
                  color:
                    "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300",
                },
                {
                  label: "Firm Membership",
                  value: "Pending",
                  color:
                    "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between"
                >
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {item.label}
                  </p>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${item.color}`}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* PAYMENT METHODS */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-surface-dark shadow-soft p-6"
          >
            <div className="flex items-center gap-2">
              <CreditCard className="text-brand-primary" size={20} />

              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Payment Methods
              </h2>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Visa Ending 2481
                    </p>

                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Expires 10/28
                    </p>
                  </div>

                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary">
                    Default
                  </span>
                </div>
              </div>

              <button className="w-full rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 py-4 text-sm text-gray-600 dark:text-gray-400 hover:border-brand-primary hover:text-brand-primary transition">
                + Add New Payment Method
              </button>
            </div>
          </motion.div>

          {/* NOTIFICATIONS */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-surface-dark shadow-soft p-6"
          >
            <div className="flex items-center gap-2">
              <Bell className="text-brand-primary" size={20} />

              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Notification Preferences
              </h2>
            </div>

            <div className="mt-6 space-y-4">
              {[
                "Consultation Reminders",
                "Document Upload Alerts",
                "Firm Membership Updates",
                "Billing Notifications",
              ].map((item) => (
                <div key={item} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {item}
                  </span>

                  <button className="w-11 h-6 rounded-full bg-brand-primary relative">
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
