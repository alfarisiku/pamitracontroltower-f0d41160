import { useAlerts } from "@/hooks/useProjects";
import { AlertTriangle, AlertCircle, Info, ChevronRight } from "lucide-react";

const severityConfig = {
  critical: { label: "Critical", className: "bg-destructive text-destructive-foreground", icon: AlertCircle },
  high: { label: "High", className: "bg-warning text-warning-foreground", icon: AlertTriangle },
  medium: { label: "Medium", className: "bg-info text-info-foreground", icon: Info },
  low: { label: "Low", className: "bg-muted text-muted-foreground", icon: Info },
};

export function AlertsPanel() {
  const { data: alerts = [], isLoading } = useAlerts();

  return (
    <div className="glass-card rounded-lg p-4 animate-slide-up shadow-card h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Top Priority Alerts</h3>
        <span className="text-xs font-mono-data text-destructive">{alerts.length}</span>
      </div>

      {isLoading ? (
        <div className="space-y-3 flex-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted/50 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2.5 flex-1 overflow-y-auto">
          {alerts.slice(0, 5).map((alert) => {
            const config = severityConfig[alert.severity];
            const IconComp = config.icon;
            return (
              <div key={alert.id} className="p-2.5 rounded-md bg-muted/30 border border-border/50 hover:border-border transition-colors">
                <div className="flex items-start gap-2">
                  <IconComp className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${
                    alert.severity === "critical" ? "text-destructive" :
                    alert.severity === "high" ? "text-warning" : "text-info"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-foreground truncate">{alert.title}</p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${config.className}`}>
                        {config.label}
                      </span>
                    </div>
                    {alert.description && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{alert.description}</p>
                    )}
                    {alert.projects && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {alert.projects.project_code} · {alert.projects.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button className="flex items-center justify-center gap-1 text-xs text-primary hover:text-primary/80 mt-3 pt-2 border-t border-border transition-colors">
        All Alerts <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
}
