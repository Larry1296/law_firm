import { ShieldCheck, Scale, Gavel, Users, ArrowRight } from 'lucide-react';

import { motion } from 'framer-motion';

import { useContext } from 'react';

import SectionHeading from '@/components/ui/SectionHeading';

import ThemeContext from '@/core/store/ThemeContext';

export default function AboutSection() {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";

  const items = [
    {
      icon: ShieldCheck,
      title: 'Trusted Expertise',
      description: 'Years of experience handling complex legal matters with precision and confidentiality.',
    },
    {
      icon: Scale,
      title: 'Fair Representation',
      description: 'Balanced legal counsel focused on protecting your rights and interests.',
    },
    {
      icon: Gavel,
      title: 'Strategic Advocacy',
      description: 'Strong legal strategies designed to achieve successful outcomes efficiently.',
    },
    {
      icon: Users,
      title: 'Client Focused',
      description: 'Every client receives personalized support and transparent communication.',
    },
  ];

  // Direct color values from your Tailwind config
  const colors = isDark
    ? {
        sectionBg: "#070B1A",
        glowBlue: "rgba(59, 130, 246, 0.1)",
        glowIndigo: "rgba(99, 102, 241, 0.1)",
        cardBg: "rgba(255,255,255,0.03)",
        cardBorder: "rgba(255,255,255,0.1)",
        title: "#FFFFFF",
        desc: "#D1D5DB", // gray-300
        iconBg: "linear-gradient(to bottom right, #2563EB, #4338CA)",
        iconShadow: "rgba(37, 99, 235, 0.3)",
        hoverGlow: "linear-gradient(to bottom right, rgba(59,130,246,0.1), transparent, rgba(99,102,241,0.1))",
        missionCardBg: "rgba(255,255,255,0.03)",
        missionCardBorder: "rgba(255,255,255,0.1)",
        missionGlow: "rgba(59, 130, 246, 0.1)",
        badgeBg: "rgba(59, 130, 246, 0.1)",
        badgeBorder: "rgba(59, 130, 246, 0.2)",
        badgeText: "#BFDBFE", // blue-200
        missionTitle: "#FFFFFF",
        missionDesc: "#D1D5DB",
        missionDescMuted: "#9CA3AF", // gray-400
        quoteCardBg: "linear-gradient(to bottom right, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
        quoteCardBorder: "rgba(255,255,255,0.1)",
        quoteGlow: "rgba(59, 130, 246, 0.1)",
        quoteText: "#FFFFFF",
        quoteAuthor: "#FFFFFF",
        quoteRole: "#9CA3AF",
        btnBg: "linear-gradient(to right, #2563EB, #4338CA)",
        btnHover: "linear-gradient(to right, #1D4ED8, #3730A3)",
        btnText: "#FFFFFF",
        divider: "rgba(255,255,255,0.1)",
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
        missionCardBg: "#FFFDF8", // surface-light
        missionCardBorder: "#D8D2C8", // border-light
        missionGlow: "rgba(18, 56, 90, 0.1)",
        badgeBg: "rgba(18, 56, 90, 0.1)",
        badgeBorder: "rgba(18, 56, 90, 0.2)",
        badgeText: "#12385A", // brand-primary
        missionTitle: "#1F2933", // text-primary-light
        missionDesc: "#5F6673", // text-muted-light
        missionDescMuted: "#6B7280", // gray-500
        quoteCardBg: "linear-gradient(to bottom right, rgba(18,56,90,0.08), rgba(18,56,90,0.04))",
        quoteCardBorder: "#D8D2C8", // border-light
        quoteGlow: "rgba(18, 56, 90, 0.1)",
        quoteText: "#1F2933",
        quoteAuthor: "#1F2933",
        quoteRole: "#6B7280",
        btnBg: "linear-gradient(to right, #12385A, #0D2B47)", // brand-primary gradient
        btnHover: "linear-gradient(to right, #0D2B47, #0A1F33)",
        btnText: "#FFFFFF",
        divider: "#D8D2C8", // border-light
      };

  return (
    <section
      id="about"
      className="relative overflow-hidden py-24 px-6 lg:px-16"
      style={{ backgroundColor: colors.sectionBg }}
    >
      {/* Background Glow */}
      <div className="absolute inset-0">
        <div
          className="absolute top-[-120px] left-[-100px] w-[380px] h-[380px] rounded-full blur-3xl"
          style={{ backgroundColor: colors.glowBlue }}
        />
        <div
          className="absolute bottom-[-140px] right-[-100px] w-[420px] h-[420px] rounded-full blur-3xl"
          style={{ backgroundColor: colors.glowIndigo }}
        />
      </div>

      <div className="relative z-10">
        {/* Heading */}
        <SectionHeading
          title="About Our Legal Practice"
          subtitle="We combine legal excellence with modern technology to deliver secure, intelligent, and client-focused legal solutions."
          variant={isDark ? "dark" : "light"}
        />

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-7 max-w-7xl mx-auto mt-16">
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.1,
                }}
                viewport={{ once: true }}
                whileHover={{ y: -8 }}
                className="group relative overflow-hidden rounded-3xl backdrop-blur-xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
                style={{
                  backgroundColor: colors.cardBg,
                  borderColor: colors.cardBorder,
                  borderWidth: "1px",
                  borderStyle: "solid",
                }}
              >
                {/* Glow */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500"
                  style={{ backgroundImage: colors.hoverGlow }}
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
                <div className="relative mt-6">
                  <h3 className="text-xl font-bold" style={{ color: colors.title }}>{item.title}</h3>
                  <p className="mt-4 leading-relaxed text-sm" style={{ color: colors.desc }}>
                    {item.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Mission Section */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="relative mt-24 max-w-7xl mx-auto overflow-hidden rounded-[32px] backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.45)]"
          style={{
            backgroundColor: colors.missionCardBg,
            borderColor: colors.missionCardBorder,
            borderWidth: "1px",
            borderStyle: "solid",
          }}
        >
          <div className="grid lg:grid-cols-2">
            {/* Left */}
            <div className="p-10 lg:p-14">
              {/* Glow */}
              <div
                className="absolute top-[-100px] left-[-80px] w-[300px] h-[300px] rounded-full blur-3xl"
                style={{ backgroundColor: colors.missionGlow }}
              />

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
                Our Mission
              </div>

              <h3 className="mt-6 text-3xl md:text-4xl font-black leading-tight" style={{ color: colors.missionTitle }}>
                Redefining Modern
                <span className="block bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(to right, #2563EB, #06B6D4)" }}>
                  Legal Services
                </span>
              </h3>

              <p className="mt-6 leading-relaxed" style={{ color: colors.missionDesc }}>
                We leverage technology, strategic expertise, and client-centered
                practices to simplify legal operations while maintaining the
                highest standards of professionalism and confidentiality.
              </p>

              <p className="mt-4 leading-relaxed" style={{ color: colors.missionDescMuted }}>
                Our approach ensures faster workflows, transparent
                communication, and efficient legal management for individuals,
                firms, and organizations.
              </p>

              {/* Learn More Button */}
              <button
                className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium shadow-lg transition transform hover:scale-105"
                style={{
                  backgroundImage: colors.btnBg,
                  color: colors.btnText,
                  boxShadow: isDark 
                    ? "0 10px 30px rgba(37, 99, 235, 0.3)"
                    : "0 10px 30px rgba(18, 56, 90, 0.3)",
                }}
              >
                Learn More
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Right Quote Card */}
            <div className="relative flex items-center justify-center p-10 lg:p-14">
              {/* Glow */}
              <div
                className="absolute w-[300px] h-[300px] rounded-full blur-3xl"
                style={{ backgroundColor: colors.quoteGlow }}
              />

              <div
                className="relative w-full rounded-3xl backdrop-blur-xl p-10 shadow-[0_15px_60px_rgba(0,0,0,0.35)]"
                style={{
                  backgroundImage: colors.quoteCardBg,
                  borderColor: colors.quoteCardBorder,
                  borderWidth: "1px",
                  borderStyle: "solid",
                }}
              >
                <div className="text-6xl font-black" style={{ color: isDark ? "#60A5FA" : "#2563EB", opacity: 0.3 }}>
                  "
                </div>

                <p className="mt-2 text-xl md:text-2xl leading-relaxed font-medium" style={{ color: colors.quoteText }}>
                  Justice should be accessible, transparent, and efficient for
                  everyone.
                </p>

                <div className="mt-8 h-px" style={{ backgroundColor: colors.divider }} />

                <div className="mt-6">
                  <p className="font-semibold" style={{ color: colors.quoteAuthor }}>
                    Modern Legal Platform
                  </p>
                  <p className="text-sm mt-1" style={{ color: colors.quoteRole }}>
                    Trusted Legal Excellence
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}