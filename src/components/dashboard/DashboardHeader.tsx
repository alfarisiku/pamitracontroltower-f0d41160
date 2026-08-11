import { NotificationDropdown } from "./NotificationDropdown";
import { LevelSwitcher } from "./LevelSwitcher";


export function DashboardHeader() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("id-ID", { weekday: "short", year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

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
        <NotificationDropdown />
      </div>

    </header>
  );
}
