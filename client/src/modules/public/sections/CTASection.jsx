import { ArrowRight, ShieldCheck, Scale, Sparkles } from "lucide-react";

import { motion } from "framer-motion";

import { useContext } from "react";

import ThemeContext from "@/core/store/ThemeContext";

export default function CTASection() {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";

  // Direct color values from your Tailwind config
  const colors = isDark
    ? {
        sectionBg: "#070B1A",
        containerBg: "linear-gradient(to bottom right, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
        containerBorder: "rgba(255,255,255,0.1)",
        glowBlue: "rgba(59, 130, 246, 0.1)",
        glowIndigo: "rgba(99, 102, 241, 0.1)",
        badgeBg: "rgba(59, 130, 246, 0.1)",
        badgeBorder: "rgba(59, 130, 246, 0.2)",
        badgeText: "#BFDBFE", // blue-200
        title: "#FFFFFF",
        subtitle: "#D1D5DB", // gray-300
        statCardBg: "rgba(255,255,255,0.04)",
        statCardBorder: "rgba(255,255,255,0.1)",
        statLabel: "#9CA3AF", // gray-400
        primaryBtnBg: "#2563EB", // blue-600
        primaryBtnHover: "#1D4ED8", // blue-700
        primaryBtnActive: "#1E40AF", // blue-800
        primaryBtnText: "#FFFFFF",
        primaryBtnShadow: "rgba(37, 99, 235, 0.4)",
        secondaryBtnBg: "rgba(255,255,255,0.04)",
        secondaryBtnBorder: "rgba(255,255,255,0.1)",
        secondaryBtnHover: "rgba(255,255,255,0.08)",
        secondaryBtnText: "#FFFFFF",
        glassReflection: "rgba(255,255,255,0.08)",
      }
    : {
        sectionBg: "#F3F0EA",
        containerBg: "linear-gradient(to bottom right, rgba(18, 56, 90, 0.08), rgba(18, 56, 90, 0.04))",
        containerBorder: "#D8D2C8",
        glowBlue: "rgba(18, 56, 90, 0.1)",
        glowIndigo: "rgba(18, 56, 90, 0.08)",
        badgeBg: "rgba(18, 56, 90, 0.1)",
        badgeBorder: "rgba(18, 56, 90, 0.2)",
        badgeText: "#12385A", // brand-primary
        title: "#1F2933", // text-primary-light
        subtitle: "#5F6673", // text-muted-light
        statCardBg: "#FFFDF8", // surface-light
        statCardBorder: "#D8D2C8", // border-light
        statLabel: "#5F6673", // text-muted-light
        primaryBtnBg: "#12385A", // brand-primary
        primaryBtnHover: "#0D2B47", // darker brand-primary
        primaryBtnActive: "#0A1F33", // even darker
        primaryBtnText: "#FFFFFF",
        primaryBtnShadow: "rgba(18, 56, 90, 0.4)",
        secondaryBtnBg: "#FFFDF8", // surface-light
        secondaryBtnBorder: "#D8D2C8", // border-light
        secondaryBtnHover: "#F5F1EA", // slightly darker surface
        secondaryBtnText: "#12385A", // brand-primary
        glassReflection: "rgba(18, 56, 90, 0.06)",
      };

  const stats = [
    { icon: ShieldCheck, value: "100%", label: "Secure Platform" },
    { icon: Scale, value: "24/7", label: "Legal Access" },
    { icon: Sparkles, value: "Smart", label: "Automation" },
    { icon: ArrowRight, value: "Fast", label: "Workflow" },
  ];

  // Add icon colors to the colors object
  const iconColors = isDark
    ? {
        iconBg: "linear-gradient(to bottom right, #2563EB, #4338CA)",
        iconShadow: "rgba(37, 99, 235, 0.3)",
      }
    : {
        iconBg: "linear-gradient(to bottom right, #60A5FA, #93C5FD)",
        iconShadow: "rgba(96, 165, 250, 0.3)",
      };

  // Custom 3D button styles (replaces Button3D)
  const primaryBtnStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem 2.5rem",
    fontSize: "1rem",
    fontWeight: 700,
    fontFamily: "'Poppins', ui-sans-serif, system-ui",
    borderRadius: "1.5rem",
    border: "none",
    cursor: "pointer",
    position: "relative",
    overflow: "hidden",
    backgroundColor: colors.primaryBtnBg,
    color: colors.primaryBtnText,
    boxShadow: `0 6px 0 0 ${colors.primaryBtnActive}, 0 10px 30px ${colors.primaryBtnShadow}`,
    transition: "transform 0.1s ease, box-shadow 0.1s ease",
    textDecoration: "none",
  };

  const primaryBtnHoverStyle = {
    ...primaryBtnStyle,
    transform: "translateY(-3px)",
    boxShadow: `0 9px 0 0 ${colors.primaryBtnActive}, 0 15px 40px ${colors.primaryBtnShadow}`,
  };

  const primaryBtnActiveStyle = {
    ...primaryBtnStyle,
    transform: "translateY(3px)",
    boxShadow: `0 3px 0 0 ${colors.primaryBtnActive}, 0 5px 15px ${colors.primaryBtnShadow}`,
  };

  const secondaryBtnStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "1rem 2rem",
    fontSize: "1rem",
    fontWeight: 600,
    fontFamily: "'Poppins', ui-sans-serif, system-ui",
    borderRadius: "1.5rem",
    border: `1px solid ${colors.secondaryBtnBorder}`,
    cursor: "pointer",
    backgroundColor: colors.secondaryBtnBg,
    color: colors.secondaryBtnText,
    transition: "all 0.2s ease",
    textDecoration: "none",
    backdropFilter: "blur(24px)",
  };

  const secondaryBtnHoverStyle = {
    ...secondaryBtnStyle,
    backgroundColor: colors.secondaryBtnHover,
    transform: "scale(1.05)",
  };

  return (
    <section
      className="relative overflow-hidden py-28 px-6 lg:px-16"
      style={{ backgroundColor: colors.sectionBg }}
    >
      {/* Ambient Background */}
      <div className="absolute inset-0">
        <div
          className="absolute top-[-120px] left-[-100px] w-[420px] h-[420px] rounded-full blur-3xl"
          style={{ backgroundColor: colors.glowBlue }}
        />
        <div
          className="absolute bottom-[-140px] right-[-100px] w-[450px] h-[450px] rounded-full blur-3xl"
          style={{ backgroundColor: colors.glowIndigo }}
        />
      </div>

      {/* Floating Glow Ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        className="absolute left-1/2 top-1/2 w-[700px] h-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ borderColor: isDark ? "rgba(59,130,246,0.1)" : "rgba(18,56,90,0.1)" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Main CTA Container */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-[40px] backdrop-blur-2xl shadow-[0_30px_100px_rgba(0,0,0,0.5)]"
          style={{
            backgroundImage: colors.containerBg,
            borderColor: colors.containerBorder,
            borderWidth: "1px",
            borderStyle: "solid",
          }}
        >
          {/* Glow Effects */}
          <div
            className="absolute top-[-120px] right-[-80px] w-[320px] h-[320px] rounded-full blur-3xl"
            style={{ backgroundColor: colors.glowBlue }}
          />
          <div
            className="absolute bottom-[-120px] left-[-80px] w-[320px] h-[320px] rounded-full blur-3xl"
            style={{ backgroundColor: colors.glowIndigo }}
          />

          {/* Glass Reflection */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: `linear-gradient(to bottom, ${colors.glassReflection}, transparent)` }}
          />

          <div className="relative z-10 px-8 py-16 md:px-16 lg:px-20 text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full backdrop-blur-xl text-sm"
              style={{
                backgroundColor: colors.badgeBg,
                borderColor: colors.badgeBorder,
                borderWidth: "1px",
                borderStyle: "solid",
                color: colors.badgeText,
              }}
            >
              <Sparkles className="w-4 h-4" />
              Modern Legal Management Platform
            </motion.div>

            {/* Heading */}
            <motion.h2
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="mt-8 text-4xl md:text-6xl font-black leading-tight"
              style={{ color: colors.title }}
            >
              Ready To Transform
              <span className="block bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(to right, #2563EB, #06B6D4, #6366F1)" }}>
                Your Legal Workflow?
              </span>
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              viewport={{ once: true }}
              className="mt-8 max-w-3xl mx-auto text-lg md:text-xl leading-relaxed"
              style={{ color: colors.subtitle }}
            >
              Join modern law firms and legal professionals using LegalAssist to
              streamline case management, enhance collaboration, and improve
              operational efficiency.
            </motion.p>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              viewport={{ once: true }}
              className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-5"
            >
              {stats.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="rounded-2xl backdrop-blur-xl p-6"
                    style={{
                      backgroundColor: colors.statCardBg,
                      borderColor: colors.statCardBorder,
                      borderWidth: "1px",
                      borderStyle: "solid",
                    }}
                  >
                    <motion.div
                      className="relative w-12 h-12 mx-auto rounded-2xl flex items-center justify-center"
                      style={{
                        backgroundImage: iconColors.iconBg,
                        boxShadow: `
                          0 8px 24px ${iconColors.iconShadow},
                          0 3px 5px -2px ${iconColors.iconShadow},
                          inset 0 1px 0 rgba(255,255,255,0.2),
                          inset 0 -1px 0 rgba(0,0,0,0.1)
                        `,
                        transform: "translateZ(0)",
                      }}
                      whileHover={{
                        scale: 1.1,
                        boxShadow: `
                          0 12px 32px ${iconColors.iconShadow},
                          0 6px 8px -4px ${iconColors.iconShadow},
                          inset 0 1px 0 rgba(255,255,255,0.25),
                          inset 0 -1px 0 rgba(0,0,0,0.1)
                        `,
                      }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      <Icon className="w-6 h-6 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
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

                    <h3 className="mt-4 text-2xl font-black bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(to right, #2563EB, #06B6D4)" }}>
                      {item.value}
                    </h3>

                    <p className="mt-2 text-sm" style={{ color: colors.statLabel }}>{item.label}</p>
                  </div>
                );
              })}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              viewport={{ once: true }}
              className="mt-14 flex flex-wrap justify-center gap-5"
            >
              {/* Primary - Get Started (Custom 3D Button) */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={primaryBtnStyle}
                onMouseEnter={(e) => Object.assign(e.target.style, primaryBtnHoverStyle)}
                onMouseLeave={(e) => Object.assign(e.target.style, primaryBtnStyle)}
                onMouseDown={(e) => Object.assign(e.target.style, primaryBtnActiveStyle)}
                onMouseUp={(e) => Object.assign(e.target.style, primaryBtnHoverStyle)}
              >
                Get Started
              </motion.button>

              {/* Secondary - Learn More */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                style={secondaryBtnStyle}
              >
                Learn More
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}