import {
  FileText,
  UserCheck,
  Scale,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

import { motion } from "framer-motion";

import { useContext } from "react";

import SectionHeading from "@/components/ui/SectionHeading";

import ThemeContext from "@/core/store/ThemeContext";

export default function HowItWorks() {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";

  const steps = [
    {
      icon: FileText,
      title: "Submit Case",
      desc: "Securely submit your legal issue and supporting details through our platform.",
    },
    {
      icon: UserCheck,
      title: "Lawyer Review",
      desc: "Our legal professionals carefully review and assign the right expert.",
    },
    {
      icon: Scale,
      title: "Legal Action",
      desc: "We develop your legal strategy and initiate the appropriate proceedings.",
    },
    {
      icon: CheckCircle,
      title: "Resolution",
      desc: "Receive transparent updates until your matter is successfully resolved.",
    },
  ];

  // Direct color values from your Tailwind config
  const colors = isDark
    ? {
        sectionBg: "#070B1A",
        timelineLine: "linear-gradient(to right, rgba(59,130,246,0.2), rgba(6,182,212,0.3), rgba(99,102,241,0.2))",
        glowBlue: "rgba(59, 130, 246, 0.1)",
        glowIndigo: "rgba(99, 102, 241, 0.1)",
        cardBg: "rgba(255,255,255,0.03)",
        cardBorder: "rgba(255,255,255,0.1)",
        title: "#FFFFFF",
        desc: "#D1D5DB", // gray-300
        stepNumber: "#FFFFFF",
        iconBg: "linear-gradient(to bottom right, #2563EB, #4338CA)",
        iconShadow: "rgba(37, 99, 235, 0.3)",
        hoverGlow: "linear-gradient(to bottom right, rgba(59,130,246,0.1), transparent, rgba(99,102,241,0.1))",
        connectorDotBg: "linear-gradient(to right, #3B82F6, #22D3EE)",
        connectorDotShadow: "rgba(59, 130, 246, 0.7)",
        arrowColor: "#34D399", // emerald-400
        ctaBg: "linear-gradient(to bottom right, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
        ctaBorder: "rgba(255,255,255,0.1)",
        ctaGlow: "rgba(59, 130, 246, 0.1)",
        badgeBg: "rgba(59, 130, 246, 0.1)",
        badgeBorder: "rgba(59, 130, 246, 0.2)",
        badgeText: "#BFDBFE", // blue-200
        ctaTitle: "#FFFFFF",
        ctaDesc: "#D1D5DB",
        btnPrimaryBg: "#2563EB", // blue-600
        btnPrimaryHover: "#1D4ED8", // blue-700
        btnPrimaryActive: "#1E40AF", // blue-800
        btnPrimaryText: "#FFFFFF",
        btnPrimaryShadow: "rgba(37, 99, 235, 0.4)",
        btnSecondaryBg: "rgba(255,255,255,0.04)",
        btnSecondaryBorder: "rgba(255,255,255,0.1)",
        btnSecondaryHover: "rgba(255,255,255,0.08)",
        btnSecondaryText: "#FFFFFF",
      }
    : {
        sectionBg: "#F3F0EA", // background-light
        timelineLine: "linear-gradient(to right, rgba(18,56,90,0.15), rgba(18,56,90,0.25), rgba(18,56,90,0.15))",
        glowBlue: "rgba(18, 56, 90, 0.1)",
        glowIndigo: "rgba(18, 56, 90, 0.08)",
        cardBg: "#FFFDF8", // surface-light
        cardBorder: "#D8D2C8", // border-light
        title: "#1F2933", // text-primary-light
        desc: "#5F6673", // text-muted-light
        stepNumber: "#1F2933",
        iconBg: "linear-gradient(to bottom right, #60A5FA, #93C5FD)", // lighter blue for light theme
        iconShadow: "rgba(96, 165, 250, 0.3)",
        hoverGlow: "linear-gradient(to bottom right, rgba(18,56,90,0.08), transparent, rgba(18,56,90,0.06))",
        connectorDotBg: "linear-gradient(to right, #2563EB, #06B6D4)",
        connectorDotShadow: "rgba(18, 56, 90, 0.5)",
        arrowColor: "#0F8F67", // success green
        ctaBg: "linear-gradient(to bottom right, rgba(18,56,90,0.08), rgba(18,56,90,0.04))",
        ctaBorder: "#D8D2C8",
        ctaGlow: "rgba(18, 56, 90, 0.1)",
        badgeBg: "rgba(18, 56, 90, 0.1)",
        badgeBorder: "rgba(18, 56, 90, 0.2)",
        badgeText: "#12385A", // brand-primary
        ctaTitle: "#1F2933",
        ctaDesc: "#5F6673",
        btnPrimaryBg: "#12385A", // brand-primary
        btnPrimaryHover: "#0D2B47",
        btnPrimaryActive: "#0A1F33",
        btnPrimaryText: "#FFFFFF",
        btnPrimaryShadow: "rgba(18, 56, 90, 0.4)",
        btnSecondaryBg: "#FFFDF8", // surface-light
        btnSecondaryBorder: "#D8D2C8", // border-light
        btnSecondaryHover: "#F5F1EA",
        btnSecondaryText: "#12385A", // brand-primary
      };

  // Custom 3D button styles
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
    backgroundColor: colors.btnPrimaryBg,
    color: colors.btnPrimaryText,
    boxShadow: `0 6px 0 0 ${colors.btnPrimaryActive}, 0 10px 30px ${colors.btnPrimaryShadow}`,
    transition: "transform 0.1s ease, box-shadow 0.1s ease",
    textDecoration: "none",
  };

  const primaryBtnHoverStyle = {
    ...primaryBtnStyle,
    transform: "translateY(-3px)",
    boxShadow: `0 9px 0 0 ${colors.btnPrimaryActive}, 0 15px 40px ${colors.btnPrimaryShadow}`,
  };

  const primaryBtnActiveStyle = {
    ...primaryBtnStyle,
    transform: "translateY(3px)",
    boxShadow: `0 3px 0 0 ${colors.btnPrimaryActive}, 0 5px 15px ${colors.btnPrimaryShadow}`,
  };

  const secondaryBtnStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem 1.75rem",
    fontSize: "1rem",
    fontWeight: 600,
    fontFamily: "'Poppins', ui-sans-serif, system-ui",
    borderRadius: "1.5rem",
    border: `1px solid ${colors.btnSecondaryBorder}`,
    cursor: "pointer",
    backgroundColor: colors.btnSecondaryBg,
    color: colors.btnSecondaryText,
    transition: "all 0.2s ease",
    textDecoration: "none",
    backdropFilter: "blur(24px)",
  };

  const secondaryBtnHoverStyle = {
    ...secondaryBtnStyle,
    backgroundColor: colors.btnSecondaryHover,
    transform: "scale(1.05)",
  };

  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden py-24 px-6 lg:px-16"
      style={{ backgroundColor: colors.sectionBg }}
    >
      {/* Background Ambient Glow */}
      <div className="absolute inset-0">
        <div
          className="absolute top-[-120px] left-[-80px] w-[400px] h-[400px] rounded-full blur-3xl"
          style={{ backgroundColor: colors.glowBlue }}
        />
        <div
          className="absolute bottom-[-120px] right-[-80px] w-[420px] h-[420px] rounded-full blur-3xl"
          style={{ backgroundColor: colors.glowIndigo }}
        />
      </div>

      <div className="relative z-10">
        {/* Heading */}
        <SectionHeading
          title="How It Works"
          subtitle="A modern, transparent legal process designed to guide you from consultation to successful resolution."
          variant={isDark ? "dark" : "light"}
        />

        {/* Timeline Steps */}
        <div className="relative max-w-7xl mx-auto mt-24">
          {/* Timeline Line */}
          <div
            className="hidden lg:block absolute top-24 left-0 w-full h-[2px]"
            style={{ backgroundImage: colors.timelineLine }}
          />

          <div
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative"
            style={{ color: colors.title }}
          >
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.6,
                    delay: index * 0.1,
                  }}
                  viewport={{ once: true }}
                  className="relative"
                >
                  {/* Step Connector Dot */}
                  <div
                    className="hidden lg:flex absolute top-[68px] left-1/2 -translate-x-1/2 z-20 w-5 h-5 rounded-full shadow-[0_0_25px] border"
                    style={{
                      backgroundImage: colors.connectorDotBg,
                      boxShadow: `0 0 25px ${colors.connectorDotShadow}`,
                      borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(18,56,90,0.2)",
                      borderWidth: "1px",
                    }}
                  />

                  {/* Step Card */}
                  <motion.div
                    whileHover={{ y: -10 }}
                    className="group relative overflow-hidden rounded-[28px] backdrop-blur-2xl p-8 shadow-[0_20px_70px_rgba(0,0,0,0.45)]"
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
                      style={{ backgroundImage: colors.hoverGlow }}
                    />

                    {/* Step Number */}
                    <div
                      className="absolute top-5 right-5 text-5xl font-black"
                      style={{ color: colors.stepNumber }}
                    >
                      0{index + 1}
                    </div>

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
                        {step.title}
                      </h3>

                      <p className="mt-4 leading-relaxed text-sm" style={{ color: colors.desc }}>
                        {step.desc}
                      </p>
                    </div>

                    {/* Arrow */}
                    <div className="relative mt-8 flex items-center gap-2 text-sm font-medium opacity-100 cursor-pointer transition duration-300" style={{ color: colors.arrowColor }}>
                      Continue Process
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="relative mt-24 max-w-6xl mx-auto overflow-hidden rounded-[32px] backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.45)]"
          style={{
            backgroundImage: colors.ctaBg,
            borderColor: colors.ctaBorder,
            borderWidth: "1px",
            borderStyle: "solid",
          }}
        >
          {/* Glow */}
          <div
            className="absolute top-[-100px] left-[-80px] w-[320px] h-[320px] rounded-full blur-3xl"
            style={{ backgroundColor: colors.ctaGlow }}
          />

          <div className="relative z-10 px-8 py-14 md:px-14 text-center">
            {/* Badge */}
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
              Trusted Legal Process
            </div>

            {/* Heading */}
            <h3 className="mt-6 text-3xl md:text-5xl font-black leading-tight" style={{ color: colors.ctaTitle }}>
              Ready To Begin
              <span className="block bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(to right, #2563EB, #06B6D4, #6366F1)" }}>
                Your Legal Journey?
              </span>
            </h3>

            {/* Text */}
            <p className="mt-6 max-w-2xl mx-auto leading-relaxed" style={{ color: colors.ctaDesc }}>
              Start your case today with experienced legal professionals
              committed to delivering transparent, efficient, and results-driven
              legal services.
            </p>

            {/* Buttons */}
            <div className="mt-10 flex flex-wrap justify-center gap-5">
              {/* Primary - Start Your Case */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={primaryBtnStyle}
                onMouseEnter={(e) => Object.assign(e.target.style, primaryBtnHoverStyle)}
                onMouseLeave={(e) => Object.assign(e.target.style, primaryBtnStyle)}
                onMouseDown={(e) => Object.assign(e.target.style, primaryBtnActiveStyle)}
                onMouseUp={(e) => Object.assign(e.target.style, primaryBtnHoverStyle)}
              >
                Start Your Case
              </motion.button>

              {/* Secondary - Learn More */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                style={secondaryBtnStyle}
              >
                Learn More
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}