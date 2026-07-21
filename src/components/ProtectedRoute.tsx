import { Navigate } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { FolderKanban, LogOut } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading, isPending, hasNoProject, signOut } = useAuth();

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

  // Public access: unauthenticated visitors are treated as "client" (Level 3 Public).
  // They can access routes that allow "client" role; restricted routes redirect them home.
  if (!user) {
    if (allowedRoles && !allowedRoles.includes("client")) {
      return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
  }

  if (isPending) return <Navigate to="/pending" replace />;

  // Team user with no project assigned
  if (hasNoProject) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-lg text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-accent/15 flex items-center justify-center mx-auto">
            <FolderKanban className="h-10 w-10 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Belum Ada Proyek</h1>
          <p className="text-muted-foreground leading-relaxed">
            Akun Anda telah disetujui, namun belum ada proyek yang di-assign.
            Silakan hubungi administrator untuk mendapatkan akses proyek.
          </p>
          <div className="bg-muted/50 border border-border rounded-lg p-4 text-sm text-muted-foreground">
            <p>No project assigned. Please contact admin.</p>
          </div>
          <button onClick={signOut}
            className="inline-flex items-center gap-2 px-6 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </div>
    );
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    if (role === "client") return <Navigate to="/" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
