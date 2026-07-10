import { useQuery } from '@tanstack/react-query';

import Card from '@/components/ui/Card';
import SectionHeading from '@/components/ui/SectionHeading';
import secretaryCalendarService from '@/modules/staff/secretary/calendar/services/secretaryCalendarService';

export default function SecretaryCalendar() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['secretary-calendar'],
    queryFn: secretaryCalendarService.getEvents,
  });

  return (
    <div className='space-y-6 p-4 md:p-6'>
      <SectionHeading title='Calendar' subtitle='Appointments and schedules' />

      <Card className='p-6'>
        {isLoading && <p>Loading calendar...</p>}
        {error && <p>{error?.response?.data?.detail || 'Failed to load calendar.'}</p>}
        {!isLoading &&
          !error &&
          (data?.events || []).map((event) => (
            <div key={event.id} className='border-b py-3'>
              <strong>{event.title}</strong>
              <p>{event.starts_at} - {event.location}</p>
            </div>
          ))}
      </Card>
    </div>
  );
}
