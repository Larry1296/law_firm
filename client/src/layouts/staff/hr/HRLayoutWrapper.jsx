import StaffRoleLayoutWrapper from '@/layouts/staff/common/StaffRoleLayoutWrapper';
import { staffRoleConfigs } from '@/modules/staff/common/config/staffRoleConfigs';

export default function HRLayoutWrapper() {
  return (
    <StaffRoleLayoutWrapper
      config={staffRoleConfigs.hr}
      themeRole='hr'
    />
  );
}
