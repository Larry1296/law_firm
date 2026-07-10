export default function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="
          w-full px-3 py-2
          border border-gray-200
          rounded-lg
          shadow-sm
          focus:outline-none
          focus:ring-2 focus:ring-blue-500
          focus:border-blue-500
          transition
          resize-none
        "
      />
    </div>
  );
}
