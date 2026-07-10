import { Navigate } from "react-router-dom";
import useAuth from "@/core/hooks/useAuth";

const RoleRoute = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, firmRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const role = user?.role;

  const effectiveRole = role === "STAFF" ? firmRole : role;

  if (!allowedRoles.includes(effectiveRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default RoleRoute;
