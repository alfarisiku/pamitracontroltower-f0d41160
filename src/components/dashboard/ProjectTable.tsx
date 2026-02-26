import { projects, ProjectStatus, formatRupiah } from "@/data/projectData";
import { Progress } from "@/components/ui/progress";
import { Project } from "@/data/projectData";

const statusConfig: Record<ProjectStatus, { label: string; className: string }> = {
  "on-track": { label: "On Track", className: "bg-success/10 text-success border-success/30" },
  "at-risk": { label: "At Risk", className: "bg-warning/10 text-warning border-warning/30" },
  "delayed": { label: "Delayed", className: "bg-destructive/10 text-destructive border-destructive/30" },
  "completed": { label: "Selesai", className: "bg-primary/10 text-primary border-primary/30" },
};

const phaseColors: Record<string, string> = {
  Engineering: "text-primary",
  Procurement: "text-warning",
  Construction: "text-info",
  Commissioning: "text-success",
};

export function ProjectTable({ onSelectProject }: { onSelectProject: (p: Project) => void }) {
  return (
    <div className="glass-card rounded-lg overflow-hidden animate-slide-up shadow-card">
      <div className="p-5 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Daftar Proyek EPC</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Klik proyek untuk melihat detail, foto & video</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">ID</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Nama Proyek</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Lokasi</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Fase</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Progress</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Anggaran</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">PM</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => {
              const st = statusConfig[p.status];
              const budgetPct = Math.round((p.spent / p.budget) * 100);
              return (
                <tr
                  key={p.id}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => onSelectProject(p)}
                >
                  <td className="py-3 px-4 font-mono-data text-xs text-muted-foreground">{p.id}</td>
                  <td className="py-3 px-4 font-medium text-foreground">{p.name}</td>
                  <td className="py-3 px-4 text-muted-foreground text-xs">{p.location}</td>
                  <td className={`py-3 px-4 font-medium text-xs ${phaseColors[p.phase]}`}>{p.phase}</td>
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
                      <span className="font-mono-data text-foreground">{formatRupiah(p.spent)}</span>
                      <span className="text-muted-foreground"> / {formatRupiah(p.budget)}</span>
                      <span className={`ml-1 ${budgetPct > 85 ? "text-destructive" : budgetPct > 70 ? "text-warning" : "text-success"}`}>
                        ({budgetPct}%)
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-xs">{p.manager}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
