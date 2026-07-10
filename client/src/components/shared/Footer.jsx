import { useContext } from "react";
import { FaFacebook, FaTwitter, FaLinkedin } from "react-icons/fa";
import { Mail, Phone, MapPin } from "lucide-react";
import Brand from "@/components/ui/Brand";
import ThemeContext from "@/core/store/ThemeContext";

export default function Footer() {
  const { theme } = useContext(ThemeContext);

  // Dynamic background based on theme
  const bgFooter =
    theme === "dark"
      ? "bg-[color:var(--surface-dark)] text-white"
      : "bg-[color:var(--brand-primary)] text-white";

  return (
    <footer className={`${bgFooter} mt-auto`}>
      <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-10">
        {/* LOGO / ABOUT */}
        <div>
          <Brand size="h-16 w-16" textSize="text-2xl" textColor="text-white" />
          <p className="mt-4 text-sm text-white/80">
            Professional legal services you can trust. We provide reliable and
            efficient legal solutions tailored to your needs.
          </p>
        </div>

        {/* CONTACT */}
        <div>
          <h3 className="font-semibold mb-4 text-white/90">Contact</h3>
          <div className="space-y-3 text-sm text-white/70">
            <div className="flex items-center gap-2">
              <MapPin size={16} />
              <span>Nairobi, Kenya</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone size={16} />
              <span>+254 700 000 000</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail size={16} />
              <span>info@sheriadesk.com</span>
            </div>
          </div>
        </div>

        {/* SOCIAL */}
        <div>
          <h3 className="font-semibold mb-4 text-white/90">Follow Us</h3>
          <div className="flex gap-4 text-white/80">
            <a href="#" className="hover:text-white transition">
              <FaFacebook />
            </a>
            <a href="#" className="hover:text-white transition">
              <FaTwitter />
            </a>
            <a href="#" className="hover:text-white transition">
              <FaLinkedin />
            </a>
          </div>
        </div>
      </div>

      {/* BOTTOM */}
      <div className="border-t border-white/30 text-center py-4 text-sm text-white/70">
        © {new Date().getFullYear()} Sheria Desk. All rights reserved.
      </div>
    </footer>
  );
}
