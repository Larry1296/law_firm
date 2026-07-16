import EventsWorkspace from '@/modules/events/components/EventsWorkspace';

export default function LawyerCalendar() {
  return (
    <EventsWorkspace
      title='Case Events'
      subtitle='Current and upcoming events for your assigned cases'
      caseBasePath='/lawyer/cases'
    />
  );
}
