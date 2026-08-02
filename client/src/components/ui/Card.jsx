export default function Card({ children, className = '', ...props }) {
  return (
    <div
      {...props}
      className={`
        bg-white/80
        dark:bg-white/[0.07]
        text-text-primary-light
        dark:text-text-primary-dark

        border
        border-border-light
        dark:border-border-dark

        rounded-3xl

        shadow-[0_18px_55px_rgba(31,41,51,0.10)]
        hover:shadow-[0_24px_70px_rgba(31,41,51,0.16)]
        backdrop-blur-xl

        transition-all
        duration-300

        hover:-translate-y-0.5

        ${className}
      `}
    >
      {children}
    </div>
  );
}
