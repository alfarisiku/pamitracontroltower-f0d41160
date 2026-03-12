import { useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useProjects, useWorkAreas, useWorkItems, useMilestones } from "@/hooks/useProjects";
import { DbProject } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";

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
  const navigate = useNavigate();
  const { data: projects = [], isLoading } = useProjects();
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  // Fetch WBS for expanded project
  const { data: workAreas = [] } = useWorkAreas(expandedProject || undefined);
  const workAreaIds = workAreas.map(wa => wa.id);
  const { data: workItems = [] } = useWorkItems(workAreaIds);
  const { data: milestones = [] } = useMilestones(expandedProject || undefined);

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

  const allDates = projects.flatMap((p) => [new Date(p.start_date), new Date(p.end_date)]);
  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));
  const totalDays = Math.max(1, (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

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
  const sorted = [...projects].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  const getBarStyle = (startDate: string, endDate: string) => {
    const startOffset = ((new Date(startDate).getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100;
    const duration = ((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100;
    return { left: `${Math.max(0, startOffset)}%`, width: `${Math.max(0.5, duration)}%` };
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-3 sm:p-5 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <DashboardHeader />

          <div className="mb-5">
            <h2 className="text-lg font-bold text-foreground">Schedule & Timeline</h2>
            <p className="text-xs text-muted-foreground">Klik proyek untuk expand WBS schedule · Klik kode proyek untuk detail</p>
          </div>

          <div className="flex items-center gap-4 mb-4 flex-wrap">
            {(["on-track", "at-risk", "delayed", "completed"] as ProjectStatus[]).map((s) => (
              <div key={s} className="flex items-center gap-1.5 text-[10px]">
                <div className={`w-3 h-2 rounded-sm ${statusColors[s]}`} />
                <span className="text-muted-foreground">{statusLabels[s]}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-[10px] ml-auto">
              <div className="w-0.5 h-3 bg-destructive" />
              <span className="text-muted-foreground">Hari Ini ({today.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })})</span>
            </div>
          </div>

          {/* Gantt Chart */}
          <div className="glass-card rounded-lg shadow-card overflow-hidden">
            {/* Month headers */}
            <div className="relative h-10 border-b border-border bg-muted/30">
              {months.map((m, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full flex items-end text-[10px] text-muted-foreground font-mono-data border-l border-border/40 pl-1 pb-1"
                  style={{ left: `${Math.max(0, Math.min(99, m.left))}%` }}
                >
                  {m.label}
                </div>
              ))}
              {todayOffset >= 0 && todayOffset <= 100 && (
                <div className="absolute top-0 h-full w-0.5 bg-destructive z-10" style={{ left: `${todayOffset}%` }}>
                  <span className="absolute -top-0 left-1 text-[8px] text-destructive font-bold">TODAY</span>
                </div>
              )}
            </div>

            {/* Rows */}
            {sorted.map((project) => {
              const barStyle = getBarStyle(project.start_date, project.end_date);
              const startOffset = parseFloat(barStyle.left);
              const duration = parseFloat(barStyle.width);
              const progressWidth = (project.progress / 100) * duration;
              const isExpanded = expandedProject === project.id;
              const projectWorkAreas = isExpanded ? workAreas : [];
              const projectMilestones = isExpanded ? milestones : [];

              return (
                <div key={project.id}>
                  <div
                    className="relative flex items-center h-12 border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer group"
                    onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                  >
                    {months.map((m, i) => (
                      <div key={i} className="absolute top-0 h-full border-l border-border/10" style={{ left: `${m.left}%` }} />
                    ))}
                    {todayOffset >= 0 && todayOffset <= 100 && (
                      <div className="absolute top-0 h-full w-0.5 bg-destructive/20 z-[1]" style={{ left: `${todayOffset}%` }} />
                    )}

                    <div className="absolute left-2 z-10 flex items-center gap-1.5 pointer-events-none">
                      {isExpanded ? <ChevronDown className="h-3 w-3 text-primary" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                      <button
                        className="text-[10px] font-mono-data text-primary bg-card/90 px-1 rounded hover:underline pointer-events-auto"
                        onClick={(e) => { e.stopPropagation(); navigate(`/project/${project.id}`); }}
                      >{project.project_code}</button>
                      <span className="text-xs font-medium text-foreground bg-card/90 px-1 rounded truncate max-w-[120px] sm:max-w-[180px]">{project.name}</span>
                    </div>

                    <div className={`absolute h-5 rounded-sm ${statusColors[project.status]} opacity-20`} style={barStyle} />
                    <div className={`absolute h-5 rounded-sm ${statusColors[project.status]} opacity-70`}
                      style={{ left: barStyle.left, width: `${progressWidth}%` }} />
                    <div className="absolute h-5 flex items-center justify-end pr-1.5 z-[2]" style={barStyle}>
                      <span className="text-[9px] font-mono-data text-foreground font-bold">{project.progress}%</span>
                    </div>
                  </div>

                  {/* Expanded WBS rows */}
                  {isExpanded && (
                    <>
                      {projectWorkAreas.map(area => {
                        const areaItems = workItems.filter(wi => wi.work_area_id === area.id);
                        return (
                          <div key={area.id}>
                            <div className="relative flex items-center h-8 border-b border-border/20 bg-muted/10">
                              {months.map((m, i) => (
                                <div key={i} className="absolute top-0 h-full border-l border-border/5" style={{ left: `${m.left}%` }} />
                              ))}
                              <div className="absolute left-6 z-10 flex items-center gap-1.5">
                                <span className="text-[9px] font-mono-data text-primary/70">{area.code}</span>
                                <span className="text-[10px] font-medium text-muted-foreground">{area.name}</span>
                                <span className="text-[9px] font-mono-data text-foreground">{area.progress}%</span>
                              </div>
                            </div>
                            {areaItems.map(item => {
                              if (!item.start_date || !item.end_date) return null;
                              const itemBar = getBarStyle(item.start_date, item.end_date);
                              const itemProgressW = (item.progress / 100) * parseFloat(itemBar.width);
                              return (
                                <div key={item.id} className="relative flex items-center h-7 border-b border-border/10 bg-muted/5">
                                  {months.map((m, i) => (
                                    <div key={i} className="absolute top-0 h-full border-l border-border/5" style={{ left: `${m.left}%` }} />
                                  ))}
                                  <div className="absolute left-10 z-10 flex items-center gap-1.5">
                                    <span className="text-[8px] font-mono-data text-muted-foreground">{item.code}</span>
                                    <span className="text-[9px] text-muted-foreground truncate max-w-[100px] sm:max-w-[140px]">{item.name}</span>
                                  </div>
                                  <div className="absolute h-3 rounded-sm bg-primary/15" style={itemBar} />
                                  <div className="absolute h-3 rounded-sm bg-primary/50" style={{ left: itemBar.left, width: `${itemProgressW}%` }} />
                                  <div className="absolute h-3 flex items-center justify-end pr-1 z-[2]" style={itemBar}>
                                    <span className="text-[7px] font-mono-data text-foreground">{item.progress}%</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                      {/* Milestones */}
                      {projectMilestones.map(ms => {
                        const msOffset = ((new Date(ms.target_date).getTime() - minDate.getTime()) / (1000*60*60*24) / totalDays) * 100;
                        if (msOffset < 0 || msOffset > 100) return null;
                        const isLate = ms.status !== "completed" && new Date(ms.target_date) < today;
                        return (
                          <div key={ms.id} className="relative flex items-center h-6 border-b border-border/10 bg-accent/5">
                            <div className="absolute left-10 z-10 flex items-center gap-1.5">
                              <span className="text-[8px] text-accent">◆</span>
                              <span className={`text-[9px] ${isLate ? "text-destructive font-medium" : "text-accent"}`}>{ms.name}</span>
                            </div>
                            <div className="absolute top-1 bottom-1 w-0.5 rounded" style={{
                              left: `${msOffset}%`,
                              background: isLate ? "hsl(0, 72%, 50%)" : "hsl(30, 85%, 50%)"
                            }}>
                              <div className={`absolute -top-0.5 -left-1 w-2 h-2 rotate-45 ${isLate ? "bg-destructive" : "bg-accent"}`} />
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary table */}
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
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Target</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Durasi</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Sisa</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((p) => {
                    const start = new Date(p.start_date);
                    const end = new Date(p.end_date);
                    const durationDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                    const remainingDays = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={p.id} className="border-b border-border/30 hover:bg-muted/20 cursor-pointer" onClick={() => navigate(`/project/${p.id}`)}>
                        <td className="py-2 px-3 font-mono-data text-primary">{p.project_code}</td>
                        <td className="py-2 px-3 font-medium text-foreground">{p.name}</td>
                        <td className="py-2 px-3 text-muted-foreground">{p.phase}</td>
                        <td className="py-2 px-3 font-mono-data text-muted-foreground">{start.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" })}</td>
                        <td className="py-2 px-3 font-mono-data text-muted-foreground">{end.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" })}</td>
                        <td className="py-2 px-3 font-mono-data text-foreground">{durationDays}d</td>
                        <td className={`py-2 px-3 font-mono-data ${remainingDays < 0 ? "text-destructive font-bold" : remainingDays < 90 ? "text-warning" : "text-foreground"}`}>
                          {p.status === "completed" ? "—" : remainingDays < 0 ? `${Math.abs(remainingDays)}d overdue` : `${remainingDays}d`}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${
                            p.status === "on-track" ? "bg-success/15 text-success border-success/30" :
                            p.status === "at-risk" ? "bg-warning/15 text-warning border-warning/30" :
                            p.status === "delayed" ? "bg-destructive/15 text-destructive border-destructive/30" :
                            "bg-primary/15 text-primary border-primary/30"
                          }`}>{statusLabels[p.status]}</span>
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
    </div>
  );
};

export default Schedule;
