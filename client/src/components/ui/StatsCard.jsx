import { motion } from "framer-motion";

export default function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendType = "positive",
  color = "blue",
}) {
  const trendStyles = {
    positive: "text-success",
    negative: "text-error",
    warning: "text-warning",
    neutral: "text-info",
  };

  const iconStyles = {
    blue: "bg-blue-500/10 text-blue-500",
    green: "bg-emerald-500/10 text-emerald-500",
    yellow: "bg-yellow-500/10 text-yellow-500",
    red: "bg-red-500/10 text-red-500",
    purple: "bg-purple-500/10 text-purple-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      whileHover={{ y: -2 }}
      className="
        rounded-2xl
        border
        border-border-light dark:border-border-dark
        bg-surface-light dark:bg-surface-dark
        shadow-soft
        hover:shadow-medium
        transition-all duration-300
        p-4 sm:p-5
      "
    >
      <div className="flex min-w-0 items-start justify-between gap-3 sm:gap-4">
        {/* LEFT */}
        <div className="min-w-0 space-y-3">
          <p
            className="
              text-sm font-medium
              text-slate-500 dark:text-text-muted-dark
            "
          >
            {title}
          </p>

          <div>
            <h2
              className="
                break-words text-2xl font-bold tracking-tight sm:text-3xl
                text-slate-900 dark:text-white
              "
            >
              {value}
            </h2>

            {subtitle && (
              <p
                className="
                  mt-1 break-words text-sm
                  text-slate-500 dark:text-text-muted-dark
                "
              >
                {subtitle}
              </p>
            )}
          </div>

          {trend && (
            <div
              className={`
                text-xs font-semibold
                ${trendStyles[trendType]}
              `}
            >
              {trend}
            </div>
          )}
        </div>

        {/* ICON */}
        <div
          className={`
            h-10 w-10 shrink-0 rounded-2xl sm:h-12 sm:w-12
            flex items-center justify-center
            ${iconStyles[color]}
          `}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
