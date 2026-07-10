import { ArrowRight, ShieldCheck, Scale, Sparkles } from "lucide-react";

import { motion } from "framer-motion";

import Button3D from "@/components/ui/Button3D";

export default function CTASection() {
  return (
    <section className="relative overflow-hidden bg-[#070B1A] py-28 px-6 lg:px-16">
      {/* Ambient Background */}
      <div className="absolute inset-0">
        <div className="absolute top-[-120px] left-[-100px] w-[420px] h-[420px] rounded-full bg-blue-500/10 blur-3xl" />

        <div className="absolute bottom-[-140px] right-[-100px] w-[450px] h-[450px] rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      {/* Floating Glow Ring */}
      <motion.div
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 40,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute left-1/2 top-1/2 w-[700px] h-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-500/10"
      />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Main CTA Container */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-[40px] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.03] backdrop-blur-2xl shadow-[0_30px_100px_rgba(0,0,0,0.5)]"
        >
          {/* Glow Effects */}
          <div className="absolute top-[-120px] right-[-80px] w-[320px] h-[320px] rounded-full bg-blue-500/10 blur-3xl" />

          <div className="absolute bottom-[-120px] left-[-80px] w-[320px] h-[320px] rounded-full bg-indigo-500/10 blur-3xl" />

          {/* Glass Reflection */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] via-transparent to-transparent pointer-events-none" />

          <div className="relative z-10 px-8 py-16 md:px-16 lg:px-20 text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-blue-400/20 bg-blue-500/10 text-blue-200 text-sm backdrop-blur-xl"
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
              className="mt-8 text-4xl md:text-6xl font-black leading-tight text-white"
            >
              Ready To Transform
              <span className="block bg-gradient-to-r from-blue-300 via-cyan-200 to-indigo-300 bg-clip-text text-transparent">
                Your Legal Workflow?
              </span>
            </motion.h2>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              viewport={{ once: true }}
              className="mt-8 max-w-3xl mx-auto text-lg md:text-xl text-gray-300 leading-relaxed"
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
              {[
                {
                  icon: ShieldCheck,
                  value: "100%",
                  label: "Secure Platform",
                },
                {
                  icon: Scale,
                  value: "24/7",
                  label: "Legal Access",
                },
                {
                  icon: Sparkles,
                  value: "Smart",
                  label: "Automation",
                },
                {
                  icon: ArrowRight,
                  value: "Fast",
                  label: "Workflow",
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6"
                  >
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
                      <Icon className="w-6 h-6 text-white" />
                    </div>

                    <h3 className="mt-4 text-2xl font-black bg-gradient-to-r from-blue-300 to-cyan-200 bg-clip-text text-transparent">
                      {item.value}
                    </h3>

                    <p className="mt-2 text-sm text-gray-400">{item.label}</p>
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
              {/* Primary */}
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button3D
                  size="lg"
                  variant="primary"
                  className="px-10 py-4 text-base"
                >
                  Get Started
                </Button3D>
              </motion.div>

              {/* Secondary */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-4 rounded-2xl border border-white/10 bg-white/[0.04] text-white backdrop-blur-xl hover:bg-white/[0.08] transition flex items-center gap-2"
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
