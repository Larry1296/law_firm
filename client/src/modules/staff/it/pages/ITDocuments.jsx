import { FileText } from 'lucide-react';

import StaffWorkspacePage from '@/modules/staff/common/pages/StaffWorkspacePage';
import { staffRoleConfigs } from '@/modules/staff/common/config/staffRoleConfigs';

export default function ITDocuments() {
  return (
    <StaffWorkspacePage
      config={staffRoleConfigs.it}
      endpoint='documents'
      responseKey='documents'
      title='Documents'
      description='Technical guides, system notes, and support documentation.'
      icon={FileText}
    />
  );
}
