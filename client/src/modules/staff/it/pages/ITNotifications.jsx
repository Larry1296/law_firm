import { Bell } from 'lucide-react';

import StaffWorkspacePage from '@/modules/staff/common/pages/StaffWorkspacePage';
import { staffRoleConfigs } from '@/modules/staff/common/config/staffRoleConfigs';

export default function ITNotifications() {
  return (
    <StaffWorkspacePage
      config={staffRoleConfigs.it}
      endpoint='notifications'
      responseKey='notifications'
      title='Notifications'
      description='System alerts, security updates, and support notices.'
      icon={Bell}
    />
  );
}
