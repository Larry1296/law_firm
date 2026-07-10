import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ROLE_DASHBOARD } from "@/core/config/redirects";
import useAuth from "@/core/hooks/useAuth";

const useRedirectByRole = () => {
  const { user, role, firmRole, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    let path = ROLE_DASHBOARD[role];

    // staff override
    if (role === "STAFF") {
      path = ROLE_DASHBOARD[firmRole];
    }

    if (path) {
      navigate(path, { replace: true });
    }
  }, [user, role, firmRole, isAuthenticated, navigate]);
};

export default useRedirectByRole;
