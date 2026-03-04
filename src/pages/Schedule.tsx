import { useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useProjects } from "@/hooks/useProjects";
import { DbProject, formatRupiah } from "@/lib/supabase";
import { ProjectOverviewModal } from "@/components/dashboard/ProjectOverviewModal";

type ProjectStatus = DbProject["status"];

const statusColors: Record<ProjectStatus, string> = {
  "on-track": "bg-success",
  "at-risk": "bg-warning",
  "delayed": "bg-destructive",
  "completed": "bg-primary",
};

const statusLabels: Record<ProjectStatus, string> = {
  "on-track": "On Track",
  "at-risk": "At Risk",
  "delayed": "Delayed",
  "completed": "Selesai",
};

const Schedule = () => {
  const { data: projects = [], isLoading } = useProjects();
  const [selectedProject, setSelectedProject] = useState<DbProject | null>(null);

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

  // Calculate timeline range
  const allDates = projects.flatMap((p) => [new Date(p.start_date), new Date(p.end_date)]);
  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));
  const totalDays = Math.max(1, (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

  // Generate month markers
  const months: { label: string; left: number }[] = [];
  const cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  while (cursor <= maxDate) {
    const dayOffset = (cursor.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
    months.push({
      label: cursor.toLocaleDateString("id-ID", { month: "short", year: "2-digit" }),
      left: (dayOffset / totalDays) * 100,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const today = new Date();
  const todayOffset = ((today.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100;

  // Sort by start date
  const sorted = [...projects].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-5 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <DashboardHeader />

          <div className="mb-5">
            <h2 className="text-lg font-bold text-foreground">Schedule & Timeline</h2>
            <p className="text-xs text-muted-foreground">Gantt chart semua proyek EPC · Klik untuk detail</p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mb-4">
            {(["on-track", "at-risk", "delayed", "completed"] as ProjectStatus[]).map((s) => (
              <div key={s} className="flex items-center gap-1.5 text-[10px]">
                <div className={`w-3 h-2 rounded-sm ${statusColors[s]}`} />
                <span className="text-muted-foreground">{statusLabels[s]}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-[10px] ml-auto">
              <div className="w-0.5 h-3 bg-destructive" />
              <span className="text-muted-foreground">Hari Ini</span>
            </div>
          </div>

          {/* Gantt Chart */}
          <div className="glass-card rounded-lg shadow-card overflow-hidden">
            {/* Month headers */}
            <div className="relative h-8 border-b border-border bg-muted/30">
              {months.map((m, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full flex items-center text-[10px] text-muted-foreground font-mono-data border-l border-border/30 pl-1.5"
                  style={{ left: `${Math.max(0, Math.min(100, m.left))}%` }}
                >
                  {m.label}
                </div>
              ))}
              {/* Today marker */}
              {todayOffset >= 0 && todayOffset <= 100 && (
                <div className="absolute top-0 h-full w-0.5 bg-destructive z-10" style={{ left: `${todayOffset}%` }} />
              )}
            </div>

            {/* Rows */}
            {sorted.map((project) => {
              const startOffset = ((new Date(project.start_date).getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100;
              const duration = ((new Date(project.end_date).getTime() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100;
              const progressWidth = (project.progress / 100) * duration;

              return (
                <div
                  key={project.id}
                  className="relative flex items-center h-12 border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer group"
                  onClick={() => setSelectedProject(project)}
                >
                  {/* Month grid lines */}
                  {months.map((m, i) => (
                    <div key={i} className="absolute top-0 h-full border-l border-border/10" style={{ left: `${m.left}%` }} />
                  ))}
                  {/* Today line */}
                  {todayOffset >= 0 && todayOffset <= 100 && (
                    <div className="absolute top-0 h-full w-0.5 bg-destructive/30 z-[1]" style={{ left: `${todayOffset}%` }} />
                  )}

                  {/* Project label */}
                  <div className="absolute left-2 z-10 flex items-center gap-2 pointer-events-none">
                    <span className="text-[10px] font-mono-data text-muted-foreground bg-card/80 px-1 rounded">{project.project_code}</span>
                    <span className="text-xs font-medium text-foreground bg-card/80 px-1 rounded truncate max-w-[140px]">{project.name}</span>
                  </div>

                  {/* Bar background (total duration) */}
                  <div
                    className={`absolute h-5 rounded-sm ${statusColors[project.status]} opacity-25`}
                    style={{ left: `${startOffset}%`, width: `${duration}%` }}
                  />
                  {/* Bar progress fill */}
                  <div
                    className={`absolute h-5 rounded-sm ${statusColors[project.status]} opacity-70`}
                    style={{ left: `${startOffset}%`, width: `${progressWidth}%` }}
                  />
                  {/* Progress text */}
                  <div
                    className="absolute h-5 flex items-center justify-end pr-1.5 z-[2]"
                    style={{ left: `${startOffset}%`, width: `${duration}%` }}
                  >
                    <span className="text-[9px] font-mono-data text-foreground font-bold">{project.progress}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary table below */}
          <div className="glass-card rounded-lg shadow-card mt-5 overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Detail Jadwal Proyek</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Kode</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Proyek</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Fase</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Mulai</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Target Selesai</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Durasi</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Sisa Hari</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((p) => {
                    const st = statusLabels[p.status];
                    const start = new Date(p.start_date);
                    const end = new Date(p.end_date);
                    const durationDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                    const remainingDays = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={p.id} className="border-b border-border/30 hover:bg-muted/20 cursor-pointer" onClick={() => setSelectedProject(p)}>
                        <td className="py-2 px-3 font-mono-data text-primary">{p.project_code}</td>
                        <td className="py-2 px-3 font-medium text-foreground">{p.name}</td>
                        <td className="py-2 px-3 text-muted-foreground">{p.phase}</td>
                        <td className="py-2 px-3 font-mono-data text-muted-foreground">{start.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" })}</td>
                        <td className="py-2 px-3 font-mono-data text-muted-foreground">{end.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" })}</td>
                        <td className="py-2 px-3 font-mono-data text-foreground">{durationDays} hari</td>
                        <td className={`py-2 px-3 font-mono-data ${remainingDays < 0 ? "text-destructive" : remainingDays < 90 ? "text-warning" : "text-foreground"}`}>
                          {p.status === "completed" ? "—" : remainingDays < 0 ? `${Math.abs(remainingDays)}d overdue` : `${remainingDays}d`}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${
                            p.status === "on-track" ? "bg-success/15 text-success border-success/30" :
                            p.status === "at-risk" ? "bg-warning/15 text-warning border-warning/30" :
                            p.status === "delayed" ? "bg-destructive/15 text-destructive border-destructive/30" :
                            "bg-primary/15 text-primary border-primary/30"
                          }`}>{st}</span>
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

export default Schedule;
