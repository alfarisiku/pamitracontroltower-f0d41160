import type { AppRole } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

// Access levels have been removed. Every route is open to all visitors.
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  return <>{children}</>;
}
