import { FileText } from 'lucide-react';

import StaffWorkspacePage from '@/modules/staff/common/pages/StaffWorkspacePage';
import { staffRoleConfigs } from '@/modules/staff/common/config/staffRoleConfigs';

export default function AccountantDocuments() {
  return (
    <StaffWorkspacePage
      config={staffRoleConfigs.accountant}
      endpoint='documents'
      responseKey='documents'
      title='Documents'
      description='Financial documents, payment records, and accounting files.'
      icon={FileText}
    />
  );
}
