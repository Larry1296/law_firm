import { Bell } from 'lucide-react';

import StaffWorkspacePage from '@/modules/staff/common/pages/StaffWorkspacePage';
import { staffRoleConfigs } from '@/modules/staff/common/config/staffRoleConfigs';

export default function AccountantNotifications() {
  return (
    <StaffWorkspacePage
      config={staffRoleConfigs.accountant}
      endpoint='notifications'
      responseKey='notifications'
      title='Notifications'
      description='Finance alerts and updates from the firm.'
      icon={Bell}
    />
  );
}
