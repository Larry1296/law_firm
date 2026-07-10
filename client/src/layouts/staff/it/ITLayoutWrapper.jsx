import StaffRoleLayoutWrapper from '@/layouts/staff/common/StaffRoleLayoutWrapper';
import { staffRoleConfigs } from '@/modules/staff/common/config/staffRoleConfigs';

export default function ITLayoutWrapper() {
  return (
    <StaffRoleLayoutWrapper
      config={staffRoleConfigs.it}
      themeRole='it'
    />
  );
}
