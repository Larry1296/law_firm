import { CalendarDays } from 'lucide-react';

import StaffWorkspacePage from '@/modules/staff/common/pages/StaffWorkspacePage';
import { staffRoleConfigs } from '@/modules/staff/common/config/staffRoleConfigs';

export default function AccountantCalendar() {
  return (
    <StaffWorkspacePage
      config={staffRoleConfigs.accountant}
      endpoint='calendar'
      responseKey='calendar'
      title='Calendar'
      description='Finance deadlines, payment schedules, and accounting reminders.'
      icon={CalendarDays}
    />
  );
}
