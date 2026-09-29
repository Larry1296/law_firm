import StaffRoleLayoutWrapper from '@/layouts/staff/common/StaffRoleLayoutWrapper';
import { platformLayoutConfig } from '@/modules/platform/layout/platformLayoutConfig';

export default function PlatformLayoutWrapper() {
  return <StaffRoleLayoutWrapper config={platformLayoutConfig} themeRole='platform' />;
}
