export default function DashboardGrid({ children }) {
  return (
    <div
      className="
        grid grid-cols-1
        xl:grid-cols-12
        gap-6
      "
    >
      {children}
    </div>
  );
}
