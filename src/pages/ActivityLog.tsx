import { useMemo, useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useActivityLogs, useProjects } from "@/hooks/useProjects";
import { Search, X } from "lucide-react";

const RANGES: { key: string; label: string; days: number | null }[] = [
  { key: "all", label: "Semua", days: null },
  { key: "today", label: "Hari ini", days: 0 },
  { key: "7", label: "7 hari", days: 7 },
  { key: "30", label: "30 hari", days: 30 },
];

const isAccess = (a: string) => a === "view";

const ActivityLog = () => {
  const [limit, setLimit] = useState(300);
  const { data: logs = [], isLoading } = useActivityLogs(limit);
  const { data: projects = [] } = useProjects();

  const [tab, setTab] = useState<"change" | "access">("change");
  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("all");
  const [action, setAction] = useState("all");
  const [projectId, setProjectId] = useState("all");
  const [range, setRange] = useState("all");
  const [user, setUser] = useState("all");

  const tabLogs = useMemo(
    () => logs.filter((l) => (tab === "access" ? isAccess(l.action) : !isAccess(l.action))),
    [logs, tab]
  );
  const counts = useMemo(() => ({
    change: logs.filter((l) => !isAccess(l.action)).length,
    access: logs.filter((l) => isAccess(l.action)).length,
  }), [logs]);

  const nameOf = (l: any) => l.user_name || "Tamu";
  const users = useMemo(() => Array.from(new Set(tabLogs.map(nameOf))).sort(), [tabLogs]);
  const entities = useMemo(() => Array.from(new Set(tabLogs.map((l) => l.entity_type))).sort(), [tabLogs]);
  const actions = useMemo(() => Array.from(new Set(tabLogs.map((l) => l.action))).sort(), [tabLogs]);

  const filtered = useMemo(() => {
    const rangeDef = RANGES.find((r) => r.key === range);
    const q = search.toLowerCase();
    return tabLogs.filter((l) => {
      if (entity !== "all" && l.entity_type !== entity) return false;
      if (action !== "all" && l.action !== action) return false;
      if (projectId !== "all" && l.project_id !== projectId) return false;
      if (user !== "all" && nameOf(l) !== user) return false;
      if (rangeDef?.days != null) {
        const t = new Date(l.created_at);
        if (rangeDef.days === 0) { if (t.toDateString() !== new Date().toDateString()) return false; }
        else if (Date.now() - t.getTime() > rangeDef.days * 86400000) return false;
      }
      if (q) {
        const p = l.projects as any;
        const hay = `${l.entity_type} ${l.action} ${l.details ?? ""} ${nameOf(l)} ${p?.project_code ?? ""} ${p?.name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tabLogs, entity, action, projectId, range, search, user]);

  const exportCSV = () => {
    const head = ["Waktu", "Akun", "Aksi", "Bagian", "Proyek", "Detail"];
    const rows = filtered.map((l) => [
      new Date(l.created_at).toLocaleString("id-ID"),
      nameOf(l), l.action, l.entity_type,
      (l.projects as any)?.project_code ?? "",
      (l.details ?? "").replace(/[",\n]/g, " "),
    ]);
    const csv = [head, ...rows].map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `activity-log-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const activeFilters = [entity, action, projectId, range, user].filter((v) => v !== "all").length + (search ? 1 : 0);
  const resetFilters = () => { setSearch(""); setEntity("all"); setAction("all"); setProjectId("all"); setRange("all"); setUser("all"); };
  const switchTab = (t: "change" | "access") => { setTab(t); setEntity("all"); setAction("all"); };

  const selectCls = "px-2 py-1 text-xs bg-card border border-border rounded text-foreground";
  const actionCls = (a: string) =>
    a === "delete" ? "text-destructive" : a === "create" ? "text-success" : a === "view" ? "text-muted-foreground" : "text-primary";

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-3 sm:p-5 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <DashboardHeader />
          <h2 className="text-lg font-bold text-foreground mb-3">Activity Log</h2>

          <div className="flex border-b border-border mb-3">
            {([["change", "Perubahan"], ["access", "Akses Halaman"]] as const).map(([k, label]) => (
              <button key={k} onClick={() => switchTab(k)}
                className={`px-4 py-2 text-sm border-b-2 -mb-px ${tab === k ? "border-primary text-foreground font-semibold" : "border-transparent text-muted-foreground"}`}>
                {label} ({counts[k]})
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="relative min-w-[180px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari..."
                className="pl-7 pr-2 py-1 text-xs bg-card border border-border rounded text-foreground" />
            </div>
            <select value={user} onChange={(e) => setUser(e.target.value)} className={selectCls}>
              <option value="all">Semua Akun</option>
              {users.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            {tab === "change" && (
              <>
                <select value={action} onChange={(e) => setAction(e.target.value)} className={selectCls}>
                  <option value="all">Semua Aksi</option>
                  {actions.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <select value={entity} onChange={(e) => setEntity(e.target.value)} className={selectCls}>
                  <option value="all">Semua Bagian</option>
                  {entities.map((e) => <option key={e} value={e}>{e.replace(/_/g, " ")}</option>)}
                </select>
              </>
            )}
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={selectCls}>
              <option value="all">Semua Proyek</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.project_code} — {p.name}</option>)}
            </select>
            <select value={range} onChange={(e) => setRange(e.target.value)} className={selectCls}>
              {RANGES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
            {activeFilters > 0 && (
              <button onClick={resetFilters} className="flex items-center gap-1 px-2 py-1 text-xs border border-border rounded text-muted-foreground">
                <X className="h-3 w-3" /> Reset
              </button>
            )}
            <span className="text-xs text-muted-foreground ml-auto">{filtered.length} baris</span>
            <button onClick={exportCSV} className="px-2 py-1 text-xs border border-border rounded text-foreground">Export CSV</button>
          </div>

          <div className="border border-border rounded bg-card overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted text-muted-foreground">
                <tr className="text-left">
                  <th className="px-2 py-1.5 font-medium whitespace-nowrap">Waktu</th>
                  <th className="px-2 py-1.5 font-medium">Akun</th>
                  {tab === "change" && <th className="px-2 py-1.5 font-medium">Aksi</th>}
                  {tab === "change" && <th className="px-2 py-1.5 font-medium">Bagian</th>}
                  <th className="px-2 py-1.5 font-medium">Proyek</th>
                  <th className="px-2 py-1.5 font-medium">{tab === "access" ? "Halaman" : "Detail"}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="px-2 py-6 text-center text-muted-foreground">Memuat...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-2 py-6 text-center text-muted-foreground">Tidak ada data.</td></tr>
                ) : filtered.map((l) => (
                  <tr key={l.id} className="border-t border-border align-top">
                    <td className="px-2 py-1 font-mono-data whitespace-nowrap text-muted-foreground">
                      {new Date(l.created_at).toLocaleString("id-ID", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-foreground">{nameOf(l)}</td>
                    {tab === "change" && <td className={`px-2 py-1 whitespace-nowrap ${actionCls(l.action)}`}>{l.action.replace(/_/g, " ")}</td>}
                    {tab === "change" && <td className="px-2 py-1 whitespace-nowrap text-foreground">{l.entity_type.replace(/_/g, " ")}</td>}
                    <td className="px-2 py-1 whitespace-nowrap font-mono-data text-foreground">{(l.projects as any)?.project_code ?? "-"}</td>
                    <td className="px-2 py-1 text-foreground whitespace-pre-wrap break-words">{l.details ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {logs.length >= limit && (
            <button onClick={() => setLimit((n) => n + 300)} className="w-full py-2 mt-2 text-xs text-primary">
              Muat lebih banyak...
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default ActivityLog;
