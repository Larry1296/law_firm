import { Mail, Phone, MapPin, Send, Clock3, ShieldCheck } from "lucide-react";

import { motion } from "framer-motion";

import { useContext } from "react";

import SectionHeading from "@/components/ui/SectionHeading";

import ThemeContext from "@/core/store/ThemeContext";

export default function ContactSection() {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";

  // Direct color values from your Tailwind config
  const colors = isDark
    ? {
        sectionBg: "#050816",
        cardBg: "rgba(255,255,255,0.04)",
        cardBorder: "rgba(255,255,255,0.1)",
        glowBlue: "rgba(59, 130, 246, 0.1)",
        glowIndigo: "rgba(99, 102, 241, 0.1)",
        badgeBg: "rgba(59, 130, 246, 0.1)",
        badgeBorder: "rgba(59, 130, 246, 0.2)",
        badgeText: "#BFDBFE", // blue-200
        title: "#FFFFFF",
        subtitle: "#D1D5DB", // gray-300
        textPrimary: "#E5E7EB", // text-primary-dark
        textMuted: "#94A3B8", // text-muted-dark
        textMutedDarker: "#6B7280", // gray-500
        contactItemBg: "rgba(255,255,255,0.03)",
        contactItemBorder: "rgba(255,255,255,0.1)",
        statCardBg: "rgba(255,255,255,0.03)",
        statCardBorder: "rgba(255,255,255,0.1)",
        statIcon: "#60A5FA", // blue-300
        statText: "#FFFFFF",
        inputBg: "rgba(255,255,255,0.03)",
        inputBorder: "rgba(255,255,255,0.1)",
        inputText: "#FFFFFF",
        inputPlaceholder: "#6B7280", // gray-500
        inputFocusBorder: "#3B82F6", // blue-500
        btnPrimaryBg: "#2563EB", // blue-600
        btnPrimaryHover: "#1D4ED8", // blue-700
        btnPrimaryActive: "#1E40AF", // blue-800
        btnPrimaryText: "#FFFFFF",
        btnPrimaryShadow: "rgba(37, 99, 235, 0.4)",
      }
    : {
        sectionBg: "#F3F0EA", // background-light
        cardBg: "#FFFDF8", // surface-light
        cardBorder: "#D8D2C8", // border-light
        glowBlue: "rgba(18, 56, 90, 0.1)",
        glowIndigo: "rgba(18, 56, 90, 0.08)",
        badgeBg: "rgba(18, 56, 90, 0.1)",
        badgeBorder: "rgba(18, 56, 90, 0.2)",
        badgeText: "#12385A", // brand-primary
        title: "#1F2933", // text-primary-light
        subtitle: "#5F6673", // text-muted-light
        textPrimary: "#1F2933",
        textMuted: "#5F6673",
        textMutedDarker: "#9CA3AF", // gray-400
        contactItemBg: "#FFFFFF",
        contactItemBorder: "#D8D2C8",
        statCardBg: "#FFFFFF",
        statCardBorder: "#D8D2C8",
        statIcon: "#12385A", // brand-primary
        statText: "#1F2933",
        inputBg: "#FFFFFF",
        inputBorder: "#D8D2C8",
        inputText: "#1F2933",
        inputPlaceholder: "#9CA3AF", // gray-400
        inputFocusBorder: "#12385A", // brand-primary
        btnPrimaryBg: "#12385A", // brand-primary
        btnPrimaryHover: "#0D2B47",
        btnPrimaryActive: "#0A1F33",
        btnPrimaryText: "#FFFFFF",
        btnPrimaryShadow: "rgba(18, 56, 90, 0.4)",
      };

  const contactItems = [
    { icon: MapPin, title: "Office Location", info: "Nairobi Legal District, Kenya" },
    { icon: Phone, title: "Phone", info: "+254 700 000 000" },
    { icon: Mail, title: "Email", info: "support@lawfirm.com" },
  ];

  const formFields = ["Full Name", "Email Address", "Subject"];

  // Icon colors for contact items and stats
  const iconColors = isDark
    ? {
        iconBg: "linear-gradient(to bottom right, #2563EB, #4338CA)",
        iconShadow: "rgba(37, 99, 235, 0.3)",
      }
    : {
        iconBg: "linear-gradient(to bottom right, #60A5FA, #93C5FD)",
        iconShadow: "rgba(96, 165, 250, 0.3)",
      };

  // Custom 3D button styles (same as CTASection)
  const primaryBtnStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    width: "100%",
    padding: "1rem 2rem",
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

  return (
    <section
      id="contact"
      className="relative overflow-hidden py-24 px-6 lg:px-16"
      style={{ backgroundColor: colors.sectionBg }}
    >
      {/* Ambient Background */}
      <div className="absolute inset-0">
        <div
          className="absolute top-[-140px] left-[-100px] w-[420px] h-[420px] rounded-full blur-3xl"
          style={{ backgroundColor: colors.glowBlue }}
        />
        <div
          className="absolute bottom-[-140px] right-[-100px] w-[420px] h-[420px] rounded-full blur-3xl"
          style={{ backgroundColor: colors.glowIndigo }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Heading */}
        <SectionHeading
          title="Get In Touch"
          subtitle="Have a legal question or need professional assistance? Our team is ready to support you with secure and confidential legal guidance."
          variant={isDark ? "dark" : "light"}
        />

        {/* Grid */}
        <div className="grid lg:grid-cols-2 gap-10 mt-20">
          {/* LEFT: INFO */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-[32px] backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.45)]"
            style={{
              backgroundColor: colors.cardBg,
              borderColor: colors.cardBorder,
              borderWidth: "1px",
              borderStyle: "solid",
            }}
          >
            {/* Glow */}
            <div
              className="absolute top-[-120px] left-[-80px] w-[300px] h-[300px] rounded-full blur-3xl"
              style={{ backgroundColor: colors.glowBlue }}
            />

            <div className="relative p-8 lg:p-10">
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
                Contact Information
              </div>

              {/* Title */}
              <h3 className="mt-6 text-3xl md:text-4xl font-black" style={{ color: colors.title }}>
                Speak With Our
                <span className="block bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(to right, #2563EB, #06B6D4, #6366F1)" }}>
                  Legal Experts
                </span>
              </h3>

              <p className="mt-6 leading-relaxed" style={{ color: colors.subtitle }}>
                Our team is available to help you with case consultations, legal
                inquiries, and professional guidance.
              </p>

              {/* Contact List */}
              <div className="mt-10 space-y-5">
                {contactItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="flex items-start gap-4 rounded-2xl p-5 backdrop-blur-xl"
                      style={{
                        backgroundColor: colors.contactItemBg,
                        borderColor: colors.contactItemBorder,
                        borderWidth: "1px",
                        borderStyle: "solid",
                      }}
                    >
                      <motion.div
                        className="relative w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundImage: iconColors.iconBg,
                          boxShadow: `
                            0 6px 20px ${iconColors.iconShadow},
                            0 2px 4px -1px ${iconColors.iconShadow},
                            inset 0 1px 0 rgba(255,255,255,0.2),
                            inset 0 -1px 0 rgba(0,0,0,0.1)
                          `,
                          transform: "translateZ(0)",
                        }}
                        whileHover={{
                          scale: 1.1,
                          boxShadow: `
                            0 10px 28px ${iconColors.iconShadow},
                            0 4px 6px -2px ${iconColors.iconShadow},
                            inset 0 1px 0 rgba(255,255,255,0.25),
                            inset 0 -1px 0 rgba(0,0,0,0.1)
                          `,
                        }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      >
                        <Icon className="w-5 h-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
                        {/* 3D Edge Highlight */}
                        <div className="absolute inset-0 rounded-xl" style={{
                          background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)",
                          pointerEvents: "none",
                        }} />
                        {/* Bottom Edge */}
                        <div className="absolute bottom-0 left-1.5 right-1.5 h-1 rounded-b-xl" style={{
                          background: "linear-gradient(to right, transparent, rgba(0,0,0,0.2), transparent)",
                          pointerEvents: "none",
                        }} />
                      </motion.div>

                      <div>
                        <h4 className="font-semibold" style={{ color: colors.textPrimary }}>
                          {item.title}
                        </h4>
                        <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                          {item.info}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mini stats */}
              <div className="mt-10 grid grid-cols-2 gap-4">
                <div
                  className="p-4 rounded-2xl"
                  style={{
                    backgroundColor: colors.statCardBg,
                    borderColor: colors.statCardBorder,
                    borderWidth: "1px",
                    borderStyle: "solid",
                  }}
                >
                  <motion.div
                    className="relative w-10 h-10 rounded-xl flex items-center justify-center mx-auto"
                    style={{
                      backgroundImage: iconColors.iconBg,
                      boxShadow: `
                        0 5px 16px ${iconColors.iconShadow},
                        0 2px 3px -1px ${iconColors.iconShadow},
                        inset 0 1px 0 rgba(255,255,255,0.2),
                        inset 0 -1px 0 rgba(0,0,0,0.1)
                      `,
                      transform: "translateZ(0)",
                    }}
                    whileHover={{
                      scale: 1.1,
                      boxShadow: `
                        0 8px 22px ${iconColors.iconShadow},
                        0 3px 4px -2px ${iconColors.iconShadow},
                        inset 0 1px 0 rgba(255,255,255,0.25),
                        inset 0 -1px 0 rgba(0,0,0,0.1)
                      `,
                    }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <Clock3 className="w-5 h-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
                    {/* 3D Edge Highlight */}
                    <div className="absolute inset-0 rounded-xl" style={{
                      background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)",
                      pointerEvents: "none",
                    }} />
                    {/* Bottom Edge */}
                    <div className="absolute bottom-0 left-1.5 right-1.5 h-1 rounded-b-xl" style={{
                      background: "linear-gradient(to right, transparent, rgba(0,0,0,0.2), transparent)",
                      pointerEvents: "none",
                    }} />
                  </motion.div>
                  <p className="mt-2 font-semibold" style={{ color: colors.statText }}>24h Response</p>
                </div>

                <div
                  className="p-4 rounded-2xl"
                  style={{
                    backgroundColor: colors.statCardBg,
                    borderColor: colors.statCardBorder,
                    borderWidth: "1px",
                    borderStyle: "solid",
                  }}
                >
                  <motion.div
                    className="relative w-10 h-10 rounded-xl flex items-center justify-center mx-auto"
                    style={{
                      backgroundImage: iconColors.iconBg,
                      boxShadow: `
                        0 5px 16px ${iconColors.iconShadow},
                        0 2px 3px -1px ${iconColors.iconShadow},
                        inset 0 1px 0 rgba(255,255,255,0.2),
                        inset 0 -1px 0 rgba(0,0,0,0.1)
                      `,
                      transform: "translateZ(0)",
                    }}
                    whileHover={{
                      scale: 1.1,
                      boxShadow: `
                        0 8px 22px ${iconColors.iconShadow},
                        0 3px 4px -2px ${iconColors.iconShadow},
                        inset 0 1px 0 rgba(255,255,255,0.25),
                        inset 0 -1px 0 rgba(0,0,0,0.1)
                      `,
                    }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <ShieldCheck className="w-5 h-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
                    {/* 3D Edge Highlight */}
                    <div className="absolute inset-0 rounded-xl" style={{
                      background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)",
                      pointerEvents: "none",
                    }} />
                    {/* Bottom Edge */}
                    <div className="absolute bottom-0 left-1.5 right-1.5 h-1 rounded-b-xl" style={{
                      background: "linear-gradient(to right, transparent, rgba(0,0,0,0.2), transparent)",
                      pointerEvents: "none",
                    }} />
                  </motion.div>
                  <p className="mt-2 font-semibold" style={{ color: colors.statText }}>Confidential</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* RIGHT: FORM */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-[32px] backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.45)]"
            style={{
              backgroundColor: colors.cardBg,
              borderColor: colors.cardBorder,
              borderWidth: "1px",
              borderStyle: "solid",
            }}
          >
            <div
              className="absolute bottom-[-120px] right-[-80px] w-[320px] h-[320px] rounded-full blur-3xl"
              style={{ backgroundColor: colors.glowIndigo }}
            />

            <div className="relative p-8 lg:p-10">
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
                Send Message
              </div>

              {/* Title */}
              <h3 className="mt-6 text-3xl md:text-4xl font-black" style={{ color: colors.title }}>
                Request Legal
                <span className="block bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(to right, #2563EB, #06B6D4, #6366F1)" }}>
                  Consultation
                </span>
              </h3>

              <p className="mt-6" style={{ color: colors.subtitle }}>
                Fill out the form and our team will respond with professional
                guidance.
              </p>

              {/* Form */}
              <form className="mt-10 space-y-5">
                {formFields.map((placeholder) => (
                  <input
                    key={placeholder}
                    placeholder={placeholder}
                    className="w-full px-5 py-4 rounded-2xl outline-none transition"
                    style={{
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                      borderWidth: "1px",
                      borderStyle: "solid",
                      color: colors.inputText,
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = colors.inputFocusBorder;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = colors.inputBorder;
                    }}
                  />
                ))}

                <textarea
                  rows="6"
                  placeholder="Describe your legal issue..."
                  className="w-full px-5 py-4 rounded-2xl outline-none resize-none"
                  style={{
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    borderWidth: "1px",
                    borderStyle: "solid",
                    color: colors.inputText,
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = colors.inputFocusBorder;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = colors.inputBorder;
                  }}
                />

                {/* Custom 3D Submit Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={primaryBtnStyle}
                  onMouseEnter={(e) => Object.assign(e.target.style, primaryBtnHoverStyle)}
                  onMouseLeave={(e) => Object.assign(e.target.style, primaryBtnStyle)}
                  onMouseDown={(e) => Object.assign(e.target.style, primaryBtnActiveStyle)}
                  onMouseUp={(e) => Object.assign(e.target.style, primaryBtnHoverStyle)}
                  type="submit"
                >
                  <Send className="w-4 h-4" />
                  Send Message
                </motion.button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}