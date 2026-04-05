import { Navigate } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirect to appropriate default page
    if (role === "client") return <Navigate to="/war-room" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
