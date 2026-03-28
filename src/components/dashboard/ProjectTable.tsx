import { useNavigate } from "react-router-dom";
import { DbProject } from "@/lib/supabase";
import { formatRupiah } from "@/lib/supabase";
import { Progress } from "@/components/ui/progress";
import { ExternalLink } from "lucide-react";

type ProjectStatus = DbProject["status"];

const statusConfig: Record<ProjectStatus, { label: string; className: string }> = {
  "on-track": { label: "On Track", className: "bg-success/15 text-success border-success/30" },
  "at-risk": { label: "At Risk", className: "bg-warning/15 text-warning border-warning/30" },
  "delayed": { label: "Delayed", className: "bg-destructive/15 text-destructive border-destructive/30" },
  "completed": { label: "Selesai", className: "bg-primary/15 text-primary border-primary/30" },
};

export function ProjectTable({ projects, onSelectProject }: { projects: DbProject[]; onSelectProject: (p: DbProject) => void }) {
  const navigate = useNavigate();

  return (
    <div className="glass-card rounded-lg overflow-hidden animate-slide-up shadow-card">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Daftar Proyek</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">Klik proyek untuk overview · Klik <ExternalLink className="inline h-3 w-3" /> untuk detail WBS lengkap</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">P#</th>
              <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Project</th>
              <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Status</th>
              <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Value</th>
              <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">End Date</th>
              <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Progress</th>
              <th className="text-center py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Detail</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p, i) => {
              const st = statusConfig[p.status];
              return (
                <tr
                  key={p.id}
                  className="border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => onSelectProject(p)}
                >
                  <td className="py-2 px-3 font-mono-data text-muted-foreground">{i + 1}</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-mono-data font-bold">
                        {p.project_code}
                      </span>
                      <span className="font-medium text-foreground truncate max-w-[160px]">{p.name}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${st.className} bg-card`}>
                      {st.label}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-mono-data text-foreground">{formatRupiah(p.budget)}</td>
                  <td className="py-2 px-3 text-muted-foreground">
                    {new Date(p.end_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2 min-w-[80px]">
                      <Progress value={p.progress} className="h-1 flex-1" />
                      <span className="font-mono-data text-muted-foreground w-7 text-right">{p.progress}%</span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/project/${p.id}`); }}
                      className="p-1 rounded hover:bg-primary/10 transition-colors"
                      title="Lihat detail WBS"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-primary" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
