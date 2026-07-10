import { CalendarDays } from 'lucide-react';

import StaffWorkspacePage from '@/modules/staff/common/pages/StaffWorkspacePage';
import { staffRoleConfigs } from '@/modules/staff/common/config/staffRoleConfigs';

export default function ITCalendar() {
  return (
    <StaffWorkspacePage
      config={staffRoleConfigs.it}
      endpoint='calendar'
      responseKey='calendar'
      title='Calendar'
      description='Maintenance windows, system schedules, and support dates.'
      icon={CalendarDays}
    />
  );
}
