import { Activity, Bell } from "lucide-react";

export function DashboardHeader() {
  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="flex items-center justify-between pb-6 border-b border-border/50 mb-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Activity className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground tracking-tight">PMO Dashboard</h1>
        </div>
        <p className="text-sm text-muted-foreground">Project Management Office — EPC Division • {today}</p>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full animate-pulse-glow" />
        </button>
        <div className="flex items-center gap-2 pl-3 border-l border-border/50">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
            PM
          </div>
          <span className="text-sm font-medium text-foreground hidden sm:block">Admin PMO</span>
        </div>
      </div>
    </header>
  );
}
