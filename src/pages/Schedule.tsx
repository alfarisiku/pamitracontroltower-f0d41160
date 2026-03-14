import { useState, useRef } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useProjects, useWorkAreas, useWorkItems, useMilestones } from "@/hooks/useProjects";
import { DbProject } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, Share2, Download, Printer } from "lucide-react";
import jsPDF from "jspdf";

type ProjectStatus = DbProject["status"];

const statusColors: Record<ProjectStatus, string> = {
  "on-track": "bg-success", "at-risk": "bg-warning", "delayed": "bg-destructive", "completed": "bg-primary",
};
const statusLabels: Record<ProjectStatus, string> = {
  "on-track": "On Track", "at-risk": "At Risk", "delayed": "Delayed", "completed": "Selesai",
};

const Schedule = () => {
  const navigate = useNavigate();
  const { data: projects = [], isLoading } = useProjects();
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const ganttRef = useRef<HTMLDivElement>(null);

  const { data: workAreas = [] } = useWorkAreas(expandedProject || undefined);
  const workAreaIds = workAreas.map(wa => wa.id);
  const { data: workItems = [] } = useWorkItems(workAreaIds);
  const { data: milestones = [] } = useMilestones(expandedProject || undefined);

  if (isLoading) {
    return <div className="flex min-h-screen"><Sidebar /><div className="flex-1 flex items-center justify-center"><div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div></div>;
  }

  const allDates = projects.flatMap(p => [new Date(p.start_date), new Date(p.end_date)]);
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
  const totalDays = Math.max(1, (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

  // Generate monthly labels
  const months: { label: string; left: number; isYear: boolean }[] = [];
  const cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  while (cursor <= maxDate) {
    const dayOffset = (cursor.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
    const m = cursor.getMonth();
    months.push({
      label: m === 0 ? `Jan'${String(cursor.getFullYear()).slice(-2)}` : cursor.toLocaleDateString("id-ID", { month: "short" }).slice(0, 3),
      left: (dayOffset / totalDays) * 100,
      isYear: m === 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const today = new Date();
  const todayPct = ((today.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100;
  const sorted = [...projects].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  // Use a fixed pixel width for timeline to enable scrolling
  const timelinePxWidth = Math.max(1200, totalDays * 2.5);

  const getBarPx = (s: string, e: string) => {
    const left = ((new Date(s).getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * timelinePxWidth;
    const width = ((new Date(e).getTime() - new Date(s).getTime()) / (1000 * 60 * 60 * 24) / totalDays) * timelinePxWidth;
    return { left: `${Math.max(0, left)}px`, width: `${Math.max(4, width)}px` };
  };

  const handleShare = async () => {
    if (navigator.share) await navigator.share({ title: "Schedule & Timeline", url: window.location.href });
    else { await navigator.clipboard.writeText(window.location.href); alert("Link copied!"); }
  };

  const handleExportPDF = () => {
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    pdf.setFontSize(16);
    pdf.text("Schedule & Timeline Report", 14, 20);
    pdf.setFontSize(9);
    pdf.text(`Generated: ${new Date().toLocaleString("id-ID")}`, 14, 27);
    
    let y = 35;
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    ["Code", "Project", "Phase", "Start", "End", "Progress", "Status"].forEach((h, i) => {
      pdf.text(h, 14 + i * 38, y);
    });
    y += 5;
    pdf.setFont("helvetica", "normal");
    sorted.forEach(p => {
      if (y > 190) { pdf.addPage(); y = 20; }
      pdf.text(p.project_code, 14, y);
      pdf.text(p.name.slice(0, 20), 52, y);
      pdf.text(p.phase, 90, y);
      pdf.text(new Date(p.start_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" }), 128, y);
      pdf.text(new Date(p.end_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" }), 166, y);
      pdf.text(`${p.progress}%`, 204, y);
      pdf.text(statusLabels[p.status], 242, y);
      y += 5;
    });
    pdf.save(`Schedule_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handlePrint = () => {
    const printW = window.open("", "_blank");
    if (!printW) return;
    printW.document.write(`<html><head><title>Schedule Report</title><style>body{font-family:Arial,sans-serif;padding:20px;font-size:11px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:4px 8px;text-align:left}th{background:#f5f5f5;font-size:10px;text-transform:uppercase}</style></head><body>`);
    printW.document.write(`<h2>Schedule & Timeline Report</h2><p>Generated: ${new Date().toLocaleString("id-ID")}</p>`);
    printW.document.write(`<table><thead><tr><th>Code</th><th>Project</th><th>Phase</th><th>Start</th><th>End</th><th>Progress</th><th>Status</th></tr></thead><tbody>`);
    sorted.forEach(p => {
      printW.document.write(`<tr><td>${p.project_code}</td><td>${p.name}</td><td>${p.phase}</td><td>${new Date(p.start_date).toLocaleDateString("id-ID")}</td><td>${new Date(p.end_date).toLocaleDateString("id-ID")}</td><td>${p.progress}%</td><td>${statusLabels[p.status]}</td></tr>`);
    });
    printW.document.write(`</tbody></table><p style="margin-top:20px;font-size:9px;color:#888">© 2026 PT Pamitra Jaya Konstruksi</p></body></html>`);
    printW.document.close();
    printW.print();
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-3 sm:p-5 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <DashboardHeader />

          <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-bold text-foreground">Schedule & Timeline</h2>
              <p className="text-xs text-muted-foreground">Klik proyek untuk expand WBS · Scroll horizontal untuk timeline lengkap</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90"><Download className="h-3.5 w-3.5" /> Export PDF</button>
              <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 border border-border"><Printer className="h-3.5 w-3.5" /> Print</button>
              <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 border border-border"><Share2 className="h-3.5 w-3.5" /> Share</button>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-3 flex-wrap">
            {(["on-track", "at-risk", "delayed", "completed"] as ProjectStatus[]).map(s => (
              <div key={s} className="flex items-center gap-1.5 text-[10px]">
                <div className={`w-3 h-2 rounded-sm ${statusColors[s]}`} />
                <span className="text-muted-foreground">{statusLabels[s]}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-[10px] ml-auto">
              <div className="w-0.5 h-3 bg-destructive" />
              <span className="text-muted-foreground">Today ({today.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })})</span>
            </div>
          </div>

          {/* Gantt with horizontal scroll */}
          <div className="glass-card rounded-lg shadow-card overflow-hidden">
            <div className="flex">
              {/* Fixed left panel - project names */}
              <div className="w-[200px] sm:w-[240px] flex-shrink-0 border-r border-border z-10 bg-card">
                <div className="h-10 border-b border-border bg-muted/30 flex items-center px-3">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">Project</span>
                </div>
                {sorted.map(project => {
                  const isExp = expandedProject === project.id;
                  return (
                    <div key={project.id}>
                      <div className="h-11 border-b border-border/30 flex items-center px-2 hover:bg-muted/20 transition-colors cursor-pointer gap-1.5"
                        onClick={() => setExpandedProject(isExp ? null : project.id)}>
                        {isExp ? <ChevronDown className="h-3 w-3 text-primary flex-shrink-0" /> : <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                        <button className="text-[10px] font-mono-data text-primary hover:underline flex-shrink-0"
                          onClick={e => { e.stopPropagation(); navigate(`/project/${project.id}`); }}>{project.project_code}</button>
                        <span className="text-[10px] font-medium text-foreground truncate">{project.name}</span>
                      </div>
                      {isExp && (
                        <>
                          {workAreas.map(area => (
                            <div key={area.id}>
                              <div className="h-7 border-b border-border/20 bg-muted/10 flex items-center px-4">
                                <span className="text-[8px] font-mono-data text-primary/70 mr-1.5">{area.code}</span>
                                <span className="text-[9px] text-muted-foreground truncate">{area.name}</span>
                              </div>
                              {workItems.filter(wi => wi.work_area_id === area.id).map(item => (
                                <div key={item.id} className="h-6 border-b border-border/10 bg-muted/5 flex items-center px-6">
                                  <span className="text-[7px] font-mono-data text-muted-foreground mr-1.5">{item.code}</span>
                                  <span className="text-[8px] text-muted-foreground truncate">{item.name}</span>
                                </div>
                              ))}
                            </div>
                          ))}
                          {milestones.map(ms => (
                            <div key={ms.id} className="h-5 border-b border-border/10 bg-accent/5 flex items-center px-4">
                              <span className="text-[7px] text-accent mr-1">◆</span>
                              <span className="text-[8px] text-accent truncate">{ms.name}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Scrollable timeline */}
              <div className="flex-1 overflow-x-auto" ref={ganttRef}>
                <div style={{ width: `${timelinePxWidth}px`, minWidth: "100%" }}>
                  {/* Header */}
                  <div className="relative h-10 border-b border-border bg-muted/30">
                    {months.map((m, i) => {
                      const leftPx = (m.left / 100) * timelinePxWidth;
                      return (
                        <div key={i} className={`absolute top-0 h-full flex items-end pl-1 pb-1 border-l ${m.isYear ? "border-border" : "border-border/30"}`}
                          style={{ left: `${leftPx}px` }}>
                          <span className={`font-mono-data ${m.isYear ? "text-[10px] font-bold text-foreground" : "text-[9px] text-muted-foreground"}`}>{m.label}</span>
                        </div>
                      );
                    })}
                    {todayPct >= 0 && todayPct <= 100 && (
                      <div className="absolute top-0 h-full w-0.5 bg-destructive z-10" style={{ left: `${(todayPct / 100) * timelinePxWidth}px` }}>
                        <span className="absolute -top-0 left-1 text-[7px] text-destructive font-bold">TODAY</span>
                      </div>
                    )}
                  </div>

                  {/* Rows */}
                  {sorted.map(project => {
                    const barStyle = getBarPx(project.start_date, project.end_date);
                    const barW = parseFloat(barStyle.width);
                    const progressW = (project.progress / 100) * barW;
                    const isExp = expandedProject === project.id;

                    return (
                      <div key={project.id}>
                        <div className="relative h-11 border-b border-border/30 hover:bg-muted/20 transition-colors">
                          {todayPct >= 0 && todayPct <= 100 && <div className="absolute top-0 h-full w-0.5 bg-destructive/15 z-[1]" style={{ left: `${(todayPct / 100) * timelinePxWidth}px` }} />}
                          <div className={`absolute h-4 top-1/2 -translate-y-1/2 rounded-sm ${statusColors[project.status]} opacity-20`} style={barStyle} />
                          <div className={`absolute h-4 top-1/2 -translate-y-1/2 rounded-sm ${statusColors[project.status]} opacity-70`} style={{ left: barStyle.left, width: `${progressW}px` }} />
                          <div className="absolute h-4 top-1/2 -translate-y-1/2 flex items-center justify-end pr-1 z-[2]" style={barStyle}>
                            <span className="text-[8px] font-mono-data text-foreground font-bold bg-card/80 px-0.5 rounded">{project.progress}%</span>
                          </div>
                        </div>

                        {isExp && (
                          <>
                            {workAreas.map(area => {
                              const areaItems = workItems.filter(wi => wi.work_area_id === area.id);
                              return (
                                <div key={area.id}>
                                  <div className="relative h-7 border-b border-border/20 bg-muted/10" />
                                  {areaItems.map(item => {
                                    if (!item.start_date || !item.end_date) return <div key={item.id} className="h-6 border-b border-border/10" />;
                                    const iBar = getBarPx(item.start_date, item.end_date);
                                    const iPW = (item.progress / 100) * parseFloat(iBar.width);
                                    return (
                                      <div key={item.id} className="relative h-6 border-b border-border/10 bg-muted/5">
                                        <div className="absolute h-2.5 top-1/2 -translate-y-1/2 rounded-sm bg-primary/15" style={iBar} />
                                        <div className="absolute h-2.5 top-1/2 -translate-y-1/2 rounded-sm bg-primary/50" style={{ left: iBar.left, width: `${iPW}px` }} />
                                        <div className="absolute h-2.5 top-1/2 -translate-y-1/2 flex items-center justify-end pr-1 z-[2]" style={iBar}>
                                          <span className="text-[6px] font-mono-data text-foreground">{item.progress}%</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                            {milestones.map(ms => {
                              const msOff = ((new Date(ms.target_date).getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * timelinePxWidth;
                              if (msOff < 0 || msOff > timelinePxWidth) return null;
                              const isLate = ms.status !== "completed" && new Date(ms.target_date) < today;
                              return (
                                <div key={ms.id} className="relative h-5 border-b border-border/10 bg-accent/5">
                                  <div className="absolute top-1 bottom-1 w-0.5 rounded" style={{
                                    left: `${msOff}px`, background: isLate ? "hsl(0, 72%, 50%)" : "hsl(30, 85%, 50%)"
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
              </div>
            </div>
          </div>

          {/* Summary Table */}
          <div className="glass-card rounded-lg shadow-card mt-5 overflow-hidden">
            <div className="p-3 border-b border-border"><h3 className="text-sm font-semibold text-foreground">Detail Jadwal</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="bg-muted/30 border-b border-border">
                  <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Kode</th>
                  <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Proyek</th>
                  <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Fase</th>
                  <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Mulai</th>
                  <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Target</th>
                  <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Durasi</th>
                  <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Sisa</th>
                  <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Status</th>
                </tr></thead>
                <tbody>
                  {sorted.map(p => {
                    const start = new Date(p.start_date);
                    const end = new Date(p.end_date);
                    const dur = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                    const rem = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={p.id} className="border-b border-border/30 hover:bg-muted/20 cursor-pointer" onClick={() => navigate(`/project/${p.id}`)}>
                        <td className="py-2 px-3 font-mono-data text-primary">{p.project_code}</td>
                        <td className="py-2 px-3 font-medium text-foreground">{p.name}</td>
                        <td className="py-2 px-3 text-muted-foreground">{p.phase}</td>
                        <td className="py-2 px-3 font-mono-data text-muted-foreground">{start.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" })}</td>
                        <td className="py-2 px-3 font-mono-data text-muted-foreground">{end.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" })}</td>
                        <td className="py-2 px-3 font-mono-data text-foreground">{dur}d</td>
                        <td className={`py-2 px-3 font-mono-data ${rem < 0 ? "text-destructive font-bold" : rem < 90 ? "text-warning" : "text-foreground"}`}>
                          {p.status === "completed" ? "—" : rem < 0 ? `${Math.abs(rem)}d late` : `${rem}d`}
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
