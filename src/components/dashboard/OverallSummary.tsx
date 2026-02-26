import { projects, formatRupiah } from "@/data/projectData";
import { Briefcase, TrendingUp, Clock, CheckCircle2 } from "lucide-react";

export function OverallSummary() {
  const totalProjects = projects.length;
  const active = projects.filter((p) => p.status !== "completed").length;
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalSpent = projects.reduce((s, p) => s + p.spent, 0);
  const avgProgress = Math.round(projects.reduce((s, p) => s + p.progress, 0) / totalProjects);
  const onTrack = projects.filter((p) => p.status === "on-track").length;
  const atRisk = projects.filter((p) => p.status === "at-risk" || p.status === "delayed").length;

  const stats = [
    { label: "Total Proyek", value: totalProjects, icon: Briefcase, color: "text-primary" },
    { label: "Proyek Aktif", value: active, icon: Clock, color: "text-info" },
    { label: "On Track", value: onTrack, icon: CheckCircle2, color: "text-success" },
    { label: "Berisiko", value: atRisk, icon: TrendingUp, color: "text-warning" },
  ];

  return (
    <div className="glass-card rounded-lg p-5 animate-slide-up shadow-card">
      <h3 className="text-sm font-semibold text-foreground mb-4">Ringkasan Keseluruhan</h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5">
            <s.icon className={`h-4 w-4 ${s.color}`} />
            <div>
              <p className="text-lg font-bold font-mono-data text-foreground">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border pt-3 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Avg. Progress</span>
          <span className="font-mono-data font-medium text-foreground">{avgProgress}%</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${avgProgress}%` }} />
        </div>
        <div className="flex justify-between text-xs mt-2">
          <span className="text-muted-foreground">Total Anggaran</span>
          <span className="font-mono-data font-medium text-foreground">{formatRupiah(totalBudget)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Terpakai</span>
          <span className="font-mono-data font-medium text-foreground">{formatRupiah(totalSpent)}</span>
        </div>
      </div>
    </div>
  );
}
