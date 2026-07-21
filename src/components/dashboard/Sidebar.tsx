import { useState } from "react";
import { LayoutDashboard, FolderKanban, CalendarClock, DollarSign, AlertTriangle, Database, FileText, Menu, X, Monitor, Shield, Activity, Wallet, LogOut } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";


import { BookOpen } from "lucide-react";

const allMenuItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/", roles: ["admin", "management", "team", "client"] },
  { icon: FolderKanban, label: "Project Summary", path: "/projects", roles: ["admin", "management", "client"] },
  { icon: CalendarClock, label: "Schedule", path: "/schedule", roles: ["admin", "management", "team"] },
  { icon: DollarSign, label: "Cost Performance", path: "/cost", roles: ["admin", "management", "team"] },
  { icon: Wallet, label: "Finance", path: "/finance", roles: ["admin", "management", "team"] },
  { icon: AlertTriangle, label: "Risk Monitoring", path: "/risk", roles: ["admin", "management", "team"] },
  { icon: FileText, label: "Reporting", path: "/reporting", roles: ["admin", "management"] },
  { icon: Database, label: "Data Entry", path: "/data-entry", roles: ["admin", "team"] },
  { icon: Activity, label: "Activity Log", path: "/activity-log", roles: ["admin", "management", "team"] },
  { icon: BookOpen, label: "User Guide", path: "/guide", roles: ["admin", "management", "team"] },
  { icon: Monitor, label: "War Room", path: "/war-room", roles: ["admin"] },
  { icon: Shield, label: "Account Manager", path: "/account-manager", roles: ["admin"] },
];

export function Sidebar() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { role, profile, signOut } = useAuth();

  const menuItems = allMenuItems.filter(item => !role || item.roles.includes(role));

  const roleLabel = role === "team" ? "Project Admin" : role === "client" ? "Public" : role === "management" ? "Director" : role === "admin" ? "Administrator" : "";


  const sidebarContent = (
    <>
      <div className="p-5 border-b border-sidebar-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/images/pamitra-icon.jpg" alt="Pamitra" className="h-8 w-8 rounded-lg object-contain" />
          <div>
            <h1 className="font-display text-base font-bold tracking-wider text-primary">Dashboard CT</h1>
            <p className="text-[9px] uppercase tracking-[0.15em] text-sidebar-foreground">EPC Oil and Gas</p>
          </div>
        </div>
        {isMobile && (
          <button onClick={() => setMobileOpen(false)} className="p-1 hover:bg-sidebar-accent rounded">
            <X className="h-5 w-5 text-sidebar-foreground" />
          </button>
        )}
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path === "/projects" && location.pathname.startsWith("/project/"));
          return (
            <NavLink
              key={item.label}
              to={item.path}
              onClick={() => isMobile && setMobileOpen(false)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border space-y-2">
        <div className="px-3 py-2 rounded-lg bg-sidebar-accent/50">
          <p className="text-xs font-medium text-sidebar-accent-foreground truncate">{profile?.display_name || "User"}</p>
          <p className="text-[10px] text-sidebar-foreground">{roleLabel}</p>
        </div>
        <button
          onClick={() => signOut()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground border border-sidebar-border/60 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" /> Logout
        </button>
        <p className="text-[10px] text-sidebar-foreground text-center pt-1">© 2026 PT Pamitra Jaya Konstruksi</p>
      </div>
    </>
  );


  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-3 left-3 z-50 p-2 bg-card border border-border rounded-lg shadow-md"
        >
          <Menu className="h-5 w-5 text-foreground" />
        </button>
        {mobileOpen && (
          <>
            <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-40" onClick={() => setMobileOpen(false)} />
            <aside className="fixed left-0 top-0 w-64 min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col z-50 animate-slide-up">
              {sidebarContent}
            </aside>
          </>
        )}
      </>
    );
  }

  return (
    <aside className="w-56 min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col flex-shrink-0">
      {sidebarContent}
    </aside>
  );
}
