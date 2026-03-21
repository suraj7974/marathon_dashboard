import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getStoredAuth, clearStoredAuth } from "../lib/auth";
import {
  SessionManager,
  checkSessionExpired,
  setSessionStartTime,
} from "../lib/session-timeout";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole:
    | "open"
    | "NprBastar"
    | "influencers"
    | "inventory"
    | "bulksales"
    | "reports"
    | "medals"
    | "5k10k";
}

export const ProtectedRoute = ({
  children,
  requiredRole,
}: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const storedRole = getStoredAuth();

  useEffect(() => {
    if (!storedRole || storedRole !== requiredRole) {
      navigate("/login");
      return;
    }

    if (checkSessionExpired()) {
      clearStoredAuth();
      navigate("/login");
      return;
    }

    setSessionStartTime();

    const sessionManager = new SessionManager(() => {
      navigate("/login");
    });

    return () => {
      sessionManager.cleanup();
    };
  }, [storedRole, requiredRole, navigate]);

  return storedRole === requiredRole ? <>{children}</> : null;
};
