import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, CheckCircle2, Clock, Layers, ExternalLink } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { KPICard } from "@/components/dashboard/KPICard";
import { PhaseChart } from "@/components/dashboard/PhaseChart";
import { IndonesiaMap } from "@/components/dashboard/IndonesiaMap";
import { ProjectOverviewModal } from "@/components/dashboard/ProjectOverviewModal";
import { Progress } from "@/components/ui/progress";
import { useProjects } from "@/hooks/useProjects";
import { DbProject, getStatusMeta } from "@/lib/supabase";

const Index = () => {
  const [selectedProject, setSelectedProject] = useState<DbProject | null>(null);
  const { data: projects = [], isLoading } = useProjects();
  const navigate = useNavigate();

  const active = projects.filter((p) => p.status !== "completed" && p.status !== "closed").length;
  const completed = projects.filter((p) => p.status === "completed" || p.status === "closed").length;
  const avgProgress = Math.round(projects.reduce((s, p) => s + (p.progress || 0), 0) / (projects.length || 1));

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Memuat data proyek...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-5 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <DashboardHeader />

          <div className="mb-1">
            <h2 className="text-sm font-semibold text-foreground mb-3">Overview Proyek</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <KPICard title="Total Projects" value={projects.length} subtitle={`${active} aktif`} icon={Briefcase} variant="primary" />
            <KPICard title="Proyek Aktif" value={active} subtitle="Sedang berjalan" icon={Clock} variant="accent" />
            <KPICard title="Selesai" value={completed} subtitle="Completed / Closed" icon={CheckCircle2} variant="success" />
            <KPICard title="Overall Progress" value={`${avgProgress}%`} subtitle="Rata-rata semua proyek" icon={Layers} variant="primary" />
          </div>

          {/* Map + Distribusi Production */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-5">
            <div className="lg:col-span-3">
              <IndonesiaMap projects={projects} onSelectProject={setSelectedProject} />
            </div>
            <div>
              <PhaseChart projects={projects} />
            </div>
          </div>

          {/* Daftar Proyek — non-sensitive */}
          <div className="glass-card rounded-lg overflow-hidden animate-slide-up shadow-card">
            <div className="p-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Daftar Proyek</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Klik proyek untuk overview singkat · Klik <ExternalLink className="inline h-3 w-3" /> untuk detail lengkap</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">P#</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Project</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Lokasi</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Production</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Status</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Start</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">End</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Progress Actual</th>
                    <th className="text-center py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p, i) => {
                    const st = getStatusMeta(p.status);
                    return (
                      <tr key={p.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setSelectedProject(p)}>
                        <td className="py-2 px-3 font-mono-data text-muted-foreground">{i + 1}</td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-mono-data font-bold">{p.project_code}</span>
                            <span className="font-medium text-foreground truncate max-w-[180px]">{p.name}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground truncate max-w-[160px]">{p.location || "—"}</td>
                        <td className="py-2 px-3 text-muted-foreground">{p.phase || "—"}</td>
                        <td className="py-2 px-3">
                          <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${st.className} bg-card`}>{st.label}</span>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">{new Date(p.start_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</td>
                        <td className="py-2 px-3 text-muted-foreground">{new Date(p.end_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <Progress value={p.progress} className="h-1 flex-1" />
                            <span className="font-mono-data text-muted-foreground w-9 text-right">{p.progress}%</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/project/${p.id}`); }} className="p-1 rounded hover:bg-primary/10 transition-colors" title="Lihat detail">
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
        </div>
      </main>

      {selectedProject && (
        <ProjectOverviewModal project={selectedProject} onClose={() => setSelectedProject(null)} />
      )}
    </div>
  );
};

export default Index;
