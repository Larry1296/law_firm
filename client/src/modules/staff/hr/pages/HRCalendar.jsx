import { CalendarDays } from 'lucide-react';

import StaffWorkspacePage from '@/modules/staff/common/pages/StaffWorkspacePage';
import { staffRoleConfigs } from '@/modules/staff/common/config/staffRoleConfigs';

export default function HRCalendar() {
  return (
    <StaffWorkspacePage
      config={staffRoleConfigs.hr}
      endpoint='calendar'
      responseKey='calendar'
      title='Calendar'
      description='Leave dates, reviews, interviews, and HR schedules.'
      icon={CalendarDays}
    />
  );
}
