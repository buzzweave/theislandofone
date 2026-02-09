import { Navigate } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import type { ReactNode } from "react";

export default function AdminGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAdminAuth();
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}
