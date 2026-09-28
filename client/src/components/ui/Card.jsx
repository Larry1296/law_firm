export default function Card({ children, className = '', ...props }) {
  return (
    <div
      {...props}
      className={`rounded-[15px] border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-primary)] shadow-[var(--form-shadow)] ${className}`}
    >
      {children}
    </div>
  );
}
