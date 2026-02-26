import { Activity, Bell } from "lucide-react";

export function DashboardHeader() {
  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="flex items-center justify-between pb-6 border-b border-border mb-6">
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">PMO Dashboard</h1>
            <p className="text-xs text-muted-foreground">Project Management Office — Divisi EPC</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground hidden md:block">{today}</span>
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors border border-border">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
        </button>
        <div className="flex items-center gap-2 pl-3 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
            PM
          </div>
          <span className="text-sm font-medium text-foreground hidden sm:block">Admin PMO</span>
        </div>
      </div>
    </header>
  );
}
