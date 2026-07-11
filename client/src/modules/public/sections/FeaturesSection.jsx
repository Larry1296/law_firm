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

import { useContext } from "react";

import SectionHeading from "@/components/ui/SectionHeading";

import ThemeContext from "@/core/store/ThemeContext";

export default function FeaturesSection() {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";

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

  // Direct color values from your Tailwind config (reliable fallback)
  // Light: background:#F3F0EA, surface:#FFFDF8, border:#D8D2C8, text-primary:#1F2933, text-muted:#5F6673
  // Dark: background:#0B1220, surface:#111B2E, border:#1F2A44, text-primary:#E5E7EB, text-muted:#94A3B8
  const colors = isDark
    ? {
        sectionBg: "#0B1220",
        cardBg: "#111B2E",
        cardBorder: "#1F2A44",
        title: "#E5E7EB",
        desc: "#94A3B8",
        statLabel: "#94A3B8",
        action: "#93C5FD", // blue-300
        badgeBg: "rgba(59, 130, 246, 0.1)",
        badgeBorder: "rgba(59, 130, 246, 0.2)",
        badgeText: "#BFDBFE", // blue-200
        statCardBg: "#111B2E",
        statCardBorder: "#1F2A44",
        glow: "rgba(59, 130, 246, 0.1)",
        bottomSectionBg: "linear-gradient(to bottom right, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
        iconBg: "linear-gradient(to bottom right, #2563EB, #4338CA)",
        iconShadow: "rgba(37, 99, 235, 0.3)",
      }
    : {
        sectionBg: "#F3F0EA",
        cardBg: "#FFFDF8",
        cardBorder: "#D8D2C8",
        title: "#1F2933",
        desc: "#5F6673",
        statLabel: "#5F6673",
        action: "#2563EB", // blue-600
        badgeBg: "rgba(59, 130, 246, 0.1)",
        badgeBorder: "rgba(59, 130, 246, 0.2)",
        badgeText: "#1E40AF", // blue-800
        statCardBg: "#FFFDF8",
        statCardBorder: "#D8D2C8",
        glow: "rgba(59, 130, 246, 0.1)",
        bottomSectionBg: "linear-gradient(to bottom right, rgba(59,130,246,0.05), rgba(99,102,241,0.05))",
        iconBg: "linear-gradient(to bottom right, #60A5FA, #93C5FD)", // lighter blue for light theme
        iconShadow: "rgba(96, 165, 250, 0.3)",
      };

  return (
    <section
      id="features"
      className="relative overflow-hidden py-24 px-6 lg:px-16"
      style={{ backgroundColor: colors.sectionBg }}
    >
      {/* Ambient Background */}
      <div className="absolute inset-0">
        <div
          className="absolute top-[-140px] right-[-80px] w-[420px] h-[420px] rounded-full blur-3xl"
          style={{ backgroundColor: colors.glow }}
        />
        <div
          className="absolute bottom-[-140px] left-[-80px] w-[420px] h-[420px] rounded-full blur-3xl"
          style={{ backgroundColor: "rgba(99, 102, 241, 0.1)" }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Heading */}
        <SectionHeading
          title="Powerful Platform Features"
          subtitle="Everything your legal team needs to manage cases securely, efficiently, and intelligently in one unified platform."
          variant={isDark ? "dark" : "light"}
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
                whileHover={{ y: -10 }}
                className="group relative overflow-hidden rounded-[30px] backdrop-blur-2xl p-8 shadow-[0_20px_70px_rgba(0,0,0,0.45)]"
                style={{
                  backgroundColor: colors.cardBg,
                  borderColor: colors.cardBorder,
                  borderWidth: "1px",
                  borderStyle: "solid",
                }}
              >
                {/* Hover Glow */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500"
                  style={{
                    background: "linear-gradient(to bottom right, rgba(59,130,246,0.1), transparent, rgba(99,102,241,0.1))",
                  }}
                />

                {/* Top Highlight */}
                <div
                  className="absolute top-0 left-0 w-0 h-[2px] group-hover:w-full transition-all duration-500"
                  style={{ background: "linear-gradient(to right, #60A5FA, #22D3EE)" }}
                />

                {/* Icon */}
                <motion.div
                  className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    backgroundImage: colors.iconBg,
                    boxShadow: `
                      0 10px 30px ${colors.iconShadow},
                      0 4px 6px -2px ${colors.iconShadow},
                      inset 0 1px 0 rgba(255,255,255,0.2),
                      inset 0 -1px 0 rgba(0,0,0,0.1)
                    `,
                    transform: "translateZ(0)",
                  }}
                  whileHover={{
                    scale: 1.1,
                    boxShadow: `
                      0 15px 40px ${colors.iconShadow},
                      0 8px 10px -4px ${colors.iconShadow},
                      inset 0 1px 0 rgba(255,255,255,0.25),
                      inset 0 -1px 0 rgba(0,0,0,0.1)
                    `,
                  }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <Icon className="w-8 h-8 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
                  {/* 3D Edge Highlight */}
                  <div className="absolute inset-0 rounded-2xl" style={{
                    background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)",
                    pointerEvents: "none",
                  }} />
                  {/* Bottom Edge */}
                  <div className="absolute bottom-0 left-2 right-2 h-1 rounded-b-2xl" style={{
                    background: "linear-gradient(to right, transparent, rgba(0,0,0,0.2), transparent)",
                    pointerEvents: "none",
                  }} />
                </motion.div>

                {/* Content */}
                <div className="relative mt-7">
                  <h3 className="text-2xl font-bold" style={{ color: colors.title }}>
                    {item.title}
                  </h3>

                  <p className="mt-4 leading-relaxed text-sm" style={{ color: colors.desc }}>
                    {item.desc}
                  </p>
                </div>

                {/* Bottom Hover Action */}
                <div className="relative mt-8 flex items-center gap-2 text-sm font-medium opacity-100 transition duration-300" style={{ color: colors.action }}>
                  Explore Feature
                  <ArrowRight className="w-4 h-4" />
                </div>

                {/* Glass Reflection */}
                <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.06), transparent)" }} />
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
          className="relative mt-24 overflow-hidden rounded-[36px] backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.45)]"
          style={{
            backgroundColor: colors.cardBg,
            borderColor: colors.cardBorder,
            borderWidth: "1px",
            borderStyle: "solid",
            backgroundImage: colors.bottomSectionBg,
          }}
        >
          {/* Glow */}
          <div
            className="absolute top-[-100px] right-[-60px] w-[320px] h-[320px] rounded-full blur-3xl"
            style={{ backgroundColor: colors.glow }}
          />

          <div className="relative z-10 grid lg:grid-cols-2 gap-10 p-10 lg:p-14 items-center">
            {/* Left */}
            <div>
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm"
                style={{
                  backgroundColor: colors.badgeBg,
                  borderColor: colors.badgeBorder,
                  borderWidth: "1px",
                  borderStyle: "solid",
                  color: colors.badgeText,
                }}
              >
                Smart Legal Technology
              </div>

              <h3 className="mt-6 text-3xl md:text-5xl font-black leading-tight" style={{ color: colors.title }}>
                Built For Modern
                <span className="block bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(to right, #60A5FA, #22D3EE, #818CF8)" }}>
                  Legal Operations
                </span>
              </h3>

              <p className="mt-6 leading-relaxed" style={{ color: colors.desc }}>
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
                  className="rounded-2xl backdrop-blur-xl p-6 text-center"
                  style={{
                    backgroundColor: colors.statCardBg,
                    borderColor: colors.statCardBorder,
                    borderWidth: "1px",
                    borderStyle: "solid",
                  }}
                >
                  <h4 className="text-3xl font-black bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(to right, #60A5FA, #22D3EE)" }}>
                    {stat.value}
                  </h4>

                  <p className="mt-2 text-sm" style={{ color: colors.statLabel }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}