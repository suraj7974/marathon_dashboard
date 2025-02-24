import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getStoredAuth } from "../lib/auth";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole: "payment" | "shirt" | "bib" | "govt";
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const storedRole = getStoredAuth();

  useEffect(() => {
    if (!storedRole || storedRole !== requiredRole) {
      navigate("/login");
    }
  }, [storedRole, requiredRole, navigate]);

  return storedRole === requiredRole ? <>{children}</> : null;
};
