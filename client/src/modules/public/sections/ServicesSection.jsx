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

import SectionHeading from "@/components/ui/SectionHeading";
import Button3D from "@/components/ui/Button3D";

export default function ServicesSection() {
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

  return (
    <section
      id="services"
      className="relative overflow-hidden bg-[#050816] py-24 px-6 lg:px-16"
    >
      {/* Ambient Background */}
      <div className="absolute inset-0">
        <div className="absolute top-[-120px] right-[-80px] w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-3xl" />

        <div className="absolute bottom-[-120px] left-[-80px] w-[400px] h-[400px] rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Heading */}
        <SectionHeading
          title="Our Legal Services"
          subtitle="Comprehensive legal solutions tailored for individuals, businesses, and organizations with professionalism and precision."
          variant="dark"
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
                whileHover={{
                  y: -10,
                }}
                className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-8 shadow-[0_20px_70px_rgba(0,0,0,0.45)]"
              >
                {/* Hover Glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 bg-gradient-to-br from-blue-500/10 via-transparent to-indigo-500/10" />

                {/* Top Glow Line */}
                <div className="absolute top-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500 bg-gradient-to-r from-blue-400 to-cyan-300" />

                {/* Icon */}
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Icon className="w-8 h-8 text-white" />
                </div>

                {/* Content */}
                <div className="relative mt-7">
                  <h3 className="text-2xl font-bold text-white">
                    {service.title}
                  </h3>

                  <p className="mt-4 text-gray-300 leading-relaxed text-sm">
                    {service.desc}
                  </p>
                </div>

                {/* Bottom Link */}
                <div className="relative mt-8 flex items-center gap-2 text-blue-300 text-sm font-medium opacity-100 transition duration-300">
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
          className="relative mt-24 max-w-6xl mx-auto overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.03] backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.45)]"
        >
          {/* Glow */}
          <div className="absolute top-[-100px] right-[-80px] w-[300px] h-[300px] rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative z-10 px-8 py-14 md:px-14 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-400/20 bg-blue-500/10 text-blue-200 text-sm">
              Professional Legal Support
            </div>

            {/* Heading */}
            <h3 className="mt-6 text-3xl md:text-5xl font-black text-white leading-tight">
              Need Expert
              <span className="block bg-gradient-to-r from-blue-300 via-cyan-200 to-indigo-300 bg-clip-text text-transparent">
                Legal Assistance?
              </span>
            </h3>

            {/* Text */}
            <p className="mt-6 text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Speak with our legal professionals today and receive trusted
              guidance tailored to your legal needs and business objectives.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-wrap justify-center gap-5">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button3D variant="primary" size="lg">
                  Book Consultation
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
