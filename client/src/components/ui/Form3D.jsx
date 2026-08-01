// src/components/ui/Form3D.jsx
import React from "react";

export default function Form3D({ children, title, subtitle, className = "" }) {
  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div
        className={`
          rounded-3xl p-6 sm:p-8
          bg-white/85 dark:bg-white/[0.07]
          border border-[color:var(--border)]
          shadow-[0_22px_70px_rgba(31,41,51,0.14)]
          backdrop-blur-xl
          transition-colors duration-300
        `}
      >
        {title && (
          <h2
            className={`
              text-2xl font-extrabold tracking-[-0.025em]
              text-[color:var(--text-primary)]
              mb-1
              transition-colors duration-300
            `}
          >
            {title}
          </h2>
        )}

        {subtitle && (
          <p
            className={`
              text-sm
              text-[color:var(--text-muted)]
              mb-6
              transition-colors duration-300
            `}
          >
            {subtitle}
          </p>
        )}

        {children}
      </div>
    </div>
  );
}
