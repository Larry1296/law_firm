import { useState } from "react";
import { FileText, Send, CheckCircle, Clock, AlertCircle } from "lucide-react";

const dummySubmissions = [
  {
    id: 1,
    title: "Land Ownership Dispute",
    category: "Property Law",
    status: "under_review",
    submitted: "2026-05-20",
  },
  {
    id: 2,
    title: "Employment Contract Review",
    category: "Employment Law",
    status: "approved",
    submitted: "2026-05-15",
  },
];

export default function IntakeForms() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Property Law");
  const [description, setDescription] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    setSuccess(true);

    setTitle("");
    setCategory("Property Law");
    setDescription("");

    setTimeout(() => {
      setSuccess(false);
    }, 3000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary-dark">
          Legal Intake Forms
        </h1>

        <p className="text-text-muted-dark mt-1">
          Submit your legal issue for review by our legal team
        </p>
      </div>

      {/* FORM */}
      <div className="bg-surface-dark border border-border-dark rounded-2xl p-6 shadow-soft">
        <div className="flex items-center gap-2 mb-5">
          <FileText size={20} className="text-brand-accent" />
          <h2 className="text-lg font-semibold">New Intake Submission</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* TITLE */}
          <div>
            <label className="text-sm text-text-muted-dark">
              Case / Issue Title
            </label>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Example: Land ownership dispute"
              className="w-full mt-1 px-4 py-3 rounded-xl bg-background-dark border border-border-dark text-sm outline-none focus:border-brand-primary"
              required
            />
          </div>

          {/* CATEGORY */}
          <div>
            <label className="text-sm text-text-muted-dark">
              Legal Category
            </label>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full mt-1 px-4 py-3 rounded-xl bg-background-dark border border-border-dark text-sm outline-none focus:border-brand-primary"
            >
              <option>Property Law</option>
              <option>Family Law</option>
              <option>Employment Law</option>
              <option>Criminal Law</option>
              <option>Corporate Law</option>
              <option>Immigration Law</option>
              <option>Tax Law</option>
              <option>Civil Litigation</option>
              <option>Other</option>
            </select>
          </div>

          {/* DESCRIPTION */}
          <div>
            <label className="text-sm text-text-muted-dark">
              Explain Your Legal Issue
            </label>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide all relevant details regarding your legal issue..."
              className="w-full mt-1 px-4 py-3 rounded-xl bg-background-dark border border-border-dark text-sm min-h-[160px] outline-none focus:border-brand-primary"
              required
            />
          </div>

          {/* SUCCESS */}
          {success && (
            <div className="flex items-center gap-2 text-success text-sm">
              <CheckCircle size={16} />
              Intake form submitted successfully.
            </div>
          )}

          {/* SUBMIT */}
          <button
            type="submit"
            className="w-full bg-brand-primary text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-90 transition"
          >
            <Send size={16} />
            Submit Intake Form
          </button>
        </form>
      </div>

      {/* PREVIOUS SUBMISSIONS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Previous Submissions</h2>

          <span className="text-sm text-text-muted-dark">
            {dummySubmissions.length} submissions
          </span>
        </div>

        {dummySubmissions.map((item) => (
          <div
            key={item.id}
            className="bg-surface-dark border border-border-dark rounded-2xl p-5 shadow-soft flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          >
            {/* LEFT */}
            <div>
              <h3 className="font-semibold text-text-primary-dark">
                {item.title}
              </h3>

              <p className="text-sm text-text-muted-dark mt-1">
                {item.category}
              </p>

              <p className="text-xs text-text-muted-dark mt-2">
                Submitted: {item.submitted}
              </p>
            </div>

            {/* STATUS */}
            <div>
              {item.status === "under_review" && (
                <span className="flex items-center gap-2 text-warning text-sm">
                  <Clock size={16} />
                  Under Review
                </span>
              )}

              {item.status === "approved" && (
                <span className="flex items-center gap-2 text-success text-sm">
                  <CheckCircle size={16} />
                  Approved
                </span>
              )}

              {item.status === "rejected" && (
                <span className="flex items-center gap-2 text-error text-sm">
                  <AlertCircle size={16} />
                  Rejected
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
