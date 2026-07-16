import EventsWorkspace from '@/modules/events/components/EventsWorkspace';

export default function ClientCaseCalendarPage() {
  return (
    <EventsWorkspace
      title='Case Events'
      subtitle='Current and upcoming events visible to you'
      caseBasePath='/client/cases'
    />
  );
}
