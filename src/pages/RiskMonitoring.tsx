import { useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useProjects, useAlerts } from "@/hooks/useProjects";
import { DbProject } from "@/lib/supabase";
import { AlertCircle, AlertTriangle, Info, CheckCircle2, Shield, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Severity = "critical" | "high" | "medium" | "low";

const severityConfig: Record<Severity, { label: string; icon: typeof AlertCircle; color: string; bgColor: string; borderColor: string }> = {
  critical: { label: "Critical", icon: AlertCircle, color: "text-destructive", bgColor: "bg-destructive/15", borderColor: "border-destructive/30" },
  high: { label: "High", icon: AlertTriangle, color: "text-warning", bgColor: "bg-warning/15", borderColor: "border-warning/30" },
  medium: { label: "Medium", icon: Info, color: "text-info", bgColor: "bg-info/15", borderColor: "border-info/30" },
  low: { label: "Low", icon: Info, color: "text-muted-foreground", bgColor: "bg-muted/30", borderColor: "border-border" },
};

const RiskMonitoring = () => {
  const navigate = useNavigate();
  const { data: projects = [], isLoading: loadingProjects } = useProjects();
  const { data: alerts = [], isLoading: loadingAlerts } = useAlerts();
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");

  const isLoading = loadingProjects || loadingAlerts;

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const filteredAlerts = severityFilter === "all" ? alerts : alerts.filter((a) => a.severity === severityFilter);

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const highCount = alerts.filter((a) => a.severity === "high").length;
  const mediumCount = alerts.filter((a) => a.severity === "medium").length;
  const lowCount = alerts.filter((a) => a.severity === "low").length;

  // Risk matrix data
  const atRiskProjects = projects.filter((p) => p.status === "at-risk" || p.status === "delayed");
  const onTrackProjects = projects.filter((p) => p.status === "on-track");
  const completedProjects = projects.filter((p) => p.status === "completed");

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-5 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <DashboardHeader />

          <div className="mb-5">
            <h2 className="text-lg font-bold text-foreground">Risk Monitoring</h2>
            <p className="text-xs text-muted-foreground">Manajemen risiko dan peringatan proyek EPC</p>
          </div>

          {/* Severity KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {[
              { severity: "critical" as Severity, count: criticalCount, desc: "Perlu tindakan segera" },
              { severity: "high" as Severity, count: highCount, desc: "Perhatian tinggi" },
              { severity: "medium" as Severity, count: mediumCount, desc: "Monitoring aktif" },
              { severity: "low" as Severity, count: lowCount, desc: "Risiko rendah" },
            ].map((item) => {
              const cfg = severityConfig[item.severity];
              const IconComp = cfg.icon;
              return (
                <div key={item.severity} className={`glass-card rounded-lg p-4 shadow-card border ${cfg.borderColor} cursor-pointer hover:shadow-card-hover transition-all`} onClick={() => setSeverityFilter(item.severity)}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-2 rounded-lg ${cfg.bgColor}`}><IconComp className={`h-4 w-4 ${cfg.color}`} /></div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{cfg.label}</span>
                  </div>
                  <p className={`text-2xl font-bold font-mono-data ${cfg.color}`}>{item.count}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{item.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
            {/* Risk Matrix */}
            <div className="glass-card rounded-lg p-4 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-3">Risk Matrix</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <Shield className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">High Risk</p>
                    <p className="text-[10px] text-muted-foreground">{atRiskProjects.length} proyek berisiko tinggi</p>
                  </div>
                  <span className="ml-auto text-lg font-bold font-mono-data text-destructive">{atRiskProjects.length}</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">On Track</p>
                    <p className="text-[10px] text-muted-foreground">{onTrackProjects.length} proyek berjalan baik</p>
                  </div>
                  <span className="ml-auto text-lg font-bold font-mono-data text-success">{onTrackProjects.length}</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Completed</p>
                    <p className="text-[10px] text-muted-foreground">{completedProjects.length} proyek selesai</p>
                  </div>
                  <span className="ml-auto text-lg font-bold font-mono-data text-primary">{completedProjects.length}</span>
                </div>
              </div>

              {/* At-risk project list */}
              {atRiskProjects.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Proyek Berisiko</p>
                  <div className="space-y-1.5">
                    {atRiskProjects.map((p) => (
                      <button key={p.id} className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted/30 transition-colors text-left" onClick={() => navigate(`/project/${p.id}`)}>
                        <div className={`w-2 h-2 rounded-full ${p.status === "delayed" ? "bg-destructive" : "bg-warning"}`} />
                        <span className="text-xs text-foreground truncate flex-1">{p.name}</span>
                        <span className="text-[10px] font-mono-data text-muted-foreground">{p.progress}%</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Alerts List */}
            <div className="lg:col-span-2 glass-card rounded-lg shadow-card overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Daftar Peringatan Aktif</h3>
                  <p className="text-[11px] text-muted-foreground">{filteredAlerts.length} peringatan ditampilkan</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <select
                      value={severityFilter}
                      onChange={(e) => setSeverityFilter(e.target.value as any)}
                      className="appearance-none pl-3 pr-8 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="all">Semua ({alerts.length})</option>
                      <option value="critical">Critical ({criticalCount})</option>
                      <option value="high">High ({highCount})</option>
                      <option value="medium">Medium ({mediumCount})</option>
                      <option value="low">Low ({lowCount})</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="divide-y divide-border/30">
                {filteredAlerts.map((alert) => {
                  const cfg = severityConfig[alert.severity];
                  const IconComp = cfg.icon;
                  return (
                    <div
                      key={alert.id}
                      className="p-4 hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => {
                        const proj = projects.find((p) => p.id === alert.project_id);
                        if (proj) setSelectedProject(proj);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded-lg ${cfg.bgColor} mt-0.5`}>
                          <IconComp className={`h-4 w-4 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-medium text-foreground">{alert.title}</h4>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium border ${cfg.bgColor} ${cfg.color} ${cfg.borderColor}`}>
                              {cfg.label}
                            </span>
                          </div>
                          {alert.description && (
                            <p className="text-xs text-muted-foreground mb-1.5">{alert.description}</p>
                          )}
                          {alert.projects && (
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="font-mono-data text-primary">{alert.projects.project_code}</span>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-muted-foreground">{alert.projects.name}</span>
                            </div>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(alert.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredAlerts.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
                    <p className="text-sm">Tidak ada peringatan untuk filter ini.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {selectedProject && (
        <ProjectOverviewModal project={selectedProject} onClose={() => setSelectedProject(null)} />
      )}
    </div>
  );
};

export default RiskMonitoring;
