import { useState } from "react";
import { LifeBuoy, Plus, Clock, CheckCircle, AlertCircle } from "lucide-react";

const dummyTickets = [
  {
    id: 1,
    subject: "Login issue",
    status: "open",
    priority: "high",
    created: "2026-05-20",
  },
  {
    id: 2,
    subject: "Consultation reschedule",
    status: "resolved",
    priority: "medium",
    created: "2026-05-18",
  },
];

export default function PortalSupport() {
  const [tickets] = useState(dummyTickets);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-2xl font-bold">Support Center</h1>
          <p className="text-text-muted-dark">
            Raise issues and track support tickets
          </p>
        </div>

        <button className="mt-4 md:mt-0 bg-brand-primary text-white px-4 py-2 rounded-xl flex items-center gap-2">
          <Plus size={16} /> New Ticket
        </button>
      </div>

      {/* STATS */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-surface-dark p-4 rounded-2xl border border-border-dark">
          <p className="text-sm text-text-muted-dark">Open Tickets</p>
          <p className="text-2xl font-bold">1</p>
        </div>

        <div className="bg-surface-dark p-4 rounded-2xl border border-border-dark">
          <p className="text-sm text-text-muted-dark">Resolved</p>
          <p className="text-2xl font-bold">1</p>
        </div>

        <div className="bg-surface-dark p-4 rounded-2xl border border-border-dark">
          <p className="text-sm text-text-muted-dark">Avg Response</p>
          <p className="text-2xl font-bold">2h</p>
        </div>
      </div>

      {/* TICKETS */}
      <div className="space-y-3">
        {tickets.map((t) => (
          <div
            key={t.id}
            className="bg-surface-dark p-4 rounded-2xl border border-border-dark flex justify-between items-center"
          >
            <div>
              <p className="font-medium">{t.subject}</p>
              <p className="text-xs text-text-muted-dark">
                Created: {t.created}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {t.status === "open" ? (
                <span className="flex items-center gap-1 text-warning text-sm">
                  <AlertCircle size={16} /> Open
                </span>
              ) : (
                <span className="flex items-center gap-1 text-success text-sm">
                  <CheckCircle size={16} /> Resolved
                </span>
              )}

              <span className="text-xs px-2 py-1 rounded-xl bg-border-dark">
                {t.priority}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
