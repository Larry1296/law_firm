import {
  FileText,
  UserCheck,
  Scale,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

import { motion } from "framer-motion";

import SectionHeading from "@/components/ui/SectionHeading";
import Button3D from "@/components/ui/Button3D";

export default function HowItWorks() {
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

  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden bg-[#070B1A] py-24 px-6 lg:px-16"
    >
      {/* Background Ambient Glow */}
      <div className="absolute inset-0">
        <div className="absolute top-[-120px] left-[-80px] w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-3xl" />

        <div className="absolute bottom-[-120px] right-[-80px] w-[420px] h-[420px] rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Heading */}
        <SectionHeading
          title="How It Works"
          subtitle="A modern, transparent legal process designed to guide you from consultation to successful resolution."
          variant="dark"
        />

        {/* Timeline Steps */}
        <div className="relative max-w-7xl mx-auto mt-24">
          {/* Timeline Line */}
          <div className="hidden lg:block absolute top-24 left-0 w-full h-[2px] bg-gradient-to-r from-blue-500/20 via-cyan-400/30 to-indigo-500/20" />

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative text-white">
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
                  <div className="hidden lg:flex absolute top-[68px] left-1/2 -translate-x-1/2 z-20 w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-300 shadow-[0_0_25px_rgba(59,130,246,0.7)] border border-white/20" />

                  {/* Step Card */}
                  <motion.div
                    whileHover={{
                      y: -10,
                    }}
                    className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-8 shadow-[0_20px_70px_rgba(0,0,0,0.45)]"
                  >
                    {/* Hover Glow */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 bg-gradient-to-br from-blue-500/10 via-transparent to-indigo-500/10" />

                    {/* Step Number */}
                    <div className="absolute top-5 right-5 text-white text-5xl font-black">
                      0{index + 1}
                    </div>

                    {/* Icon */}
                    <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
                      <Icon className="w-8 h-8 text-white" />
                    </div>

                    {/* Content */}
                    <div className="relative mt-7">
                      <h3 className="text-2xl font-bold text-white">
                        {step.title}
                      </h3>

                      <p className="mt-4 text-gray-300 leading-relaxed text-sm">
                        {step.desc}
                      </p>
                    </div>

                    {/* Arrow */}
                    <div className="relative mt-8 flex items-center gap-2 text-emerald-400 text-sm font-medium opacity-100 cursor-pointer transition duration-300">
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
          className="relative mt-24 max-w-6xl mx-auto overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.03] backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.45)]"
        >
          {/* Glow */}
          <div className="absolute top-[-100px] left-[-80px] w-[320px] h-[320px] rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative z-10 px-8 py-14 md:px-14 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-400/20 bg-blue-500/10 text-blue-200 text-sm">
              Trusted Legal Process
            </div>

            {/* Heading */}
            <h3 className="mt-6 text-3xl md:text-5xl font-black text-white leading-tight">
              Ready To Begin
              <span className="block bg-gradient-to-r from-blue-300 via-cyan-200 to-indigo-300 bg-clip-text text-transparent">
                Your Legal Journey?
              </span>
            </h3>

            {/* Text */}
            <p className="mt-6 text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Start your case today with experienced legal professionals
              committed to delivering transparent, efficient, and results-driven
              legal services.
            </p>

            {/* Buttons */}
            <div className="mt-10 flex flex-wrap justify-center gap-5">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button3D variant="primary" size="lg">
                  Start Your Case
                </Button3D>
              </motion.div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="px-7 py-4 rounded-2xl border border-white/10 bg-white/[0.04] text-white backdrop-blur-xl hover:bg-white/[0.08] transition"
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
