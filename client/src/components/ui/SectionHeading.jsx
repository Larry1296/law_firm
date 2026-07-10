import { useContext } from "react";
import ThemeContext from "@/core/store/ThemeContext";

export default function SectionHeading({
  title,
  subtitle,
  align = "center",
  className = "",
  size = "lg",
  as: HeadingTag = "h2",

  variant, // "dark" | "light" | undefined (auto)
}) {
  const context = useContext(ThemeContext);
  const theme = context?.theme || "dark";

  // final mode = prop overrides context
  const mode = variant || theme;

  const alignStyles = {
    center: "text-center mx-auto",
    left: "text-left",
  };

  const titleColor = mode === "dark" ? "text-white" : "text-gray-900";

  const subtitleColor = mode === "dark" ? "text-gray-300" : "text-gray-600";
  const sizeStyles = {
    lg: {
      wrapper: "max-w-3xl mb-16",
      title: "text-4xl",
      underline: "h-[4px] w-16 mt-3",
      subtitle: "mt-5 text-lg leading-relaxed",
    },
    compact: {
      wrapper: "max-w-3xl mb-0",
      title: "text-xl",
      underline: "h-[3px] w-10 mt-2",
      subtitle: "mt-1 text-sm leading-6",
    },
    hero: {
      wrapper: "max-w-3xl mb-0",
      title: "text-3xl lg:text-4xl",
      underline: "h-[4px] w-16 mt-3",
      subtitle: "mt-3 text-base leading-7",
    },
  };
  const styles = sizeStyles[size] || sizeStyles.lg;

  return (
    <div className={`${styles.wrapper} ${alignStyles[align]} ${className}`}>
      <HeadingTag
        className={`${styles.title} font-bold relative inline-block ${titleColor}`}
        style={{
          textShadow:
            mode === "dark"
              ? "0 6px 16px rgba(0,0,0,0.5)"
              : "0 2px 8px rgba(0,0,0,0.12)",
        }}
      >
        {title}

        <span
          className={`${styles.underline} block rounded-full ${
            align === "left" ? "" : "mx-auto"
          } bg-gradient-to-r from-blue-500 to-indigo-500`}
        />
      </HeadingTag>

      {subtitle && (
        <p className={`${styles.subtitle} ${subtitleColor}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
