import { Bell } from 'lucide-react';

import StaffWorkspacePage from '@/modules/staff/common/pages/StaffWorkspacePage';
import { staffRoleConfigs } from '@/modules/staff/common/config/staffRoleConfigs';

export default function HRNotifications() {
  return (
    <StaffWorkspacePage
      config={staffRoleConfigs.hr}
      endpoint='notifications'
      responseKey='notifications'
      title='Notifications'
      description='Staff updates, HR alerts, and firm notices.'
      icon={Bell}
    />
  );
}
