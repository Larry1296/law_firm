import {
  Calendar,
  Clock,
  User,
  Video,
  MapPin,
  FileText,
  ArrowLeft,
  X,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

const dummyConsultations = [
  {
    id: "1",
    lawyer: "Jane Wambui",
    type: "Virtual Meeting",
    date: "2026-05-25",
    time: "10:00 AM",
    status: "upcoming",
    link: "https://meet.example.com/abc123",
    notes: "Prepare all land ownership documents before session.",
    location: null,
  },
  {
    id: "2",
    lawyer: "Michael Otieno",
    type: "In-Person",
    date: "2026-05-18",
    time: "2:00 PM",
    status: "completed",
    link: null,
    notes: "Client advised on contract dispute resolution.",
    location: "Nairobi CBD Office, 3rd Floor",
  },
];

const timeline = [
  { step: "Booked", status: "done" },
  { step: "Confirmed", status: "done" },
  { step: "Ongoing", status: "current" },
  { step: "Completed", status: "pending" },
];

export default function ConsultationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const consultation = dummyConsultations.find((c) => c.id === id);

  if (!consultation) {
    return (
      <div className="p-6 text-center text-text-muted-dark">
        Consultation not found
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-text-muted-dark hover:text-brand-accent"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary-dark">
            Consultation Details
          </h1>
          <p className="text-text-muted-dark">
            Full session information and actions
          </p>
        </div>

        <span
          className={`px-3 py-1 rounded-xl text-xs font-medium ${
            consultation.status === "upcoming"
              ? "bg-warning text-black"
              : "bg-success text-white"
          }`}
        >
          {consultation.status.toUpperCase()}
        </span>
      </div>

      {/* MAIN GRID */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* LEFT */}
        <div className="lg:col-span-2 space-y-6">
          {/* INFO CARD */}
          <div className="bg-surface-dark p-6 rounded-2xl shadow-soft border border-border-dark">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User size={18} /> Lawyer Information
            </h2>

            <p className="text-text-primary-dark font-medium text-lg">
              {consultation.lawyer}
            </p>

            <div className="mt-4 space-y-2 text-sm text-text-muted-dark">
              <p className="flex items-center gap-2">
                <Video size={16} /> {consultation.type}
              </p>

              <p className="flex items-center gap-2">
                <Calendar size={16} /> {consultation.date}
              </p>

              <p className="flex items-center gap-2">
                <Clock size={16} /> {consultation.time}
              </p>

              {consultation.location && (
                <p className="flex items-center gap-2">
                  <MapPin size={16} /> {consultation.location}
                </p>
              )}
            </div>
          </div>

          {/* NOTES */}
          <div className="bg-surface-dark p-6 rounded-2xl shadow-soft border border-border-dark">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText size={18} /> Lawyer Notes
            </h2>

            <p className="text-text-muted-dark text-sm leading-relaxed">
              {consultation.notes}
            </p>
          </div>

          {/* ACTIONS */}
          {consultation.status === "upcoming" && (
            <div className="flex gap-3">
              {consultation.link && (
                <a
                  href={consultation.link}
                  target="_blank"
                  className="flex-1 bg-info text-white py-3 rounded-xl text-center hover:opacity-90"
                >
                  Join Meeting
                </a>
              )}

              <button className="flex-1 bg-warning text-black py-3 rounded-xl hover:opacity-90">
                Reschedule
              </button>

              <button className="flex-1 bg-error text-white py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90">
                <X size={16} /> Cancel
              </button>
            </div>
          )}
        </div>

        {/* RIGHT SIDE */}
        <div className="space-y-6">
          {/* STATUS TIMELINE */}
          <div className="bg-surface-dark p-5 rounded-2xl border border-border-dark shadow-soft">
            <h2 className="font-semibold mb-4">Status Timeline</h2>

            <div className="space-y-3">
              {timeline.map((t, index) => (
                <div key={index} className="flex items-center gap-3">
                  {t.status === "done" && (
                    <CheckCircle size={16} className="text-success" />
                  )}
                  {t.status === "current" && (
                    <AlertCircle size={16} className="text-warning" />
                  )}
                  {t.status === "pending" && (
                    <div className="w-3 h-3 rounded-full bg-text-muted-dark" />
                  )}

                  <span className="text-sm text-text-muted-dark">{t.step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* QUICK INFO */}
          <div className="bg-surface-dark p-5 rounded-2xl border border-border-dark shadow-soft">
            <h2 className="font-semibold mb-3">Quick Summary</h2>

            <div className="text-sm text-text-muted-dark space-y-2">
              <p>• Status: {consultation.status}</p>
              <p>• Type: {consultation.type}</p>
              <p>• Lawyer assigned and confirmed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
