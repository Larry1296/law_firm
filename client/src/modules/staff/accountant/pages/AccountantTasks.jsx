import { ClipboardList } from 'lucide-react';

import StaffWorkspacePage from '@/modules/staff/common/pages/StaffWorkspacePage';
import { staffRoleConfigs } from '@/modules/staff/common/config/staffRoleConfigs';

export default function AccountantTasks() {
  return (
    <StaffWorkspacePage
      config={staffRoleConfigs.accountant}
      endpoint='tasks'
      responseKey='tasks'
      title='Tasks'
      description='Daily finance assignments and pending accounting actions.'
      icon={ClipboardList}
    />
  );
}
