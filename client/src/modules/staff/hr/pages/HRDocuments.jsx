import { FileText } from 'lucide-react';

import StaffWorkspacePage from '@/modules/staff/common/pages/StaffWorkspacePage';
import { staffRoleConfigs } from '@/modules/staff/common/config/staffRoleConfigs';

export default function HRDocuments() {
  return (
    <StaffWorkspacePage
      config={staffRoleConfigs.hr}
      endpoint='documents'
      responseKey='documents'
      title='Documents'
      description='HR files, staff notices, contracts, and internal records.'
      icon={FileText}
    />
  );
}
