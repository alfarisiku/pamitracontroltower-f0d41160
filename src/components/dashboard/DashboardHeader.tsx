import { Bell, Building2 } from "lucide-react";

export function DashboardHeader() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("id-ID", {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  return (
    <header className="flex items-center justify-between pb-5 mb-5 border-b border-border">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center glow-primary">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            Pamitra Control Tower
          </h1>
          <p className="text-xs text-muted-foreground">
            Strategic Project Dashboard · PT Pamitra Jaya Konstruksi
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border">
          <span className="text-xs text-muted-foreground">{dateStr}</span>
          <span className="text-xs text-primary font-mono-data font-medium">{timeStr}</span>
        </div>
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors border border-border">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
        </button>
        <div className="flex items-center gap-2 pl-3 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold">
            AD
          </div>
          <div className="hidden sm:block">
            <p className="text-xs text-muted-foreground">Welcome</p>
            <p className="text-sm font-medium text-foreground">Mr. Aditya</p>
          </div>
        </div>
      </div>
    </header>
  );
}
