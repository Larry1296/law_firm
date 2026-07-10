export default function Card({ children, className = '' }) {
  return (
    <div
      className={`
        bg-surface-light
        dark:bg-surface-dark
        text-text-primary-light
        dark:text-text-primary-dark

        border
        border-border-light
        dark:border-border-dark

        rounded-2xl

        shadow-soft
        hover:shadow-medium

        transition-all
        duration-200

        active:translate-y-1

        ${className}
      `}
    >
      {children}
    </div>
  );
}
