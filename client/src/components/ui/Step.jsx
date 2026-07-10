export default function Step({ children, level = 0, id }) {
  return (
    <section
      id={id}
      className={`
        relative
        ${level !== 0 ? "-mt-12 md:-mt-24" : ""}
        px-4 md:px-8
      `}
      style={{ zIndex: 50 - level }}
    >
      <div
        className="
          rounded-t-[2.5rem]
          bg-white
          shadow-[0_-20px_60px_rgba(0,0,0,0.15)]
          overflow-hidden
        "
        style={{
          transform: `translateY(${level * 10}px)`,
        }}
      >
        {children}
      </div>
    </section>
  );
}
