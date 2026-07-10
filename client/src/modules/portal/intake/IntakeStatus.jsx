// src/modules/portal/intake/IntakeStatus.jsx

import { useContext } from "react";
import {
  ClipboardCheck,
  Clock3,
  CheckCircle2,
  AlertTriangle,
  FileText,
  UserRound,
  ArrowRight,
} from "lucide-react";

import ThemeContext from "@/core/store/ThemeContext";
import Card from "@/components/ui/Card";
import Button3D from "@/components/ui/Button3D";

const statuses = [
  {
    id: 1,
    title: "Personal Information Form",
    status: "Approved",
    description:
      "Your identity and contact details were verified successfully.",
    submittedAt: "15 May 2026",
    reviewedBy: "Client Intake Department",
    progress: 100,
  },
  {
    id: 2,
    title: "Employment Dispute Intake",
    status: "Under Review",
    description:
      "Our legal team is reviewing the information and attached evidence.",
    submittedAt: "17 May 2026",
    reviewedBy: "Labour Law Unit",
    progress: 70,
  },
  {
    id: 3,
    title: "Supporting Documents",
    status: "Pending",
    description: "Additional payslips and employment contracts are required.",
    submittedAt: "18 May 2026",
    reviewedBy: "Awaiting Submission",
    progress: 35,
  },
];

export default function IntakeStatus() {
  const { theme } = useContext(ThemeContext);

  const isDark = theme === "dark";

  const pageBg = isDark
    ? "bg-background-dark text-text-primary-dark"
    : "bg-background-light text-slate-800";

  const mutedText = isDark ? "text-text-muted-dark" : "text-slate-500";

  const cardBg = isDark
    ? "bg-surface-dark border-border-dark"
    : "bg-surface-light border-border-light";

  const getStatusBadge = (status) => {
    switch (status) {
      case "Approved":
        return "bg-success/20 text-success";
      case "Under Review":
        return "bg-warning/20 text-warning";
      case "Pending":
        return "bg-error/20 text-error";
      default:
        return "bg-info/20 text-info";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Approved":
        return <CheckCircle2 size={18} />;
      case "Under Review":
        return <Clock3 size={18} />;
      case "Pending":
        return <AlertTriangle size={18} />;
      default:
        return <ClipboardCheck size={18} />;
    }
  };

  return (
    <div className={`min-h-screen ${pageBg} p-4 md:p-6 animate-fadeIn`}>
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ClipboardCheck className="text-brand-primary" size={32} />
            Intake Status
          </h1>

          <p className={`mt-2 ${mutedText}`}>
            Track your submitted legal intake forms and approval progress.
          </p>
        </div>

        <Button3D variant="primary" className="flex items-center gap-2">
          Submit New Intake
          <ArrowRight size={18} />
        </Button3D>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <Card className={`p-5 border shadow-soft rounded-2xl ${cardBg}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={mutedText}>Total Intakes</p>
              <h2 className="text-3xl font-bold mt-2">03</h2>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center">
              <FileText className="text-brand-primary" size={28} />
            </div>
          </div>
        </Card>

        <Card className={`p-5 border shadow-soft rounded-2xl ${cardBg}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={mutedText}>Approved</p>
              <h2 className="text-3xl font-bold mt-2 text-success">01</h2>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="text-success" size={28} />
            </div>
          </div>
        </Card>

        <Card className={`p-5 border shadow-soft rounded-2xl ${cardBg}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={mutedText}>Pending Review</p>
              <h2 className="text-3xl font-bold mt-2 text-warning">02</h2>
            </div>

            <div className="w-14 h-14 rounded-2xl bg-warning/10 flex items-center justify-center">
              <Clock3 className="text-warning" size={28} />
            </div>
          </div>
        </Card>
      </div>

      {/* STATUS LIST */}
      <div className="space-y-6">
        {statuses.map((item) => (
          <Card
            key={item.id}
            className={`border rounded-2xl shadow-soft overflow-hidden ${cardBg}`}
          >
            <div className="p-6">
              {/* TOP */}
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <h2 className="text-xl font-semibold">{item.title}</h2>

                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${getStatusBadge(
                        item.status,
                      )}`}
                    >
                      {getStatusIcon(item.status)}
                      {item.status}
                    </span>
                  </div>

                  <p className={`${mutedText} max-w-3xl`}>{item.description}</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button3D variant="secondary">View Details</Button3D>

                  <Button3D variant="primary">Continue Intake</Button3D>
                </div>
              </div>

              {/* META */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
                <div
                  className={`rounded-2xl border p-4 ${
                    isDark
                      ? "bg-black/20 border-border-dark"
                      : "bg-white border-border-light"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Clock3 className="text-brand-primary" size={18} />
                    <h3 className="font-semibold">Submitted Date</h3>
                  </div>

                  <p className={mutedText}>{item.submittedAt}</p>
                </div>

                <div
                  className={`rounded-2xl border p-4 ${
                    isDark
                      ? "bg-black/20 border-border-dark"
                      : "bg-white border-border-light"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <UserRound className="text-brand-primary" size={18} />
                    <h3 className="font-semibold">Reviewing Department</h3>
                  </div>

                  <p className={mutedText}>{item.reviewedBy}</p>
                </div>
              </div>

              {/* PROGRESS */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">Completion Progress</p>

                  <p className="text-sm font-semibold text-brand-primary">
                    {item.progress}%
                  </p>
                </div>

                <div
                  className={`w-full h-3 rounded-full overflow-hidden ${
                    isDark ? "bg-black/30" : "bg-slate-200"
                  }`}
                >
                  <div
                    className="h-full bg-brand-primary rounded-full transition-all duration-500"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
