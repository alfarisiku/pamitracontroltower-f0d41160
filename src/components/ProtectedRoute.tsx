import { Navigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAccess, AccessLevel } from "@/contexts/AccessContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Level minimum yang dibutuhkan (1 = paling tinggi). Default 3 (publik). */
  minLevel?: AccessLevel;
  /** Rute detail proyek: cek apakah :id ada dalam scope user */
  requireProject?: boolean;
}

export function ProtectedRoute({ children, minLevel = 3, requireProject }: ProtectedRouteProps) {
  const { loading, user, profile } = useAuth();
  const { level, canView } = useAccess();
  const location = useLocation();
  const params = useParams();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Akun terdaftar tapi belum disetujui / dinonaktifkan
  if (user && profile && profile.status !== "active" && location.pathname !== "/pending") {
    return <Navigate to="/pending" replace />;
  }

  if (level > minLevel) {
    if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    return <Navigate to={level === 2 ? "/projects" : "/"} replace />;
  }

  if (requireProject && params.id && !canView(params.id)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 bg-background p-6 text-center">
        <h1 className="text-lg font-bold text-foreground">Proyek tidak tersedia</h1>
        <p className="text-sm text-muted-foreground">Anda tidak memiliki akses ke proyek ini. Hubungi administrator.</p>
      </div>
    );
  }

  return <>{children}</>;
}
