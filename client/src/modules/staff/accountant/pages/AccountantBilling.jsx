import { ReceiptText } from 'lucide-react';

import StaffWorkspacePage from '@/modules/staff/common/pages/StaffWorkspacePage';
import { staffRoleConfigs } from '@/modules/staff/common/config/staffRoleConfigs';

export default function AccountantBilling() {
  return (
    <StaffWorkspacePage
      config={staffRoleConfigs.accountant}
      endpoint='billing'
      responseKey='billing'
      title='Billing'
      description='Invoices, payments, and finance work assigned to you.'
      icon={ReceiptText}
    />
  );
}
