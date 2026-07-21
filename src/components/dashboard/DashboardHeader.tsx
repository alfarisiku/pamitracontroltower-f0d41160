import { NotificationDropdown } from "./NotificationDropdown";
import { useAuth } from "@/contexts/AuthContext";
import { LogIn, LogOut } from "lucide-react";
import { Link } from "react-router-dom";

const roleLabels: Record<string, string> = {
  admin: "Administrator",
  management: "Director",
  team: "Project Admin",
  client: "Public",
};

export function DashboardHeader() {
  const { user, profile, role, signOut } = useAuth();
  const now = new Date();
  const dateStr = now.toLocaleDateString("id-ID", { weekday: "short", year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  const displayName = user ? (profile?.display_name || "User") : "Guest";
  const initials = displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <header className="flex items-center justify-between pb-5 mb-5 border-b border-border">
      <div className="flex items-center gap-3">
        <img src="/images/pamitra-icon.jpg" alt="Pamitra" className="w-9 h-9 rounded-lg object-contain" />
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Dashboard Control Tower</h1>
          <p className="text-xs text-muted-foreground">
            {role ? roleLabels[role] : "Dashboard"} · PT Pamitra Jaya Konstruksi
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border">
          <span className="text-xs text-muted-foreground">{dateStr}</span>
          <span className="text-xs text-primary font-mono-data font-medium">{timeStr}</span>
        </div>
        {user && <NotificationDropdown />}
        <div className="flex items-center gap-2 pl-3 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold">
            {initials}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs text-muted-foreground">{role ? roleLabels[role] : "Welcome"}</p>
            <p className="text-sm font-medium text-foreground">{displayName}</p>
          </div>
          {user ? (
            <button onClick={signOut}
              className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </button>
          ) : (
            <Link to="/login"
              className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors">
              <LogIn className="h-3.5 w-3.5" /> Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
