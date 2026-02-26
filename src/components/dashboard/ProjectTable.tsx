import { projects, ProjectStatus } from "@/data/projectData";
import { Progress } from "@/components/ui/progress";

const statusConfig: Record<ProjectStatus, { label: string; className: string }> = {
  "on-track": { label: "On Track", className: "bg-success/15 text-success border-success/30" },
  "at-risk": { label: "At Risk", className: "bg-warning/15 text-warning border-warning/30" },
  "delayed": { label: "Delayed", className: "bg-destructive/15 text-destructive border-destructive/30" },
  "completed": { label: "Selesai", className: "bg-primary/15 text-primary border-primary/30" },
};

const phaseColors: Record<string, string> = {
  Engineering: "text-primary",
  Procurement: "text-warning",
  Construction: "text-[hsl(220,70%,55%)]",
  Commissioning: "text-success",
};

function formatCurrency(val: number) {
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
  return `$${(val / 1000).toFixed(0)}K`;
}

export function ProjectTable() {
  return (
    <div className="glass-card rounded-lg overflow-hidden animate-slide-up">
      <div className="p-5 border-b border-border/50">
        <h2 className="text-lg font-semibold text-foreground">Daftar Proyek</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Overview seluruh proyek EPC aktif</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">ID</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Nama Proyek</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Klien</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Fase</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Progress</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Budget</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">PM</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => {
              const st = statusConfig[p.status];
              const budgetPct = Math.round((p.spent / p.budget) * 100);
              return (
                <tr key={p.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-4 font-mono-data text-xs text-muted-foreground">{p.id}</td>
                  <td className="py-3 px-4 font-medium text-foreground">{p.name}</td>
                  <td className="py-3 px-4 text-muted-foreground">{p.client}</td>
                  <td className={`py-3 px-4 font-medium ${phaseColors[p.phase]}`}>{p.phase}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${st.className}`}>
                      {st.label}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <Progress value={p.progress} className="h-1.5 flex-1" />
                      <span className="font-mono-data text-xs text-muted-foreground w-8 text-right">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-xs">
                      <span className="font-mono-data text-foreground">{formatCurrency(p.spent)}</span>
                      <span className="text-muted-foreground"> / {formatCurrency(p.budget)}</span>
                      <span className={`ml-1 ${budgetPct > 85 ? "text-destructive" : budgetPct > 70 ? "text-warning" : "text-success"}`}>
                        ({budgetPct}%)
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{p.manager}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
