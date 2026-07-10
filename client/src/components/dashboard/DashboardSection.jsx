import DashboardGrid from '@/components/dashboard/DashboardGrid';

export default function DashboardSection({ title, children }) {
  return (
    <section className='space-y-4'>
      <div>
        <h2 className='text-lg font-semibold'>{title}</h2>
      </div>

      <DashboardGrid>{children}</DashboardGrid>
    </section>
  );
}
