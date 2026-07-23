import { useState } from "react";
import { UploadCloud, FileText, X, CheckCircle, Loader2 } from "lucide-react";
import Select3D from "@/components/ui/Select3D";

export default function UploadDocuments() {
  const [file, setFile] = useState(null);
  const [type, setType] = useState("Identity");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleUpload = () => {
    if (!file) return;

    setUploading(true);
    setSuccess(false);

    // fake upload delay
    setTimeout(() => {
      setUploading(false);
      setSuccess(true);

      setFile(null);
      setDescription("");
      setType("Identity");
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-3xl">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary-dark">
          Upload Document
        </h1>
        <p className="text-text-muted-dark">
          Submit documents for legal review or case support
        </p>
      </div>

      {/* UPLOAD CARD */}
      <div className="bg-surface-dark border border-border-dark rounded-2xl p-6 space-y-5 shadow-soft">
        {/* FILE DROP AREA */}
        <div
          className="border-2 border-dashed border-border-dark rounded-2xl p-6 text-center cursor-pointer hover:border-brand-primary transition"
          onClick={() => document.getElementById("fileInput").click()}
        >
          <input
            id="fileInput"
            type="file"
            hidden
            onChange={(e) => setFile(e.target.files[0])}
          />

          <UploadCloud className="mx-auto text-brand-accent" size={40} />

          <p className="mt-2 text-sm text-text-muted-dark">
            Click or drag file here to upload
          </p>

          {file && (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-text-primary-dark">
              <FileText size={16} />
              {file.name}
              <button onClick={() => setFile(null)}>
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {/* TYPE SELECT */}
        <div>
          <label className="text-sm text-text-muted-dark">Document Type</label>

          <Select3D
            value={type}
            onChange={(e) => setType(e.target.value)}
            wrapperClassName="mb-0 mt-1"
            options={[
              { value: "Identity", label: "Identity" },
              { value: "Legal Contract", label: "Legal Contract" },
              { value: "Evidence", label: "Evidence" },
              { value: "Court Document", label: "Court Document" },
              { value: "Other", label: "Other" },
            ]}
          />
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="text-sm text-text-muted-dark">
            Description (optional)
          </label>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add notes about this document..."
            autoComplete="on"
            autoCorrect="on"
            autoCapitalize="sentences"
            spellCheck
            className="w-full mt-1 p-3 rounded-xl bg-background-dark border border-border-dark text-sm min-h-[120px]"
          />
        </div>

        {/* PROGRESS / STATUS */}
        {uploading && (
          <div className="flex items-center gap-2 text-warning text-sm">
            <Loader2 className="animate-spin" size={16} />
            Uploading document...
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 text-success text-sm">
            <CheckCircle size={16} />
            Document uploaded successfully!
          </div>
        )}

        {/* ACTION BUTTON */}
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className={`w-full py-3 rounded-xl font-medium transition flex items-center justify-center gap-2 ${
            !file || uploading
              ? "bg-border-dark text-text-muted-dark cursor-not-allowed"
              : "bg-brand-primary text-white hover:opacity-90"
          }`}
        >
          <UploadCloud size={16} />
          {uploading ? "Uploading..." : "Upload Document"}
        </button>
      </div>
    </div>
  );
}
