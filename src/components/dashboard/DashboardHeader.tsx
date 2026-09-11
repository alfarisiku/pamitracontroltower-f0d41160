import { Link, useNavigate } from "react-router-dom";
import { LogIn, LogOut, User } from "lucide-react";
import { ActivityLogDropdown } from "./ActivityLogDropdown";
import { LevelSwitcher } from "./LevelSwitcher";
import { useAuth } from "@/contexts/AuthContext";


export function DashboardHeader() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("id-ID", { weekday: "short", year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const { user, profile, role, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between pb-5 mb-5 border-b border-border">
      <div className="flex items-center gap-3">
        <img src="/images/pamitra-icon.jpg" alt="Pamitra" className="w-9 h-9 rounded-lg object-contain" />
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Dashboard Control Tower</h1>
          <p className="text-xs text-muted-foreground">PT Pamitra Jaya Konstruksi</p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-wrap justify-end">

        <LevelSwitcher />
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border">
          <span className="text-xs text-muted-foreground">{dateStr}</span>
          <span className="text-xs text-primary font-mono-data font-medium">{timeStr}</span>
        </div>
        <ActivityLogDropdown />
        {user ? (
          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-muted border border-border text-xs text-foreground">
              <User className="h-3.5 w-3.5 text-primary" />
              {profile?.display_name ?? user.email}
              {role && <span className="text-[10px] text-muted-foreground uppercase">· {role}</span>}
            </span>
            <button
              onClick={async () => { await signOut(); navigate("/"); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border bg-card text-foreground hover:bg-muted"
            >
              <LogOut className="h-3.5 w-3.5" /> Keluar
            </button>
          </div>
        ) : (
          <Link to="/login" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90">
            <LogIn className="h-3.5 w-3.5" /> Masuk
          </Link>
        )}
      </div>

    </header>
  );
}
