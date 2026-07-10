// src/modules/portal/onboarding/BecomeClient.jsx

import { useContext, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Upload,
  UserPlus,
  ShieldCheck,
  Briefcase,
  ArrowRight,
  FileBadge2,
  Scale,
} from "lucide-react";

import ThemeContext from "@/core/store/ThemeContext";

import Card from "@/components/ui/Card";
import Button3D from "@/components/ui/Button3D";
import FloatingInput from "@/components/ui/FloatingInput";
import { Textarea3D } from "@/components/ui/TextArea3D";

export default function BecomeClient() {
  const { theme } = useContext(ThemeContext);

  const isDark = theme === "dark";

  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    companyName: "",
    fullName: "",
    email: "",
    phone: "",
    legalNeed: "",
    caseCategory: "",
    description: "",
  });

  const pageBg = isDark
    ? "bg-background-dark text-text-primary-dark"
    : "bg-background-light text-slate-800";

  const cardBg = isDark
    ? "bg-surface-dark border-border-dark"
    : "bg-surface-light border-border-light";

  const mutedText = isDark ? "text-text-muted-dark" : "text-slate-500";

  const inputClass = `
    w-full rounded-2xl border px-4 py-3 outline-none transition-all
    ${
      isDark
        ? "bg-black/20 border-border-dark text-white placeholder:text-slate-500 focus:border-brand-primary"
        : "bg-white border-border-light text-slate-800 placeholder:text-slate-400 focus:border-brand-primary"
    }
  `;

  const benefits = [
    "Dedicated legal representation",
    "Secure case & document management",
    "Client-lawyer communication portal",
    "Consultation scheduling access",
    "Real-time legal updates & notifications",
    "Priority support from legal teams",
  ];

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log("Become Client Request:", formData);

    setSubmitted(true);

    setTimeout(() => {
      setSubmitted(false);
    }, 4000);
  };

  return (
    <div className={`min-h-screen ${pageBg} p-4 md:p-6 animate-fadeIn`}>
      {/* HERO */}
      <div
        className={`relative overflow-hidden rounded-[28px] border p-8 md:p-10 mb-8 shadow-medium ${
          isDark
            ? "bg-gradient-to-br from-brand-primary/20 to-surface-dark border-border-dark"
            : "bg-gradient-to-br from-blue-50 to-yellow-50 border-border-light"
        }`}
      >
        <div className="absolute top-0 right-0 w-72 h-72 bg-brand-primary/10 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary/10 text-brand-primary font-medium mb-5">
            <Scale size={18} />
            Legal Client Onboarding
          </div>

          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-5">
            Become a Full Legal Client
          </h1>

          <p className={`text-lg max-w-3xl ${mutedText}`}>
            Submit your onboarding request and get connected with the legal team
            for representation, legal consultation, case management, and secure
            legal support.
          </p>
        </div>
      </div>

      {/* SUCCESS ALERT */}
      {submitted && (
        <div
          className={`mb-6 rounded-2xl border p-5 flex items-start gap-4 animate-fadeIn ${
            isDark
              ? "bg-success/10 border-success/20"
              : "bg-success/5 border-success/20"
          }`}
        >
          <CheckCircle2 className="text-success mt-1" size={24} />

          <div>
            <h3 className="font-semibold text-lg">Client Request Submitted</h3>

            <p className={`text-sm mt-1 ${mutedText}`}>
              Your onboarding request has been forwarded to the legal intake
              team for review and approval.
            </p>
          </div>
        </div>
      )}

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* LEFT */}
        <div className="xl:col-span-2 space-y-6">
          {/* FORM */}
          <Card className={`p-6 border rounded-2xl shadow-soft ${cardBg}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center">
                <UserPlus className="text-brand-primary" size={28} />
              </div>

              <div>
                <h2 className="text-2xl font-semibold">
                  Client Onboarding Form
                </h2>

                <p className={`text-sm ${mutedText}`}>
                  Complete the onboarding request below.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* BASIC INFO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FloatingInput
                  label="Full Name"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) =>
                    handleChange({
                      target: {
                        name: "fullName",
                        value: e.target.value,
                      },
                    })
                  }
                />

                <FloatingInput
                  label="Email Address"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    handleChange({
                      target: {
                        name: "email",
                        value: e.target.value,
                      },
                    })
                  }
                />

                <FloatingInput
                  label="Phone Number"
                  type="text"
                  value={formData.phone}
                  onChange={(e) =>
                    handleChange({
                      target: {
                        name: "phone",
                        value: e.target.value,
                      },
                    })
                  }
                />

                <FloatingInput
                  label="Company / Business Name"
                  type="text"
                  value={formData.companyName}
                  onChange={(e) =>
                    handleChange({
                      target: {
                        name: "companyName",
                        value: e.target.value,
                      },
                    })
                  }
                />
              </div>

              {/* CASE CATEGORY */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Legal Need Category
                </label>

                <select
                  name="caseCategory"
                  value={formData.caseCategory}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="">Select legal category</option>

                  <option value="Family Law">Family Law</option>

                  <option value="Employment Law">Employment Law</option>

                  <option value="Civil Litigation">Civil Litigation</option>

                  <option value="Corporate Law">Corporate Law</option>

                  <option value="Criminal Defense">Criminal Defense</option>

                  <option value="Land & Property">Land & Property</option>
                </select>
              </div>

              {/* LEGAL NEED */}
              <FloatingInput
                label="Primary Legal Need"
                type="text"
                value={formData.legalNeed}
                onChange={(e) =>
                  handleChange({
                    target: {
                      name: "legalNeed",
                      value: e.target.value,
                    },
                  })
                }
              />

              {/* DESCRIPTION */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Matter Description
                </label>

                <Textarea3D
                  rows={7}
                  placeholder="Provide details about your legal issue or representation request..."
                  value={formData.description}
                  onChange={(e) =>
                    handleChange({
                      target: {
                        name: "description",
                        value: e.target.value,
                      },
                    })
                  }
                />
              </div>

              {/* FILE UPLOAD */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  Supporting Documents
                </label>

                <div
                  className={`border-2 border-dashed rounded-2xl p-10 text-center ${
                    isDark
                      ? "border-border-dark bg-black/20"
                      : "border-border-light bg-slate-50"
                  }`}
                >
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 flex items-center justify-center">
                      <Upload className="text-brand-primary" size={30} />
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold mb-2">
                    Upload Documents
                  </h3>

                  <p className={`text-sm mb-5 ${mutedText}`}>
                    Upload contracts, IDs, agreements, or supporting evidence.
                  </p>

                  <input type="file" multiple className={inputClass} />
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex flex-col sm:flex-row gap-4 pt-3">
                <Button3D
                  type="submit"
                  variant="primary"
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  Submit Client Request
                  <ArrowRight size={18} />
                </Button3D>

                <Button3D type="button" variant="secondary" className="flex-1">
                  Save Draft
                </Button3D>
              </div>
            </form>
          </Card>
        </div>

        {/* RIGHT */}
        <div className="space-y-6">
          {/* BENEFITS */}
          <Card className={`p-6 border rounded-2xl shadow-soft ${cardBg}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center">
                <ShieldCheck className="text-success" size={24} />
              </div>

              <div>
                <h2 className="text-xl font-semibold">Client Benefits</h2>

                <p className={`text-sm ${mutedText}`}>
                  Access premium legal services.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 rounded-2xl p-4 ${
                    isDark ? "bg-black/20" : "bg-slate-50"
                  }`}
                >
                  <CheckCircle2 className="text-success mt-0.5" size={18} />

                  <p className="text-sm leading-relaxed">{benefit}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* STATUS */}
          <Card className={`p-6 border rounded-2xl shadow-soft ${cardBg}`}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-warning/10 flex items-center justify-center">
                <FileBadge2 className="text-warning" size={22} />
              </div>

              <div>
                <h2 className="text-xl font-semibold">Onboarding Process</h2>

                <p className={`text-sm ${mutedText}`}>How onboarding works.</p>
              </div>
            </div>

            <div className="space-y-5">
              {[
                "Submit onboarding request",
                "Legal intake review",
                "Conflict & compliance checks",
                "Matter assignment",
                "Client approval & activation",
              ].map((step, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-brand-primary text-white flex items-center justify-center font-semibold text-sm">
                    {index + 1}
                  </div>

                  <p className="text-sm font-medium">{step}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* QUICK INFO */}
          <Card className={`p-6 border rounded-2xl shadow-soft ${cardBg}`}>
            <div className="flex items-center gap-3 mb-5">
              <Building2 className="text-brand-primary" size={24} />

              <h2 className="text-xl font-semibold">Legal Representation</h2>
            </div>

            <p className={`text-sm leading-relaxed ${mutedText}`}>
              Once approved, your portal account will be upgraded into a full
              client account with access to case tracking, lawyer
              communications, hearings, billing, and document workflows.
            </p>

            <div
              className={`mt-5 rounded-2xl p-4 border ${
                isDark
                  ? "bg-brand-primary/10 border-brand-primary/20"
                  : "bg-blue-50 border-blue-100"
              }`}
            >
              <div className="flex items-start gap-3">
                <Briefcase className="text-brand-primary mt-0.5" size={18} />

                <p className="text-sm">
                  Approval timelines typically range between 24–72 hours
                  depending on the complexity of the legal matter.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
