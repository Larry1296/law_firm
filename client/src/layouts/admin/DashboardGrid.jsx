export default function DashboardGrid({ children }) {
  return (
    <div
      className="
        grid w-full min-w-0 grid-cols-1
        gap-0 sm:grid-cols-2
        xl:grid-cols-12
      "
    >
      {children}
    </div>
  );
}
