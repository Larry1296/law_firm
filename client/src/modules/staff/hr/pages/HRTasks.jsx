import { ClipboardList } from 'lucide-react';

import StaffWorkspacePage from '@/modules/staff/common/pages/StaffWorkspacePage';
import { staffRoleConfigs } from '@/modules/staff/common/config/staffRoleConfigs';

export default function HRTasks() {
  return (
    <StaffWorkspacePage
      config={staffRoleConfigs.hr}
      endpoint='tasks'
      responseKey='tasks'
      title='Tasks'
      description='HR assignments, staff follow-ups, and pending actions.'
      icon={ClipboardList}
    />
  );
}
