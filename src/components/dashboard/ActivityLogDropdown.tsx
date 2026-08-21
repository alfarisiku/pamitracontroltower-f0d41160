import { useState, useRef, useEffect } from "react";
import { Activity, ExternalLink, X, Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { useActivityLogs } from "@/hooks/useProjects";
import { useNavigate } from "react-router-dom";

const actionConfig: Record<string, { icon: typeof Plus; className: string }> = {
  create: { icon: Plus, className: "text-success" },
  update: { icon: Pencil, className: "text-primary" },
  delete: { icon: Trash2, className: "text-destructive" },
  finalize: { icon: CheckCircle2, className: "text-success" },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins}m lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}j lalu`;
  return `${Math.floor(hrs / 24)}h lalu`;
}

export function ActivityLogDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { data: logs = [] } = useActivityLogs(20);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const todayCount = logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} title="Activity Log"
        className="relative p-2 rounded-lg hover:bg-muted transition-colors border border-border">
        <Activity className="h-4 w-4 text-muted-foreground" />
        {todayCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center px-1 bg-primary text-primary-foreground text-[9px] font-bold rounded-full">
            {todayCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-lg shadow-xl z-50 animate-fade-in">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Activity className="h-4 w-4 text-primary" /> Activity Log</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => { navigate("/activity-log"); setOpen(false); }}
                className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80">
                Lihat semua <ExternalLink className="h-3 w-3" />
              </button>
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-muted rounded">
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {logs.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-xs">Belum ada aktivitas</div>
            ) : (
              logs.map(l => {
                const cfg = actionConfig[l.action] || actionConfig.update;
                const Icon = cfg.icon;
                return (
                  <button key={l.id}
                    onClick={() => { if (l.project_id) { navigate(`/project/${l.project_id}`); setOpen(false); } }}
                    className="w-full text-left flex items-start gap-3 p-3 border-b border-border/30 hover:bg-muted/30 transition-colors">
                    <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${cfg.className}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground font-medium capitalize">{l.entity_type.replace(/_/g, " ")} · {l.action}</p>
                      {l.details && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 whitespace-pre-line">{l.details}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        {l.projects && <span className="text-[9px] font-mono-data text-primary">{l.projects.project_code} →</span>}
                        <span className="text-[9px] text-muted-foreground">{timeAgo(l.created_at)}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
