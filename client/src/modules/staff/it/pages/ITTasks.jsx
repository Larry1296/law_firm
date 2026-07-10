import { ClipboardList } from 'lucide-react';

import StaffWorkspacePage from '@/modules/staff/common/pages/StaffWorkspacePage';
import { staffRoleConfigs } from '@/modules/staff/common/config/staffRoleConfigs';

export default function ITTasks() {
  return (
    <StaffWorkspacePage
      config={staffRoleConfigs.it}
      endpoint='tasks'
      responseKey='tasks'
      title='Tasks'
      description='Technical tasks, support requests, and pending actions.'
      icon={ClipboardList}
    />
  );
}
