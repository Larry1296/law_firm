import { createElement, useContext } from "react";
import ThemeContext from "@/core/store/ThemeContext";

export default function SectionHeading({
  title,
  subtitle,
  align = "center",
  className = "",
  size = "lg",
  as: HeadingTag = "h2",
  hero = true,

  variant, // "dark" | "light" | undefined (auto)
}) {
  const context = useContext(ThemeContext);
  const theme = context?.theme || "dark";

  // final mode = prop overrides context
  const mode = hero ? "dark" : variant || theme;
  const finalAlign = hero ? "center" : align;

  const alignStyles = {
    center: "text-center mx-auto",
    left: "text-left",
  };

  const titleColor = mode === "dark" ? "text-white" : "text-gray-900";

  const subtitleColor = mode === "dark" ? "text-gray-300" : "text-gray-600";
  const sizeStyles = {
    lg: {
      wrapper: "max-w-5xl mb-16",
      title: "text-4xl sm:text-5xl lg:text-6xl",
      underline: "h-[4px] w-20 mt-4",
      subtitle: "mt-5 text-base sm:text-lg lg:text-xl leading-relaxed",
    },
    compact: {
      wrapper: "max-w-3xl mb-0",
      title: "text-2xl sm:text-3xl",
      underline: "h-[3px] w-14 mt-3",
      subtitle: "mt-2 text-base sm:text-lg leading-7",
    },
    hero: {
      wrapper: "max-w-3xl mb-0",
      title: "text-4xl sm:text-5xl lg:text-6xl",
      underline: "h-[4px] w-24 mt-4",
      subtitle: "mt-4 text-lg sm:text-xl leading-8",
    },
    dashboard: {
      wrapper: "max-w-3xl mb-0",
      title: "text-3xl sm:text-4xl lg:text-5xl",
      underline: "h-[4px] w-20 mt-3",
      subtitle: "mt-3 text-base sm:text-lg leading-7",
    },
  };
  const styles = sizeStyles[size] || sizeStyles.lg;
  const heading = createElement(
    HeadingTag,
    {
      className: `${styles.title} relative inline-block font-extrabold leading-[1.08] tracking-[-0.035em] ${titleColor}`,
      style: {
        textShadow:
          mode === "dark"
            ? "0 6px 16px rgba(0,0,0,0.5)"
            : "0 2px 8px rgba(0,0,0,0.12)",
      },
    },
    title,
  );

  const content = (
    <div
      className={`${styles.wrapper} ${hero ? '!mb-0' : ''} ${alignStyles[finalAlign]} ${className}`}
    >
      {heading}

      {subtitle && (
        <p className={`${styles.subtitle} ${subtitleColor}`}>
          {subtitle}
        </p>
      )}

      <span
        aria-hidden="true"
        className={`${styles.underline} block rounded-full ${
          finalAlign === "left" ? "" : "mx-auto"
        } bg-gradient-to-r from-blue-500 to-indigo-500`}
      />
    </div>
  );

  if (!hero) return content;

  return (
    <section className='shell-surface w-full rounded-none px-4 py-6 text-center sm:px-6 sm:py-8'>
      <div className='mx-auto flex w-full justify-center'>
        {content}
      </div>
    </section>
  );
}
