import { Navigate } from "react-router-dom";
import useAuth from "@/core/hooks/useAuth";
import { getEffectiveRole } from "@/core/utils/effectiveRole";

const RoleRoute = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, firmRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const effectiveRole = getEffectiveRole(user, firmRole);

  if (!allowedRoles.includes(effectiveRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (effectiveRole === 'PROSPECT' && user?.client?.portal_access_allowed !== true) {
    return <p role="status">Portal access becomes available after conflict clearance and firm acceptance.</p>;
  }

  return children;
};

export default RoleRoute;
