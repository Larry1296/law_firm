import { AlertTriangle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen px-6 animate-fadeIn">
      <div className="p-10 rounded-2xl shadow-soft text-center max-w-lg w-full bg-white dark:bg-gray-900 text-black dark:text-white border border-gray-200 dark:border-gray-700">
        {/* ICON */}
        <div className="flex justify-center mb-4">
          <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="text-red-500" size={32} />
          </div>
        </div>

        {/* TITLE */}
        <h1 className="text-4xl font-bold">404</h1>
        <h2 className="text-xl font-semibold mt-2">Page Not Found</h2>

        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          The page you are trying to access does not exist or has been moved.
        </p>

        {/* ACTION */}
        <button
          onClick={() => navigate(-1)}
          className="mt-6 px-5 py-2 rounded-xl bg-blue-600 text-white flex items-center justify-center gap-2 mx-auto hover:bg-blue-700"
        >
          <ArrowLeft size={16} />
          Go Back
        </button>
      </div>
    </div>
  );
}
