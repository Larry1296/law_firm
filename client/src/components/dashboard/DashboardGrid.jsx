const DashboardGrid = ({ children, className = '' }) => {
  return (
    <div
      className={`
        dashboard-grid
        grid
        w-full
        min-w-0
        grid-cols-1
        md:grid-cols-2
        xl:grid-cols-4
        gap-1.5
        sm:gap-2
        lg:gap-2.5
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default DashboardGrid;
