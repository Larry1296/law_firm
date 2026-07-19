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

  return children;
};

export default RoleRoute;
