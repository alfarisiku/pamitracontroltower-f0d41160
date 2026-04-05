import { useState, useEffect } from "react";
import { useProjects, useAlerts } from "@/hooks/useProjects";
import { formatRupiah } from "@/lib/supabase";
import { Activity, AlertTriangle, CheckCircle2, Clock, TrendingUp, Briefcase, DollarSign, MapPin } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const WarRoom = () => {
  const { data: projects = [], isLoading } = useProjects();
  const { data: alerts = [] } = useAlerts();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-foreground flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const active = projects.filter(p => p.status !== "completed");
  const atRisk = projects.filter(p => p.status === "at-risk" || p.status === "delayed");
  const completed = projects.filter(p => p.status === "completed");
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalSpent = projects.reduce((s, p) => s + p.spent, 0);
  const avgProgress = projects.length > 0 ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0;
  const criticalAlerts = alerts.filter(a => a.severity === "critical" || a.severity === "high");

  const statusColors: Record<string, string> = {
    "on-track": "bg-success", "at-risk": "bg-accent", "delayed": "bg-destructive", "completed": "bg-primary",
  };
  const statusLabels: Record<string, string> = {
    "on-track": "On Track", "at-risk": "At Risk", "delayed": "Delayed", "completed": "Completed",
  };

  return (
    <div className="min-h-screen text-white" style={{ background: "hsl(220, 25%, 10%)" }}>
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-4 border-b" style={{ borderColor: "hsl(220, 20%, 18%)" }}>
        <div className="flex items-center gap-4">
          <img src="/images/pamitra-icon.jpg" alt="Pamitra" className="h-8 rounded" />
          <div>
            <h1 className="text-lg font-bold tracking-tight">Pamitra Control Tower</h1>
            <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "hsl(215, 80%, 65%)" }}>War Room Display</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-2xl font-mono font-bold" style={{ color: "hsl(215, 80%, 65%)" }}>
              {time.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
            <p className="text-[10px]" style={{ color: "hsl(215, 15%, 50%)" }}>
              {time.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="px-3 py-1 rounded-full text-[10px] font-medium" style={{ background: "hsl(215, 80%, 65%, 0.15)", color: "hsl(215, 80%, 65%)" }}>
            Public View
          </div>
        </div>
      </header>

      <div className="p-6 space-y-5">
        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Projects", value: projects.length, icon: Briefcase, accent: "hsl(215, 80%, 55%)" },
            { label: "Active", value: active.length, icon: Activity, accent: "hsl(152, 55%, 45%)" },
            { label: "At Risk / Delayed", value: atRisk.length, icon: AlertTriangle, accent: "hsl(0, 72%, 55%)" },
            { label: "Completed", value: completed.length, icon: CheckCircle2, accent: "hsl(215, 80%, 55%)" },
            { label: "Avg Progress", value: `${avgProgress}%`, icon: TrendingUp, accent: "hsl(30, 85%, 55%)" },
            { label: "Contract Value", value: formatRupiah(totalBudget), icon: DollarSign, accent: "hsl(152, 55%, 45%)" },
          ].map((kpi, i) => (
            <div key={i} className="rounded-xl p-4 border" style={{ background: "hsl(220, 20%, 13%)", borderColor: "hsl(220, 20%, 20%)" }}>
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className="h-4 w-4" style={{ color: kpi.accent }} />
                <span className="text-[10px] uppercase tracking-wider" style={{ color: "hsl(215, 15%, 50%)" }}>{kpi.label}</span>
              </div>
              <p className="text-2xl font-bold font-mono-data" style={{ color: kpi.accent }}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Project Cards */}
        <div>
          <h2 className="text-xs uppercase tracking-wider mb-3 font-semibold" style={{ color: "hsl(215, 15%, 50%)" }}>Active Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {active.map(p => {
              const budgetPct = p.budget > 0 ? Math.round((p.spent / p.budget) * 100) : 0;
              const endDate = new Date(p.end_date);
              const daysLeft = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <div key={p.id} className="rounded-xl p-4 border transition-all hover:border-primary/40" style={{ background: "hsl(220, 20%, 13%)", borderColor: "hsl(220, 20%, 20%)" }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono-data" style={{ color: "hsl(215, 80%, 65%)" }}>{p.project_code}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium text-white ${statusColors[p.status]}`}>
                          {statusLabels[p.status]}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-white leading-snug">{p.name}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold font-mono-data" style={{ color: p.progress >= 80 ? "hsl(152, 55%, 45%)" : p.progress >= 50 ? "hsl(30, 85%, 55%)" : "hsl(215, 80%, 65%)" }}>
                        {p.progress}%
                      </p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "hsl(220, 20%, 20%)" }}>
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${p.progress}%`,
                        background: p.progress >= 80 ? "hsl(152, 55%, 45%)" : p.progress >= 50 ? "hsl(30, 85%, 55%)" : "hsl(215, 80%, 55%)",
                      }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px]" style={{ color: "hsl(215, 15%, 50%)" }}>
                    <div>
                      <p className="uppercase tracking-wider mb-0.5">Budget</p>
                      <p className="text-xs text-white font-mono-data">{budgetPct}%</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wider mb-0.5">Phase</p>
                      <p className="text-xs text-white">{p.phase}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-wider mb-0.5">Days Left</p>
                      <p className={`text-xs font-mono-data ${daysLeft < 30 ? "text-red-400" : "text-white"}`}>{daysLeft > 0 ? daysLeft : "Overdue"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: "hsl(220, 20%, 20%)" }}>
                    <MapPin className="h-3 w-3" style={{ color: "hsl(215, 15%, 45%)" }} />
                    <span className="text-[10px]" style={{ color: "hsl(215, 15%, 45%)" }}>{p.location}</span>
                    <span className="ml-auto text-[10px]" style={{ color: "hsl(215, 15%, 45%)" }}>{p.manager}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom: Alerts + Completed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-xl p-4 border" style={{ background: "hsl(220, 20%, 13%)", borderColor: "hsl(220, 20%, 20%)" }}>
            <h3 className="text-xs uppercase tracking-wider font-semibold mb-3 flex items-center gap-2" style={{ color: "hsl(0, 72%, 60%)" }}>
              <AlertTriangle className="h-4 w-4" /> Critical Alerts ({criticalAlerts.length})
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {criticalAlerts.length === 0 ? (
                <p className="text-xs" style={{ color: "hsl(215, 15%, 45%)" }}>No critical alerts</p>
              ) : criticalAlerts.slice(0, 8).map(a => (
                <div key={a.id} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: "hsl(220, 20%, 16%)" }}>
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: a.severity === "critical" ? "hsl(0, 72%, 60%)" : "hsl(30, 85%, 55%)" }} />
                  <div className="min-w-0">
                    <p className="text-xs text-white font-medium truncate">{a.title}</p>
                    <p className="text-[10px]" style={{ color: "hsl(215, 15%, 45%)" }}>{a.projects?.name || "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-4 border" style={{ background: "hsl(220, 20%, 13%)", borderColor: "hsl(220, 20%, 20%)" }}>
            <h3 className="text-xs uppercase tracking-wider font-semibold mb-3 flex items-center gap-2" style={{ color: "hsl(152, 55%, 45%)" }}>
              <CheckCircle2 className="h-4 w-4" /> Completed Projects ({completed.length})
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {completed.length === 0 ? (
                <p className="text-xs" style={{ color: "hsl(215, 15%, 45%)" }}>No completed projects</p>
              ) : completed.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: "hsl(220, 20%, 16%)" }}>
                  <div>
                    <p className="text-xs text-white font-medium">{p.project_code} — {p.name}</p>
                    <p className="text-[10px]" style={{ color: "hsl(215, 15%, 45%)" }}>{p.client}</p>
                  </div>
                  <span className="text-xs font-mono-data" style={{ color: "hsl(152, 55%, 45%)" }}>100%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-8 py-3 border-t text-center" style={{ borderColor: "hsl(220, 20%, 18%)" }}>
        <p className="text-[10px]" style={{ color: "hsl(215, 15%, 40%)" }}>
          PT Pamitra Jaya Konstruksi — EPC Oil and Gas — Pamitra Control Tower v2.0
        </p>
      </footer>
    </div>
  );
};

export default WarRoom;
