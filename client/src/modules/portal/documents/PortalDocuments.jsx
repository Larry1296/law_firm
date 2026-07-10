import { useState } from "react";
import {
  Upload,
  FileText,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";

const dummyDocs = [
  {
    id: 1,
    name: "National ID.pdf",
    type: "Identity",
    status: "approved",
    date: "2026-05-20",
  },
  {
    id: 2,
    name: "Land Agreement.pdf",
    type: "Legal Contract",
    status: "pending",
    date: "2026-05-18",
  },
  {
    id: 3,
    name: "Evidence Photo.png",
    type: "Evidence",
    status: "rejected",
    date: "2026-05-16",
  },
];

export default function PortalDocuments() {
  const [docs] = useState(dummyDocs);
  const [filter, setFilter] = useState("all");

  const filteredDocs =
    filter === "all" ? docs : docs.filter((d) => d.type === filter);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary-dark">
            My Documents
          </h1>
          <p className="text-text-muted-dark">
            Upload and manage your legal documents
          </p>
        </div>

        <button className="mt-4 md:mt-0 bg-brand-primary text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:opacity-90">
          <Upload size={16} />
          Upload Document
        </button>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-2">
        {["all", "Identity", "Legal Contract", "Evidence"].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-xl text-sm transition ${
              filter === type
                ? "bg-brand-primary text-white"
                : "bg-surface-dark text-text-muted-dark"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* GRID */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            className="bg-surface-dark p-5 rounded-2xl border border-border-dark shadow-soft"
          >
            {/* ICON + NAME */}
            <div className="flex items-start gap-3">
              <FileText className="text-brand-accent" />

              <div className="flex-1">
                <h3 className="font-medium text-text-primary-dark">
                  {doc.name}
                </h3>
                <p className="text-xs text-text-muted-dark">{doc.type}</p>
              </div>
            </div>

            {/* STATUS */}
            <div className="mt-4 flex items-center justify-between">
              {doc.status === "approved" && (
                <span className="flex items-center gap-1 text-success text-sm">
                  <CheckCircle size={16} /> Approved
                </span>
              )}

              {doc.status === "pending" && (
                <span className="flex items-center gap-1 text-warning text-sm">
                  <Clock size={16} /> Pending
                </span>
              )}

              {doc.status === "rejected" && (
                <span className="flex items-center gap-1 text-error text-sm">
                  <XCircle size={16} /> Rejected
                </span>
              )}

              <span className="text-xs text-text-muted-dark">{doc.date}</span>
            </div>

            {/* ACTIONS */}
            <div className="flex gap-2 mt-4">
              <button className="flex-1 bg-info text-white py-2 rounded-xl text-sm flex items-center justify-center gap-1">
                <Eye size={14} /> View
              </button>

              <button className="flex-1 bg-error text-white py-2 rounded-xl text-sm flex items-center justify-center gap-1">
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* EMPTY STATE (optional fallback) */}
      {filteredDocs.length === 0 && (
        <div className="text-center text-text-muted-dark py-10">
          No documents found in this category.
        </div>
      )}
    </div>
  );
}
