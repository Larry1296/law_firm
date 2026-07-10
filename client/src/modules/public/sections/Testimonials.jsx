import { Star } from "lucide-react";
import { motion } from "framer-motion";
import SectionHeading from "@/components/ui/SectionHeading";

export default function Testimonials() {
  const testimonials = [
    {
      name: "James Mwangi",
      text: "Exceptional legal service. The team handled my case with professionalism and clear communication throughout.",
    },
    {
      name: "Amina Hassan",
      text: "Very responsive and knowledgeable lawyers. I always felt my case was in safe hands.",
    },
    {
      name: "David Ochieng",
      text: "They simplified a very complex legal issue for me. Highly recommend this firm.",
    },
  ];

  return (
    <section
      id="testimonials"
      className="relative overflow-hidden bg-[#050816] py-24 px-6 lg:px-16"
    >
      {/* Ambient background */}
      <div className="absolute inset-0">
        <div className="absolute top-[-120px] right-[-100px] w-[420px] h-[420px] rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-[-140px] left-[-100px] w-[420px] h-[420px] rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Heading */}
        <SectionHeading
          title="What Our Clients Say"
          subtitle="Trusted by individuals and businesses for reliable, professional legal support."
          variant="dark"
        />

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-20">
          {testimonials.map((t, index) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -8 }}
              className="relative group overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-2xl p-8 shadow-[0_25px_80px_rgba(0,0,0,0.45)]"
            >
              {/* Glow hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 bg-gradient-to-br from-blue-500/10 via-transparent to-indigo-500/10" />

              {/* Stars */}
              <div className="flex gap-1 text-blue-400 mb-4 relative z-10">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={16} fill="currentColor" />
                ))}
              </div>

              {/* Text */}
              <p className="text-gray-300 text-sm leading-relaxed relative z-10">
                “{t.text}”
              </p>

              {/* Name */}
              <p className="mt-6 text-blue-300 font-semibold text-sm relative z-10">
                — {t.name}
              </p>

              {/* Glass highlight */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] via-transparent to-transparent pointer-events-none" />
            </motion.div>
          ))}
        </div>

        {/* Trust strip (upgraded) */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mt-24 relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] backdrop-blur-2xl p-10 text-center shadow-[0_25px_80px_rgba(0,0,0,0.45)]"
        >
          {/* glow */}
          <div className="absolute top-[-120px] left-[-80px] w-[300px] h-[300px] rounded-full bg-blue-500/10 blur-3xl" />

          <h3 className="text-2xl md:text-3xl font-black text-white">
            Trusted Legal Representation
          </h3>

          <p className="mt-4 text-gray-300 max-w-2xl mx-auto">
            We have successfully represented hundreds of clients across civil,
            corporate, and criminal matters with a strong focus on results and
            confidentiality.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
