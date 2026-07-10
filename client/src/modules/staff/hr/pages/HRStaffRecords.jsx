import { UsersRound } from 'lucide-react';

import StaffWorkspacePage from '@/modules/staff/common/pages/StaffWorkspacePage';
import { staffRoleConfigs } from '@/modules/staff/common/config/staffRoleConfigs';

export default function HRStaffRecords() {
  return (
    <StaffWorkspacePage
      config={staffRoleConfigs.hr}
      endpoint='staff-records'
      responseKey='staff_records'
      title='Staff Records'
      description='Employee records, HR follow-ups, and personnel documentation.'
      icon={UsersRound}
    />
  );
}
