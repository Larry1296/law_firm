import StaffRoleLayoutWrapper from '@/layouts/staff/common/StaffRoleLayoutWrapper';
import { staffRoleConfigs } from '@/modules/staff/common/config/staffRoleConfigs';

export default function AccountantLayoutWrapper() {
  return (
    <StaffRoleLayoutWrapper
      config={staffRoleConfigs.accountant}
      themeRole='accountant'
    />
  );
}
