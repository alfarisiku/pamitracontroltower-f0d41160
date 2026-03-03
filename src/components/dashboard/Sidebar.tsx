import { LayoutDashboard, FolderKanban, CalendarClock, DollarSign, AlertTriangle } from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "Overview", active: true },
  { icon: FolderKanban, label: "Project Summary", active: false },
  { icon: CalendarClock, label: "Schedule", active: false },
  { icon: DollarSign, label: "Cost Performance", active: false },
  { icon: AlertTriangle, label: "Risk Monitoring", active: false },
];

export function Sidebar() {
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
        {menuItems.map((item) => (
          <button
            key={item.label}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
              item.active
                ? "bg-sidebar-accent text-sidebar-primary font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
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
