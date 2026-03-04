import { LayoutDashboard, FolderKanban, CalendarClock, DollarSign, AlertTriangle } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useLocation } from "react-router-dom";

const menuItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/" },
  { icon: FolderKanban, label: "Project Summary", path: "/projects" },
  { icon: CalendarClock, label: "Schedule", path: "/schedule" },
  { icon: DollarSign, label: "Cost Performance", path: "/cost" },
  { icon: AlertTriangle, label: "Risk Monitoring", path: "/risk" },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-56 min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-sidebar-border">
        <h1 className="font-display text-xl font-bold tracking-wider text-foreground">
          Pamitra
        </h1>
        <p className="text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground mt-0.5">
          EPC Oil and Gas
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.label}
              to={item.path}
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

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <p className="text-[10px] text-sidebar-foreground text-center">
          © 2026 PT Pamitra Jaya Konstruksi
        </p>
      </div>
    </aside>
  );
}
