import {
  Scale,
  Briefcase,
  ShieldCheck,
  FileText,
  Gavel,
  Users,
  ArrowRight,
} from "lucide-react";

import { motion } from "framer-motion";

import { useContext } from "react";

import SectionHeading from "@/components/ui/SectionHeading";

import ThemeContext from "@/core/store/ThemeContext";

export default function ServicesSection() {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";

  const services = [
    {
      icon: Scale,
      title: "Civil Litigation",
      desc: "Strategic representation in disputes involving contracts, property, and civil rights.",
    },
    {
      icon: Briefcase,
      title: "Corporate Law",
      desc: "Comprehensive legal solutions for businesses, governance, and compliance.",
    },
    {
      icon: ShieldCheck,
      title: "Criminal Defense",
      desc: "Strong legal defense focused on protecting your rights and reputation.",
    },
    {
      icon: FileText,
      title: "Contract Drafting",
      desc: "Professionally structured agreements tailored to your legal interests.",
    },
    {
      icon: Gavel,
      title: "Court Representation",
      desc: "Experienced courtroom advocacy across multiple legal jurisdictions.",
    },
    {
      icon: Users,
      title: "Legal Consultation",
      desc: "Personalized legal guidance designed around your unique situation.",
    },
  ];

  // Direct color values from your Tailwind config
  const colors = isDark
    ? {
        sectionBg: "#050816",
        glowBlue: "rgba(59, 130, 246, 0.1)",
        glowIndigo: "rgba(99, 102, 241, 0.1)",
        cardBg: "rgba(255,255,255,0.03)",
        cardBorder: "rgba(255,255,255,0.1)",
        title: "#FFFFFF",
        desc: "#D1D5DB", // gray-300
        iconBg: "linear-gradient(to bottom right, #2563EB, #4338CA)",
        iconShadow: "rgba(37, 99, 235, 0.3)",
        hoverGlow: "linear-gradient(to bottom right, rgba(59,130,246,0.1), transparent, rgba(99,102,241,0.1))",
        topGlowLine: "linear-gradient(to right, #60A5FA, #22D3EE)",
        linkColor: "#60A5FA", // blue-300
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
        glowBlue: "rgba(18, 56, 90, 0.1)",
        glowIndigo: "rgba(18, 56, 90, 0.08)",
        cardBg: "#FFFDF8", // surface-light
        cardBorder: "#D8D2C8", // border-light
        title: "#1F2933", // text-primary-light
        desc: "#5F6673", // text-muted-light
        iconBg: "linear-gradient(to bottom right, #60A5FA, #93C5FD)", // lighter blue for light theme
        iconShadow: "rgba(96, 165, 250, 0.3)",
        hoverGlow: "linear-gradient(to bottom right, rgba(18,56,90,0.08), transparent, rgba(18,56,90,0.06))",
        topGlowLine: "linear-gradient(to right, #2563EB, #06B6D4)",
        linkColor: "#2563EB", // blue-600
        ctaBg: "linear-gradient(to bottom right, rgba(18,56,90,0.08), rgba(18,56,90,0.04))",
        ctaBorder: "#D8D2C8", // border-light
        ctaGlow: "rgba(18, 56, 90, 0.1)",
        badgeBg: "rgba(18, 56, 90, 0.1)",
        badgeBorder: "rgba(18, 56, 90, 0.2)",
        badgeText: "#12385A", // brand-primary
        ctaTitle: "#1F2933", // text-primary-light
        ctaDesc: "#5F6673", // text-muted-light
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
      id="services"
      className="relative overflow-hidden py-24 px-6 lg:px-16"
      style={{ backgroundColor: colors.sectionBg }}
    >
      {/* Ambient Background */}
      <div className="absolute inset-0">
        <div
          className="absolute top-[-120px] right-[-80px] w-[400px] h-[400px] rounded-full blur-3xl"
          style={{ backgroundColor: colors.glowBlue }}
        />
        <div
          className="absolute bottom-[-120px] left-[-80px] w-[400px] h-[400px] rounded-full blur-3xl"
          style={{ backgroundColor: colors.glowIndigo }}
        />
      </div>

      <div className="relative z-10">
        {/* Heading */}
        <SectionHeading
          title="Our Legal Services"
          subtitle="Comprehensive legal solutions tailored for individuals, businesses, and organizations with professionalism and precision."
          variant={isDark ? "dark" : "light"}
        />

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8 max-w-7xl mx-auto mt-20">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.08,
                }}
                viewport={{ once: true }}
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

                {/* Top Glow Line */}
                <div
                  className="absolute top-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500"
                  style={{ backgroundImage: colors.topGlowLine }}
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
                    {service.title}
                  </h3>

                  <p className="mt-4 leading-relaxed text-sm" style={{ color: colors.desc }}>
                    {service.desc}
                  </p>
                </div>

                {/* Bottom Link */}
                <div className="relative mt-8 flex items-center gap-2 text-sm font-medium opacity-100 transition duration-300" style={{ color: colors.linkColor }}>
                  Learn More
                  <ArrowRight className="w-4 h-4" />
                </div>
              </motion.div>
            );
          })}
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
            className="absolute top-[-100px] right-[-80px] w-[300px] h-[300px] rounded-full blur-3xl"
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
              Professional Legal Support
            </div>

            {/* Heading */}
            <h3 className="mt-6 text-3xl md:text-5xl font-black leading-tight" style={{ color: colors.ctaTitle }}>
              Need Expert
              <span className="block bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(to right, #2563EB, #06B6D4, #6366F1)" }}>
                Legal Assistance?
              </span>
            </h3>

            {/* Text */}
            <p className="mt-6 max-w-2xl mx-auto leading-relaxed" style={{ color: colors.ctaDesc }}>
              Speak with our legal professionals today and receive trusted
              guidance tailored to your legal needs and business objectives.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-wrap justify-center gap-5">
              {/* Primary - Book Consultation */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={primaryBtnStyle}
                onMouseEnter={(e) => Object.assign(e.target.style, primaryBtnHoverStyle)}
                onMouseLeave={(e) => Object.assign(e.target.style, primaryBtnStyle)}
                onMouseDown={(e) => Object.assign(e.target.style, primaryBtnActiveStyle)}
                onMouseUp={(e) => Object.assign(e.target.style, primaryBtnHoverStyle)}
              >
                Book Consultation
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