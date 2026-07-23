import { useContext, useState } from "react";
import {
  ClipboardPen,
  Upload,
  Briefcase,
  Scale,
  UserRound,
  FileText,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import ThemeContext from "@/core/store/ThemeContext";

import Card from "@/components/ui/Card";
import Button3D from "@/components/ui/Button3D";
import FloatingInput from "@/components/ui/FloatingInput";
import Select3D from "@/components/ui/Select3D";
import { Textarea3D } from "@/components/ui/TextArea3D";

export default function NewIntakeForm() {
  const { theme } = useContext(ThemeContext);

  const isDark = theme === "dark";

  const [formData, setFormData] = useState({
    subject: "",
    category: "",
    phone: "",
    nationalId: "",
    description: "",
    preferredContact: "",
  });

  const [submitted, setSubmitted] = useState(false);

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

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log("New Intake Form:", formData);

    setSubmitted(true);

    setTimeout(() => {
      setSubmitted(false);
    }, 4000);
  };

  return (
    <div className={`min-h-screen ${pageBg} p-4 md:p-6 animate-fadeIn`}>
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ClipboardPen className="text-brand-primary" size={32} />
            New Intake Form
          </h1>

          <p className={`mt-2 max-w-2xl ${mutedText}`}>
            Submit your legal issue details so the legal team can review and
            onboard your matter into the system.
          </p>
        </div>

        <div
          className={`px-4 py-3 rounded-2xl border flex items-center gap-3 ${
            isDark
              ? "bg-warning/10 border-warning/20"
              : "bg-warning/5 border-warning/20"
          }`}
        >
          <AlertCircle className="text-warning" size={20} />

          <p className="text-sm">
            Ensure all information submitted is accurate.
          </p>
        </div>
      </div>

      {/* SUCCESS ALERT */}
      {submitted && (
        <div
          className={`mb-6 rounded-2xl border p-4 flex items-center gap-3 animate-fadeIn ${
            isDark
              ? "bg-success/10 border-success/20"
              : "bg-success/5 border-success/20"
          }`}
        >
          <CheckCircle2 className="text-success" size={22} />

          <div>
            <h3 className="font-semibold">Intake Submitted Successfully</h3>

            <p className={`text-sm ${mutedText}`}>
              Your intake request has been forwarded for review.
            </p>
          </div>
        </div>
      )}

      {/* FORM */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* LEFT SIDE */}
          <div className="xl:col-span-2 space-y-6">
            {/* CASE DETAILS */}
            <Card className={`p-6 border rounded-2xl shadow-soft ${cardBg}`}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center">
                  <Briefcase className="text-brand-primary" size={24} />
                </div>

                <div>
                  <h2 className="text-xl font-semibold">Matter Information</h2>

                  <p className={`text-sm ${mutedText}`}>
                    Provide information regarding your legal matter.
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <FloatingInput
                  label="Matter Subject"
                  type="text"
                  value={formData.subject}
                  onChange={(e) =>
                    handleChange({
                      target: {
                        name: "subject",
                        value: e.target.value,
                      },
                    })
                  }
                />

                {/* CATEGORY */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Legal Category
                  </label>

                  <Select3D
                    label="Legal Category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="Select legal category"
                    options={[
                      { value: "Family Law", label: "Family Law" },
                      { value: "Employment Law", label: "Employment Law" },
                      { value: "Land Dispute", label: "Land Dispute" },
                      { value: "Civil Litigation", label: "Civil Litigation" },
                      { value: "Corporate Law", label: "Corporate Law" },
                      { value: "Criminal Defense", label: "Criminal Defense" },
                    ]}
                  />
                </div>

                {/* DESCRIPTION */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Case Description
                  </label>

                  <Textarea3D
                    rows={7}
                    value={formData.description}
                    onChange={(e) =>
                      handleChange({
                        target: {
                          name: "description",
                          value: e.target.value,
                        },
                      })
                    }
                    placeholder="Explain your legal issue in detail..."
                  />
                </div>
              </div>
            </Card>

            {/* DOCUMENTS */}
            <Card className={`p-6 border rounded-2xl shadow-soft ${cardBg}`}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-info/10 flex items-center justify-center">
                  <FileText className="text-info" size={24} />
                </div>

                <div>
                  <h2 className="text-xl font-semibold">
                    Supporting Documents
                  </h2>

                  <p className={`text-sm ${mutedText}`}>
                    Upload any relevant files or evidence.
                  </p>
                </div>
              </div>

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

                <h3 className="font-semibold text-lg mb-2">Upload Documents</h3>

                <p className={`text-sm mb-5 ${mutedText}`}>
                  PDF, DOCX, JPG, PNG files accepted.
                </p>

                <input type="file" multiple className={inputClass} />
              </div>
            </Card>
          </div>

          {/* RIGHT SIDE */}
          <div className="space-y-6">
            {/* PERSONAL INFO */}
            <Card className={`p-6 border rounded-2xl shadow-soft ${cardBg}`}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center">
                  <UserRound className="text-success" size={24} />
                </div>

                <div>
                  <h2 className="text-xl font-semibold">
                    Personal Information
                  </h2>

                  <p className={`text-sm ${mutedText}`}>
                    Verify your client details.
                  </p>
                </div>
              </div>

              <div className="space-y-5">
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
                  label="National ID / Passport"
                  type="text"
                  value={formData.nationalId}
                  onChange={(e) =>
                    handleChange({
                      target: {
                        name: "nationalId",
                        value: e.target.value,
                      },
                    })
                  }
                />

                {/* CONTACT METHOD */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Preferred Contact Method
                  </label>

                  <Select3D
                    label="Preferred Contact Method"
                    name="preferredContact"
                    value={formData.preferredContact}
                    onChange={handleChange}
                    placeholder="Select contact method"
                    options={[
                      { value: "Phone Call", label: "Phone Call" },
                      { value: "Email", label: "Email" },
                      { value: "WhatsApp", label: "WhatsApp" },
                      { value: "SMS", label: "SMS" },
                    ]}
                  />
                </div>
              </div>
            </Card>

            {/* LEGAL NOTICE */}
            <Card className={`p-6 border rounded-2xl shadow-soft ${cardBg}`}>
              <div className="flex items-center gap-3 mb-5">
                <Scale className="text-brand-accent" size={22} />

                <h2 className="text-lg font-semibold">Legal Notice</h2>
              </div>

              <div className={`space-y-3 text-sm ${mutedText}`}>
                <p>
                  All submitted information is treated as confidential and
                  protected under legal professional privilege where applicable.
                </p>

                <p>
                  Submission of this intake form does not automatically
                  establish an advocate-client relationship.
                </p>
              </div>
            </Card>

            {/* ACTIONS */}
            <div className="space-y-4">
              <Button3D type="submit" variant="primary" className="w-full">
                Submit Intake Form
              </Button3D>

              <Button3D type="button" variant="secondary" className="w-full">
                Save as Draft
              </Button3D>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
