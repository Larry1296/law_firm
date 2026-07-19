import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ROLE_DASHBOARD } from "@/core/config/redirects";
import useAuth from "@/core/hooks/useAuth";
import { getEffectiveRole } from "@/core/utils/effectiveRole";

const useRedirectByRole = () => {
  const { user, role, firmRole, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const effectiveRole = getEffectiveRole(user, firmRole);
    const path = ROLE_DASHBOARD[effectiveRole];

    if (path) {
      navigate(path, { replace: true });
    }
  }, [user, role, firmRole, isAuthenticated, navigate]);
};

export default useRedirectByRole;
