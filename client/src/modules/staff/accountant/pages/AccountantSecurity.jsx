import StaffSecurityPage from '@/modules/staff/common/pages/StaffSecurityPage';
import { staffRoleConfigs } from '@/modules/staff/common/config/staffRoleConfigs';

export default function AccountantSecurity() {
  return <StaffSecurityPage config={staffRoleConfigs.accountant} />;
}
