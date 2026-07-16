import EventsWorkspace from '@/modules/events/components/EventsWorkspace';

export default function AdminCalendarPage() {
  return (
    <EventsWorkspace
      title='Firm Calendar'
      subtitle='Live case events across the firm'
      caseBasePath='/admin/cases'
    />
  );
}
