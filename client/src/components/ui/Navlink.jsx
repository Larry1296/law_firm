export default function NavLink({ label, onClick, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`
        text-white
        font-medium
        px-5 py-2
        rounded-2xl
        transition-all duration-200
        hover:text-[color:var(--brand-accent)]
        ${className}
      `}
    >
      {label}
    </button>
  );
}
