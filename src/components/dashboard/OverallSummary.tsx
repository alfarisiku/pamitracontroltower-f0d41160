import { DbProject } from "@/lib/supabase";
import { formatRupiah } from "@/lib/supabase";
import { Briefcase, TrendingUp, Clock, CheckCircle2 } from "lucide-react";

export function OverallSummary({ projects }: { projects: DbProject[] }) {
  const totalProjects = projects.length;
  const active = projects.filter((p) => p.status !== "completed" && p.status !== "closed").length;
  const totalRap = projects.reduce((s, p) => s + (p.rap || p.contract_value || p.budget || 0), 0);
  const totalActualCashOut = projects.reduce((s, p) => s + (p.spent || 0), 0);
  const avgProgress = Math.round(projects.reduce((s, p) => s + (p.progress || 0), 0) / (totalProjects || 1));
  const onTrack = projects.filter((p) => p.status === "execution" || p.status === "on-track").length;
  const atRisk = projects.filter((p) => p.status === "on-hold" || p.status === "at-risk" || p.status === "delayed").length;

  return (
    <div className="glass-card rounded-lg p-4 animate-slide-up shadow-card">
      <h3 className="text-sm font-semibold text-foreground mb-3">Ringkasan Keseluruhan</h3>
      <div className="grid grid-cols-2 gap-3 mb-3">
        {[
          { label: "Total Proyek", value: totalProjects, icon: Briefcase, color: "text-primary" },
          { label: "Proyek Aktif", value: active, icon: Clock, color: "text-info" },
          { label: "Execution", value: onTrack, icon: CheckCircle2, color: "text-success" },
          { label: "On Hold / Berisiko", value: atRisk, icon: TrendingUp, color: "text-warning" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
            <div>
              <p className="text-lg font-bold font-mono-data text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border pt-3 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Avg. Progress</span>
          <span className="font-mono-data font-medium text-foreground">{avgProgress}%</span>
        </div>
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${avgProgress}%` }} />
        </div>
        <div className="flex justify-between text-xs mt-2">
          <span className="text-muted-foreground">Total Nilai Kontrak</span>
          <span className="font-mono-data font-medium text-accent">{formatRupiah(totalBudget)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Terpakai</span>
          <span className="font-mono-data font-medium text-foreground">{formatRupiah(totalSpent)}</span>
        </div>
      </div>
    </div>
  );
}
