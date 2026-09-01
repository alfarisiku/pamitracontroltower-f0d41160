import { useMemo, useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useActivityLogs, useProjects } from "@/hooks/useProjects";
import { Activity, Database, AlertTriangle, FileText, Camera, TrendingUp, Package, Clock, Search, X } from "lucide-react";

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

const RANGES: { key: string; label: string; days: number | null }[] = [
  { key: "all", label: "Semua", days: null },
  { key: "today", label: "Hari ini", days: 0 },
  { key: "7", label: "7 hari", days: 7 },
  { key: "30", label: "30 hari", days: 30 },
];

const ActivityLog = () => {
  const [limit, setLimit] = useState(50);
  const { data: logs = [], isLoading } = useActivityLogs(limit);
  const { data: projects = [] } = useProjects();

  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("all");
  const [action, setAction] = useState("all");
  const [projectId, setProjectId] = useState("all");
  const [range, setRange] = useState("all");

  const entities = useMemo(
    () => Array.from(new Set(logs.map((l) => l.entity_type))).sort(),
    [logs]
  );
  const actions = useMemo(
    () => Array.from(new Set(logs.map((l) => l.action))).sort(),
    [logs]
  );

  const filtered = useMemo(() => {
    const rangeDef = RANGES.find((r) => r.key === range);
    return logs.filter((l) => {
      if (entity !== "all" && l.entity_type !== entity) return false;
      if (action !== "all" && l.action !== action) return false;
      if (projectId !== "all" && l.project_id !== projectId) return false;
      if (rangeDef?.days !== null && rangeDef?.days !== undefined) {
        const t = new Date(l.created_at);
        if (rangeDef.days === 0) {
          if (t.toDateString() !== new Date().toDateString()) return false;
        } else if (Date.now() - t.getTime() > rangeDef.days * 86400000) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const hay = `${l.entity_type} ${l.action} ${l.details ?? ""} ${(l.projects as any)?.project_code ?? ""} ${(l.projects as any)?.name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, entity, action, projectId, range, search]);

  const activeFilters = [entity, action, projectId, range].filter((v) => v !== "all").length + (search ? 1 : 0);
  const resetFilters = () => {
    setSearch(""); setEntity("all"); setAction("all"); setProjectId("all"); setRange("all");
  };

  const selectCls =
    "appearance-none px-2.5 py-1.5 text-[11px] bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer";

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-3 sm:p-5 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <DashboardHeader />
          <div className="mb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Activity Log
            </h2>
            <p className="text-xs text-muted-foreground">Semua aktivitas dashboard tercatat disini</p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari detail, entitas, proyek..."
                className="w-full pl-8 pr-3 py-1.5 text-[11px] bg-card border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <select value={entity} onChange={(e) => setEntity(e.target.value)} className={selectCls}>
              <option value="all">Semua Entitas</option>
              {entities.map((e) => <option key={e} value={e}>{e.replace(/_/g, " ")}</option>)}
            </select>
            <select value={action} onChange={(e) => setAction(e.target.value)} className={selectCls}>
              <option value="all">Semua Aksi</option>
              {actions.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={selectCls}>
              <option value="all">Semua Proyek</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.project_code} — {p.name}</option>)}
            </select>
            <div className="flex items-center gap-1 bg-card border border-border rounded-md p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={`px-2 py-1 text-[10px] rounded transition-colors ${range === r.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {activeFilters > 0 && (
              <button onClick={resetFilters} className="flex items-center gap-1 px-2 py-1.5 text-[10px] text-muted-foreground border border-border rounded-md hover:bg-muted transition-colors">
                <X className="h-3 w-3" /> Reset ({activeFilters})
              </button>
            )}
            <span className="text-[11px] text-muted-foreground ml-auto">{filtered.length} aktivitas</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-card rounded-lg p-8 text-center shadow-card">
              <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Tidak ada aktivitas yang cocok dengan filter.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map(log => {
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
