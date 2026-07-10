const DashboardGrid = ({ children, className = '' }) => {
  return (
    <div
      className={`
        dashboard-grid
        grid
        grid-cols-1
        md:grid-cols-2
        xl:grid-cols-4
        gap-4
        mt-4
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default DashboardGrid;
