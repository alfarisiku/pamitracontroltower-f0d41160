import { useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useActivityLogs } from "@/hooks/useProjects";
import { Activity, Database, AlertTriangle, FileText, Camera, TrendingUp, Package, Clock } from "lucide-react";

const entityIcons: Record<string, typeof Activity> = {
  project: Database,
  risk: AlertTriangle,
  addendum: FileText,
  photo: Camera,
  s_curve: TrendingUp,
  procurement: Package,
  work_item: Activity,
};

const actionColors: Record<string, string> = {
  create: "bg-success/15 text-success border-success/30",
  update: "bg-primary/15 text-primary border-primary/30",
  delete: "bg-destructive/15 text-destructive border-destructive/30",
  resolve: "bg-warning/15 text-warning border-warning/30",
  update_progress: "bg-primary/15 text-primary border-primary/30",
  approve: "bg-success/15 text-success border-success/30",
};

const ActivityLog = () => {
  const [limit, setLimit] = useState(50);
  const { data: logs = [], isLoading } = useActivityLogs(limit);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-3 sm:p-5 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <DashboardHeader />
          <div className="mb-5">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Activity Log
            </h2>
            <p className="text-xs text-muted-foreground">Semua aktivitas dashboard tercatat disini</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="glass-card rounded-lg p-8 text-center shadow-card">
              <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Belum ada aktivitas tercatat.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map(log => {
                const Icon = entityIcons[log.entity_type] || Activity;
                const colorCls = actionColors[log.action] || "bg-muted text-muted-foreground border-border";
                const time = new Date(log.created_at);
                return (
                  <div key={log.id} className="glass-card rounded-lg shadow-card p-3 flex items-start gap-3 hover:bg-muted/20 transition-colors">
                    <div className={`p-1.5 rounded-lg border ${colorCls} flex-shrink-0`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${colorCls}`}>{log.action}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{log.entity_type}</span>
                        {log.projects && (
                          <span className="text-[10px] font-mono-data text-primary">{(log.projects as any).project_code}</span>
                        )}
                      </div>
                      {log.details && <p className="text-xs text-foreground mt-0.5">{log.details}</p>}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-[10px] font-mono-data text-muted-foreground flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {time.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                      </p>
                      <p className="text-[9px] font-mono-data text-muted-foreground">
                        {time.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
              {logs.length >= limit && (
                <button onClick={() => setLimit(l => l + 50)}
                  className="w-full py-2 text-xs text-primary hover:bg-muted/50 rounded-lg transition-colors">
                  Load More...
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ActivityLog;
