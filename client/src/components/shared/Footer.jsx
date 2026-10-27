import { useContext } from "react";
import { Globe, Mail, Phone, MapPin } from "lucide-react";
import Brand from "@/components/ui/Brand";
import AuthContext from "@/core/store/AuthContext";

// Inside a firm's workspace the footer shows that firm's own contact details,
// as recorded on its firm profile; nothing is shown that the firm has not recorded.
function FirmContact({ contact }) {
  const rows = [
    [<MapPin size={16} />, contact.location],
    [<Phone size={16} />, contact.phone_number],
    [<Mail size={16} />, contact.email],
    [<Globe size={16} />, contact.website],
  ].filter(([, value]) => value);
  if (!rows.length) return null;

  return (
    <div>
      <h3 className="font-semibold mb-4 text-white dark:text-white/90">Contact</h3>
      <div className="space-y-3 text-sm text-white dark:text-white/70">
        {rows.map(([icon, value]) => (
          <div key={value} className="flex items-center gap-2">
            {icon}
            <span>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Footer() {
  const auth = useContext(AuthContext);
  const contact = auth?.user?.firm?.contact;

  return (
    <footer className="mt-auto shell-surface">
      <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-10">
        {/* LOGO / ABOUT */}
        <div>
          <Brand size="h-24 w-24" textSize="text-2xl" textColor="text-white" />
          <p className="mt-4 text-sm text-white dark:text-white/80">
            Practice management for Kenyan law firms: matters, courts, clients
            and accounts, with a private workspace for every firm.
          </p>
        </div>

        {contact && <FirmContact contact={contact} />}
      </div>

      {/* BOTTOM */}
      <div className="border-t border-white/30 text-center py-4 text-sm text-white dark:text-white/70">
        © {new Date().getFullYear()} Sheria Master. All rights reserved.
      </div>
    </footer>
  );
}
