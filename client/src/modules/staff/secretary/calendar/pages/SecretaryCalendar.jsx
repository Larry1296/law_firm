import EventsWorkspace from '@/modules/events/components/EventsWorkspace';

export default function SecretaryCalendar() {
  return (
    <EventsWorkspace
      title='Case Events'
      subtitle='Confirm whether clients are aware of current and upcoming events'
      caseBasePath='/secretary/cases'
      secretaryMode
    />
  );
}
