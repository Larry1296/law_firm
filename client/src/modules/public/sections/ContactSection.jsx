import { Mail, Phone, MapPin, Send, Clock3, ShieldCheck } from "lucide-react";

import { motion } from "framer-motion";
import SectionHeading from "@/components/ui/SectionHeading";
import Button3D from "@/components/ui/Button3D";

export default function ContactSection() {
  return (
    <section
      id="contact"
      className="relative overflow-hidden bg-[#050816] py-24 px-6 lg:px-16"
    >
      {/* Ambient Background */}
      <div className="absolute inset-0">
        <div className="absolute top-[-140px] left-[-100px] w-[420px] h-[420px] rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-[-140px] right-[-100px] w-[420px] h-[420px] rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Heading */}
        <SectionHeading
          title="Get In Touch"
          subtitle="Have a legal question or need professional assistance? Our team is ready to support you with secure and confidential legal guidance."
          variant="dark"
        />

        {/* Grid */}
        <div className="grid lg:grid-cols-2 gap-10 mt-20">
          {/* LEFT: INFO */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.45)]"
          >
            {/* Glow */}
            <div className="absolute top-[-120px] left-[-80px] w-[300px] h-[300px] rounded-full bg-blue-500/10 blur-3xl" />

            <div className="relative p-8 lg:p-10">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-400/20 bg-blue-500/10 text-blue-200 text-sm">
                Contact Information
              </div>

              {/* Title */}
              <h3 className="mt-6 text-3xl md:text-4xl font-black text-white">
                Speak With Our
                <span className="block bg-gradient-to-r from-blue-300 via-cyan-200 to-indigo-300 bg-clip-text text-transparent">
                  Legal Experts
                </span>
              </h3>

              <p className="mt-6 text-gray-300 leading-relaxed">
                Our team is available to help you with case consultations, legal
                inquiries, and professional guidance.
              </p>

              {/* Contact List */}
              <div className="mt-10 space-y-5">
                {[
                  {
                    icon: MapPin,
                    title: "Office Location",
                    info: "Nairobi Legal District, Kenya",
                  },
                  {
                    icon: Phone,
                    title: "Phone",
                    info: "+254 700 000 000",
                  },
                  {
                    icon: Mail,
                    title: "Email",
                    info: "support@lawfirm.com",
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.title}
                      className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-white" />
                      </div>

                      <div>
                        <h4 className="text-white font-semibold">
                          {item.title}
                        </h4>
                        <p className="text-gray-400 text-sm mt-1">
                          {item.info}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mini stats */}
              <div className="mt-10 grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.03]">
                  <Clock3 className="w-5 h-5 text-blue-300" />
                  <p className="text-white mt-2 font-semibold">24h Response</p>
                </div>

                <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.03]">
                  <ShieldCheck className="w-5 h-5 text-blue-300" />
                  <p className="text-white mt-2 font-semibold">Confidential</p>
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
            className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.45)]"
          >
            <div className="absolute bottom-[-120px] right-[-80px] w-[320px] h-[320px] rounded-full bg-indigo-500/10 blur-3xl" />

            <div className="relative p-8 lg:p-10">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-400/20 bg-blue-500/10 text-blue-200 text-sm">
                Send Message
              </div>

              {/* Title */}
              <h3 className="mt-6 text-3xl md:text-4xl font-black text-white">
                Request Legal
                <span className="block bg-gradient-to-r from-blue-300 via-cyan-200 to-indigo-300 bg-clip-text text-transparent">
                  Consultation
                </span>
              </h3>

              <p className="mt-6 text-gray-300">
                Fill out the form and our team will respond with professional
                guidance.
              </p>

              {/* Form */}
              <form className="mt-10 space-y-5">
                {["Full Name", "Email Address", "Subject"].map(
                  (placeholder) => (
                    <input
                      key={placeholder}
                      placeholder={placeholder}
                      className="w-full px-5 py-4 rounded-2xl border border-white/10 bg-white/[0.03] text-white placeholder:text-gray-500 focus:border-blue-500 outline-none transition"
                    />
                  ),
                )}

                <textarea
                  rows="6"
                  placeholder="Describe your legal issue..."
                  className="w-full px-5 py-4 rounded-2xl border border-white/10 bg-white/[0.03] text-white placeholder:text-gray-500 focus:border-blue-500 outline-none resize-none"
                />

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button3D className="w-full" variant="primary">
                    <Send size={18} className="mr-2" />
                    Send Message
                  </Button3D>
                </motion.div>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
