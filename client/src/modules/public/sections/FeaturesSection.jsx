import {
  ShieldCheck,
  CalendarDays,
  MessageSquareText,
  FolderKanban,
  BarChart3,
  Lock,
  ArrowRight,
} from "lucide-react";

import { motion } from "framer-motion";

import SectionHeading from "@/components/ui/SectionHeading";

export default function FeaturesSection() {
  const features = [
    {
      icon: FolderKanban,
      title: "Case Tracking",
      desc: "Monitor case progress in real time with timelines, updates, and intelligent workflow management.",
    },
    {
      icon: MessageSquareText,
      title: "Secure Messaging",
      desc: "Communicate with legal professionals through encrypted, case-linked messaging channels.",
    },
    {
      icon: CalendarDays,
      title: "Court Scheduling",
      desc: "Manage hearings, deadlines, and appointments with smart reminders and synced calendars.",
    },
    {
      icon: ShieldCheck,
      title: "Document Security",
      desc: "Store and organize legal documents securely with advanced protection and version control.",
    },
    {
      icon: BarChart3,
      title: "Case Analytics",
      desc: "Gain insights into performance metrics, workload distribution, and legal operations.",
    },
    {
      icon: Lock,
      title: "Role-Based Access",
      desc: "Dedicated dashboards and controlled permissions for clients, lawyers, and administrators.",
    },
  ];

  return (
    <section
      id="features"
      className="relative overflow-hidden bg-[#050816] py-24 px-6 lg:px-16"
    >
      {/* Ambient Background */}
      <div className="absolute inset-0">
        <div className="absolute top-[-140px] right-[-80px] w-[420px] h-[420px] rounded-full bg-blue-500/10 blur-3xl" />

        <div className="absolute bottom-[-140px] left-[-80px] w-[420px] h-[420px] rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Heading */}
        <SectionHeading
          title="Powerful Platform Features"
          subtitle="Everything your legal team needs to manage cases securely, efficiently, and intelligently in one unified platform."
          variant="dark"
        />

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8 mt-20">
          {features.map((item, index) => {
            const Icon = item.icon;

            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.08,
                }}
                viewport={{ once: true }}
                whileHover={{
                  y: -10,
                }}
                className="group relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-8 shadow-[0_20px_70px_rgba(0,0,0,0.45)]"
              >
                {/* Hover Glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 bg-gradient-to-br from-blue-500/10 via-transparent to-indigo-500/10" />

                {/* Top Highlight */}
                <div className="absolute top-0 left-0 w-0 h-[2px] group-hover:w-full transition-all duration-500 bg-gradient-to-r from-blue-400 to-cyan-300" />

                {/* Icon */}
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Icon className="w-8 h-8 text-white" />
                </div>

                {/* Content */}
                <div className="relative mt-7">
                  <h3 className="text-2xl font-bold text-white">
                    {item.title}
                  </h3>

                  <p className="mt-4 text-gray-300 leading-relaxed text-sm">
                    {item.desc}
                  </p>
                </div>

                {/* Bottom Hover Action */}
                <div className="relative mt-8 flex items-center gap-2 text-blue-300 text-sm font-medium opacity-100 transition duration-300">
                  Explore Feature
                  <ArrowRight className="w-4 h-4" />
                </div>

                {/* Glass Reflection */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-transparent pointer-events-none" />
              </motion.div>
            );
          })}
        </div>

        {/* Bottom Highlight Section */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="relative mt-24 overflow-hidden rounded-[36px] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.03] backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.45)]"
        >
          {/* Glow */}
          <div className="absolute top-[-100px] right-[-60px] w-[320px] h-[320px] rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative z-10 grid lg:grid-cols-2 gap-10 p-10 lg:p-14 items-center">
            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-400/20 bg-blue-500/10 text-blue-200 text-sm">
                Smart Legal Technology
              </div>

              <h3 className="mt-6 text-3xl md:text-5xl font-black text-white leading-tight">
                Built For Modern
                <span className="block bg-gradient-to-r from-blue-300 via-cyan-200 to-indigo-300 bg-clip-text text-transparent">
                  Legal Operations
                </span>
              </h3>

              <p className="mt-6 text-gray-300 leading-relaxed">
                Streamline legal workflows, enhance collaboration, and improve
                case management efficiency with intelligent tools designed for
                modern law firms and legal teams.
              </p>
            </div>

            {/* Right Stats */}
            <div className="grid grid-cols-2 gap-5">
              {[
                { value: "24/7", label: "Platform Access" },
                { value: "100%", label: "Secure Storage" },
                { value: "Real-Time", label: "Case Updates" },
                { value: "Multi-Role", label: "User Dashboards" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 text-center"
                >
                  <h4 className="text-3xl font-black bg-gradient-to-r from-blue-300 to-cyan-200 bg-clip-text text-transparent">
                    {stat.value}
                  </h4>

                  <p className="mt-2 text-sm text-gray-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
