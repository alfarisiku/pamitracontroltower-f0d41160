import { useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useProjects, useAlerts } from "@/hooks/useProjects";
import { formatRupiah } from "@/lib/supabase";
import { AlertCircle, AlertTriangle, Info, CheckCircle2, Shield, ChevronDown, Share2, TrendingDown, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Severity = "critical" | "high" | "medium" | "low";

const severityConfig: Record<Severity, { label: string; icon: typeof AlertCircle; color: string; bgColor: string; borderColor: string }> = {
  critical: { label: "Critical", icon: AlertCircle, color: "text-destructive", bgColor: "bg-destructive/15", borderColor: "border-destructive/30" },
  high: { label: "High", icon: AlertTriangle, color: "text-warning", bgColor: "bg-warning/15", borderColor: "border-warning/30" },
  medium: { label: "Medium", icon: Info, color: "text-info", bgColor: "bg-info/15", borderColor: "border-info/30" },
  low: { label: "Low", icon: Info, color: "text-muted-foreground", bgColor: "bg-muted/30", borderColor: "border-border" },
};

const probImpactLevels = ["low", "medium", "high", "very-high"];
const matrixColors: Record<string, string> = {
  "0-0": "bg-success/20", "0-1": "bg-success/20", "0-2": "bg-warning/20", "0-3": "bg-warning/20",
  "1-0": "bg-success/20", "1-1": "bg-warning/20", "1-2": "bg-warning/20", "1-3": "bg-destructive/20",
  "2-0": "bg-warning/20", "2-1": "bg-warning/20", "2-2": "bg-destructive/20", "2-3": "bg-destructive/20",
  "3-0": "bg-warning/20", "3-1": "bg-destructive/20", "3-2": "bg-destructive/20", "3-3": "bg-destructive/30",
};

const RiskMonitoring = () => {
  const navigate = useNavigate();
  const { data: projects = [], isLoading: lp } = useProjects();
  const { data: alerts = [], isLoading: la } = useAlerts();
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");

  if (lp || la) {
    return <div className="flex min-h-screen"><Sidebar /><div className="flex-1 flex items-center justify-center"><div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div></div>;
  }

  const filteredAlerts = severityFilter === "all" ? alerts : alerts.filter(a => a.severity === severityFilter);
  const counts = { critical: alerts.filter(a => a.severity === "critical").length, high: alerts.filter(a => a.severity === "high").length, medium: alerts.filter(a => a.severity === "medium").length, low: alerts.filter(a => a.severity === "low").length };

  // Critical Issues Overview
  const delayedProjects = projects.filter(p => p.status === "delayed");
  const overBudgetProjects = projects.filter(p => p.spent / p.budget > 0.9);
  const atRiskProjects = projects.filter(p => p.status === "at-risk" || p.status === "delayed");

  // Risk Matrix data
  const matrixData: Record<string, typeof alerts> = {};
  alerts.forEach(a => {
    const pi = probImpactLevels.indexOf(a.probability || "medium");
    const ii = probImpactLevels.indexOf(a.impact || "medium");
    const key = `${Math.max(0, pi)}-${Math.max(0, ii)}`;
    if (!matrixData[key]) matrixData[key] = [];
    matrixData[key].push(a);
  });

  const handleShare = async () => {
    if (navigator.share) await navigator.share({ title: "Risk Monitoring", url: window.location.href });
    else { await navigator.clipboard.writeText(window.location.href); alert("Link copied!"); }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-3 sm:p-5 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <DashboardHeader />

          <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-bold text-foreground">Risk Monitoring</h2>
              <p className="text-xs text-muted-foreground">Manajemen risiko dan peringatan proyek EPC</p>
            </div>
            <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 border border-border"><Share2 className="h-3.5 w-3.5" /> Share</button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {(["critical", "high", "medium", "low"] as Severity[]).map(sev => {
              const cfg = severityConfig[sev];
              const Icon = cfg.icon;
              return (
                <div key={sev} className={`glass-card rounded-lg p-3 shadow-card border ${cfg.borderColor} cursor-pointer hover:shadow-card-hover transition-all`} onClick={() => setSeverityFilter(sev)}>
                  <div className="flex items-center gap-2 mb-1"><div className={`p-1.5 rounded-lg ${cfg.bgColor}`}><Icon className={`h-4 w-4 ${cfg.color}`} /></div><span className="text-[10px] uppercase tracking-wider text-muted-foreground">{cfg.label}</span></div>
                  <p className={`text-2xl font-bold font-mono-data ${cfg.color}`}>{counts[sev]}</p>
                </div>
              );
            })}
          </div>

          {/* Critical Issues Overview */}
          <div className="glass-card rounded-lg shadow-card p-4 mb-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Shield className="h-4 w-4 text-destructive" /> Critical Issues Overview</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-destructive/10 rounded-lg p-3 border border-destructive/20">
                <div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-destructive" /><span className="text-[10px] uppercase text-muted-foreground">Delays</span></div>
                <p className="text-xl font-bold font-mono-data text-destructive">{delayedProjects.length}</p>
                <div className="mt-1 space-y-0.5">{delayedProjects.slice(0, 3).map(p => <p key={p.id} className="text-[10px] text-muted-foreground truncate cursor-pointer hover:text-primary" onClick={() => navigate(`/project/${p.id}`)}>{p.project_code} · {p.name}</p>)}</div>
              </div>
              <div className="bg-warning/10 rounded-lg p-3 border border-warning/20">
                <div className="flex items-center gap-2 mb-1"><TrendingDown className="h-4 w-4 text-warning" /><span className="text-[10px] uppercase text-muted-foreground">Budget Overruns</span></div>
                <p className="text-xl font-bold font-mono-data text-warning">{overBudgetProjects.length}</p>
                <div className="mt-1 space-y-0.5">{overBudgetProjects.slice(0, 3).map(p => <p key={p.id} className="text-[10px] text-muted-foreground truncate cursor-pointer hover:text-primary" onClick={() => navigate(`/project/${p.id}`)}>{p.project_code} · {Math.round(p.spent/p.budget*100)}%</p>)}</div>
              </div>
              <div className="bg-destructive/10 rounded-lg p-3 border border-destructive/20">
                <div className="flex items-center gap-2 mb-1"><AlertCircle className="h-4 w-4 text-destructive" /><span className="text-[10px] uppercase text-muted-foreground">Critical Issues</span></div>
                <p className="text-xl font-bold font-mono-data text-destructive">{counts.critical}</p>
              </div>
              <div className="bg-warning/10 rounded-lg p-3 border border-warning/20">
                <div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-4 w-4 text-warning" /><span className="text-[10px] uppercase text-muted-foreground">High Risks</span></div>
                <p className="text-xl font-bold font-mono-data text-warning">{counts.high}</p>
              </div>
            </div>
            {atRiskProjects.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Projects Needing Acceleration</p>
                <div className="flex flex-wrap gap-2">
                  {atRiskProjects.map(p => (
                    <button key={p.id} onClick={() => navigate(`/project/${p.id}`)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 text-xs transition-colors">
                      <div className={`w-2 h-2 rounded-full ${p.status === "delayed" ? "bg-destructive" : "bg-warning"}`} />
                      <span className="font-mono-data text-primary">{p.project_code}</span>
                      <span className="text-muted-foreground">{p.progress}%</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
            {/* Risk Matrix */}
            <div className="glass-card rounded-lg p-4 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-3">Risk Matrix</h3>
              <div className="space-y-0.5">
                <div className="flex items-center gap-0.5">
                  <div className="w-16 text-[8px] text-muted-foreground text-right pr-1">Impact →</div>
                  {["Low", "Med", "High", "V.High"].map(l => <div key={l} className="flex-1 text-[8px] text-center text-muted-foreground">{l}</div>)}
                </div>
                {[...probImpactLevels].reverse().map((prob, pi) => (
                  <div key={prob} className="flex items-center gap-0.5">
                    <div className="w-16 text-[8px] text-muted-foreground text-right pr-1 capitalize">{prob.replace("-", " ")}</div>
                    {probImpactLevels.map((imp, ii) => {
                      const key = `${3 - pi}-${ii}`;
                      const items = matrixData[key] || [];
                      return (
                        <div key={key} className={`flex-1 aspect-square rounded flex items-center justify-center text-xs font-bold ${matrixColors[key]} border border-border/30`}>
                          {items.length > 0 ? <span className="text-foreground">{items.length}</span> : ""}
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div className="flex items-center gap-0.5 mt-1">
                  <div className="w-16 text-[8px] text-muted-foreground text-right pr-1">Prob ↑</div>
                </div>
              </div>
            </div>

            {/* Alerts List */}
            <div className="lg:col-span-2 glass-card rounded-lg shadow-card overflow-hidden">
              <div className="p-3 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Risk Register</h3>
                  <p className="text-[11px] text-muted-foreground">{filteredAlerts.length} items</p>
                </div>
                <div className="relative">
                  <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value as any)}
                    className="appearance-none pl-3 pr-8 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
                    <option value="all">All ({alerts.length})</option>
                    {(["critical", "high", "medium", "low"] as Severity[]).map(s => <option key={s} value={s}>{severityConfig[s].label} ({counts[s]})</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div className="divide-y divide-border/30 max-h-[500px] overflow-y-auto">
                {filteredAlerts.map(alert => {
                  const cfg = severityConfig[alert.severity];
                  const Icon = cfg.icon;
                  return (
                    <div key={alert.id} className="p-3 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => alert.project_id && navigate(`/project/${alert.project_id}`)}>
                      <div className="flex items-start gap-2">
                        <div className={`p-1 rounded-lg ${cfg.bgColor} mt-0.5`}><Icon className={`h-3.5 w-3.5 ${cfg.color}`} /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <h4 className="text-xs font-medium text-foreground">{alert.title}</h4>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium border ${cfg.bgColor} ${cfg.color} ${cfg.borderColor}`}>{cfg.label}</span>
                            {alert.probability && <span className="text-[9px] text-muted-foreground">P: {alert.probability}</span>}
                            {alert.impact && <span className="text-[9px] text-muted-foreground">I: {alert.impact}</span>}
                          </div>
                          {alert.description && <p className="text-[11px] text-muted-foreground mb-1">{alert.description}</p>}
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                            {alert.projects && <span className="font-mono-data text-primary">{alert.projects.project_code}</span>}
                            {alert.risk_owner && <span>Owner: <span className="text-foreground">{alert.risk_owner}</span></span>}
                          </div>
                          {alert.mitigation_plan && <p className="text-[10px] text-info mt-0.5">⚡ {alert.mitigation_plan}</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredAlerts.length === 0 && <div className="p-8 text-center text-muted-foreground"><CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" /><p className="text-sm">Tidak ada peringatan.</p></div>}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RiskMonitoring;
