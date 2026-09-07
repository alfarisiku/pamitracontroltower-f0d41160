import { useState, useRef, useEffect } from "react";
import { History, Plus, Pencil, Trash2, CheckCircle2, Activity as ActivityIcon } from "lucide-react";
import { useProjectActivityLogs } from "@/hooks/useProjects";

const actionConfig: Record<string, { icon: typeof Plus; className: string }> = {
  create: { icon: Plus, className: "text-success" },
  update: { icon: Pencil, className: "text-primary" },
  update_progress: { icon: Pencil, className: "text-primary" },
  delete: { icon: Trash2, className: "text-destructive" },
  finalize: { icon: CheckCircle2, className: "text-success" },
  approve: { icon: CheckCircle2, className: "text-success" },
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

export function ProjectActivityLog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: logs = [] } = useProjectActivityLogs(projectId, 30);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const last = logs[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 border border-border transition-colors"
      >
        <History className="h-3.5 w-3.5" />
        Activity Log
        {last && <span className="text-[10px] text-muted-foreground font-mono-data">· {timeAgo(last.created_at)}</span>}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[380px] max-h-[420px] overflow-y-auto glass-card rounded-lg shadow-card border border-border z-50">
          <div className="p-3 border-b border-border sticky top-0 bg-card/95 backdrop-blur">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <ActivityIcon className="h-3.5 w-3.5 text-primary" /> Aktivitas Proyek Ini
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {last ? `Update terakhir ${new Date(last.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}` : "Belum ada aktivitas"}
            </p>
          </div>
          {logs.length === 0 ? (
            <div className="p-6 text-center text-[11px] text-muted-foreground">Belum ada aktivitas tercatat.</div>
          ) : (
            <ul className="divide-y divide-border/40">
              {logs.map(l => {
                const cfg = actionConfig[l.action] ?? { icon: Pencil, className: "text-muted-foreground" };
                const Icon = cfg.icon;
                return (
                  <li key={l.id} className="p-2.5 flex items-start gap-2 hover:bg-muted/20 transition-colors">
                    <Icon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${cfg.className}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {l.entity_type.replace(/_/g, " ")} · {l.action}
                      </p>
                      {l.details && <p className="text-[11px] text-foreground">{l.details}</p>}
                    </div>
                    <span className="text-[10px] font-mono-data text-muted-foreground flex-shrink-0">{timeAgo(l.created_at)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
