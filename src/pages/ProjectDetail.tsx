import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useProject, useWorkAreas, useWorkItems, useSubTasks, useMilestones, useAlerts } from "@/hooks/useProjects";
import { formatRupiah } from "@/lib/supabase";
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeft, ChevronDown, ChevronRight, MapPin, User, Calendar, Briefcase,
  Camera, Video, Cctv, CheckCircle2, Clock, AlertTriangle, Target, Layers,
  ArrowDown, ArrowUp, Minus
} from "lucide-react";

const statusConfig = {
  "on-track": { label: "On Track", className: "bg-success/15 text-success border-success/30" },
  "at-risk": { label: "At Risk", className: "bg-warning/15 text-warning border-warning/30" },
  "delayed": { label: "Delayed", className: "bg-destructive/15 text-destructive border-destructive/30" },
  "completed": { label: "Selesai", className: "bg-primary/15 text-primary border-primary/30" },
};

const taskStatusConfig: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  "completed": { label: "Selesai", className: "text-success", icon: CheckCircle2 },
  "in-progress": { label: "Berjalan", className: "text-primary", icon: Clock },
  "not-started": { label: "Belum Mulai", className: "text-muted-foreground", icon: Minus },
};

const milestoneStatusConfig: Record<string, { label: string; className: string }> = {
  "completed": { label: "✓ Selesai", className: "bg-success/15 text-success border-success/30" },
  "in-progress": { label: "● Berjalan", className: "bg-primary/15 text-primary border-primary/30" },
  "pending": { label: "○ Pending", className: "bg-muted text-muted-foreground border-border" },
  "delayed": { label: "! Terlambat", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

type MediaTab = "photo" | "video" | "cctv";

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading } = useProject(id);
  const { data: workAreas = [] } = useWorkAreas(id);
  const workAreaIds = workAreas.map(wa => wa.id);
  const { data: workItems = [] } = useWorkItems(workAreaIds);
  const workItemIds = workItems.map(wi => wi.id);
  const { data: subTasks = [] } = useSubTasks(workItemIds);
  const { data: milestones = [] } = useMilestones(id);
  const { data: allAlerts = [] } = useAlerts();

  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [activeMedia, setActiveMedia] = useState<MediaTab>("photo");
  const [activeTab, setActiveTab] = useState<"wbs" | "milestones" | "media">("wbs");

  const toggleArea = (id: string) => {
    setExpandedAreas(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const toggleItem = (id: string) => {
    setExpandedItems(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const projectAlerts = allAlerts.filter(a => a.project_id === id);

  if (isLoading || !project) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const st = statusConfig[project.status];
  const budgetPct = Math.round((project.spent / project.budget) * 100);
  const budgetRemaining = project.budget - project.spent;
  const endDate = new Date(project.end_date);
  const now = new Date();
  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const mediaTabs: { key: MediaTab; label: string; icon: typeof Camera; available: boolean }[] = [
    { key: "photo", label: "Foto", icon: Camera, available: !!project.image_url },
    { key: "video", label: "Video", icon: Video, available: !!project.video_url },
    { key: "cctv", label: "CCTV Live", icon: Cctv, available: !!project.cctv_url },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-5 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <DashboardHeader />

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
            <Link to="/projects" className="hover:text-primary transition-colors flex items-center gap-1">
              <ChevronLeft className="h-3 w-3" /> Project Summary
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">{project.project_code} — {project.name}</span>
          </div>

          {/* Project Header Card */}
          <div className="glass-card rounded-lg overflow-hidden shadow-card mb-5">
            <div className="relative h-40 overflow-hidden">
              {project.image_url ? (
                <img src={project.image_url} alt={project.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
              <div className="absolute bottom-4 left-5 right-5">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-mono-data text-primary bg-card/80 backdrop-blur px-2 py-0.5 rounded">{project.project_code}</span>
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${st.className}`}>{st.label}</span>
                  <span className="text-xs text-muted-foreground bg-card/80 backdrop-blur px-2 py-0.5 rounded">Fase: {project.phase}</span>
                </div>
                <h1 className="text-xl font-bold text-foreground mt-1">{project.name}</h1>
              </div>
            </div>

            <div className="p-5">
              {project.description && (
                <p className="text-sm text-muted-foreground mb-4">{project.description}</p>
              )}

              {/* Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
                <InfoItem icon={MapPin} label="Lokasi" value={project.location} />
                <InfoItem icon={User} label="Project Manager" value={project.manager} />
                <InfoItem icon={Briefcase} label="Klien" value={project.client} />
                <InfoItem icon={Calendar} label="Mulai" value={new Date(project.start_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} />
                <InfoItem icon={Calendar} label="Target Selesai" value={new Date(project.end_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} />
                <InfoItem icon={Clock} label="Sisa Waktu" value={daysRemaining > 0 ? `${daysRemaining} hari` : "Overdue"} valueClassName={daysRemaining <= 0 ? "text-destructive" : daysRemaining < 90 ? "text-warning" : ""} />
              </div>

              {/* KPI Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MiniKPI label="Progress Keseluruhan" value={`${project.progress}%`} showProgress progressValue={project.progress} />
                <MiniKPI label="Anggaran Terpakai" value={`${budgetPct}%`} subtext={`${formatRupiah(project.spent)} / ${formatRupiah(project.budget)}`} variant={budgetPct > 85 ? "danger" : budgetPct > 70 ? "warning" : "normal"} />
                <MiniKPI label="Sisa Anggaran" value={formatRupiah(budgetRemaining)} subtext={`${100 - budgetPct}% tersisa`} />
                <MiniKPI label="Active Alerts" value={String(projectAlerts.length)} variant={projectAlerts.length > 0 ? "warning" : "normal"} subtext={projectAlerts.length > 0 ? projectAlerts[0]?.title : "Tidak ada alert"} />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mb-4 border-b border-border pb-2">
            {[
              { key: "wbs" as const, label: "Work Breakdown Structure", icon: Layers },
              { key: "milestones" as const, label: `Milestones (${milestones.length})`, icon: Target },
              { key: "media" as const, label: "Media & CCTV", icon: Camera },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-t-md text-xs font-medium transition-colors ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* WBS Tab */}
          {activeTab === "wbs" && (
            <div className="space-y-3">
              {workAreas.length === 0 ? (
                <div className="glass-card rounded-lg p-8 text-center shadow-card">
                  <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Belum ada data Work Breakdown Structure untuk proyek ini.</p>
                  <p className="text-xs text-muted-foreground mt-1">Data WBS dapat diisi melalui menu <Link to="/data-entry" className="text-primary hover:underline">Data Entry</Link>.</p>
                </div>
              ) : (
                workAreas.map(area => {
                  const areaItems = workItems.filter(wi => wi.work_area_id === area.id);
                  const isExpanded = expandedAreas.has(area.id);
                  const totalQty = areaItems.reduce((s, i) => s + Number(i.qty_total), 0);
                  const doneQty = areaItems.reduce((s, i) => s + Number(i.qty_completed), 0);

                  return (
                    <div key={area.id} className="glass-card rounded-lg shadow-card overflow-hidden">
                      {/* Area Header */}
                      <button
                        onClick={() => toggleArea(area.id)}
                        className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
                      >
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono-data text-primary bg-primary/10 px-1.5 py-0.5 rounded">{area.code}</span>
                            <span className="text-sm font-semibold text-foreground">{area.name}</span>
                            <span className="text-[10px] text-muted-foreground">Bobot: {area.weight}%</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] text-muted-foreground">{areaItems.length} pekerjaan</span>
                            {totalQty > 0 && <span className="text-[10px] text-muted-foreground">{doneQty.toLocaleString()}/{totalQty.toLocaleString()} item</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="w-24 hidden sm:block">
                            <Progress value={area.progress} className="h-1.5" />
                          </div>
                          <span className="text-sm font-mono-data font-bold text-primary w-12 text-right">{area.progress}%</span>
                        </div>
                      </button>

                      {/* Work Items */}
                      {isExpanded && (
                        <div className="border-t border-border">
                          {areaItems.map(item => {
                            const itemSubTasks = subTasks.filter(st => st.work_item_id === item.id);
                            const isItemExpanded = expandedItems.has(item.id);
                            const remaining = Number(item.qty_total) - Number(item.qty_completed);
                            const tsc = taskStatusConfig[item.status] || taskStatusConfig["in-progress"];
                            const ItemIcon = tsc.icon;

                            return (
                              <div key={item.id} className="border-b border-border/30 last:border-0">
                                <button
                                  onClick={() => itemSubTasks.length > 0 && toggleItem(item.id)}
                                  className="w-full flex items-center gap-3 px-6 py-3 hover:bg-muted/20 transition-colors text-left"
                                >
                                  {itemSubTasks.length > 0 ? (
                                    <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${isItemExpanded ? "" : "-rotate-90"}`} />
                                  ) : (
                                    <div className="w-3" />
                                  )}
                                  <ItemIcon className={`h-3.5 w-3.5 ${tsc.className} flex-shrink-0`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-mono-data text-muted-foreground">{item.code}</span>
                                      <span className="text-xs font-medium text-foreground">{item.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                      <span className="text-[10px] text-muted-foreground">
                                        <span className="font-mono-data font-bold text-foreground">{Number(item.qty_completed).toLocaleString()}</span>
                                        /{Number(item.qty_total).toLocaleString()} {item.unit}
                                      </span>
                                      <span className={`text-[10px] font-medium ${remaining > 0 ? "text-warning" : "text-success"}`}>
                                        Sisa: {remaining.toLocaleString()} {item.unit}
                                      </span>
                                      {item.end_date && (
                                        <span className="text-[10px] text-muted-foreground">
                                          Target: {new Date(item.end_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 flex-shrink-0">
                                    <div className="w-20 hidden sm:block">
                                      <Progress value={item.progress} className="h-1" />
                                    </div>
                                    <span className={`text-xs font-mono-data font-bold w-10 text-right ${tsc.className}`}>{item.progress}%</span>
                                  </div>
                                </button>

                                {/* Sub Tasks */}
                                {isItemExpanded && itemSubTasks.length > 0 && (
                                  <div className="bg-muted/20 border-t border-border/30">
                                    {itemSubTasks.map(st => {
                                      const stc = taskStatusConfig[st.status] || taskStatusConfig["not-started"];
                                      const stRemaining = Number(st.qty_total) - Number(st.qty_completed);
                                      const StIcon = stc.icon;
                                      return (
                                        <div key={st.id} className="flex items-center gap-3 px-10 py-2 border-b border-border/20 last:border-0">
                                          <StIcon className={`h-3 w-3 ${stc.className} flex-shrink-0`} />
                                          <div className="flex-1 min-w-0">
                                            <span className="text-[11px] text-foreground">{st.name}</span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                              <span className="text-[10px] text-muted-foreground">
                                                <span className="font-mono-data font-bold text-foreground">{Number(st.qty_completed).toLocaleString()}</span>
                                                /{Number(st.qty_total).toLocaleString()} {st.unit}
                                              </span>
                                              <span className={`text-[9px] font-medium ${stRemaining > 0 ? "text-warning" : "text-success"}`}>
                                                Sisa: {stRemaining.toLocaleString()}
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 flex-shrink-0">
                                            <div className="w-16 hidden sm:block">
                                              <Progress value={st.progress} className="h-1" />
                                            </div>
                                            <span className={`text-[10px] font-mono-data font-bold w-8 text-right ${stc.className}`}>{st.progress}%</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Milestones Tab */}
          {activeTab === "milestones" && (
            <div className="glass-card rounded-lg shadow-card overflow-hidden">
              {milestones.length === 0 ? (
                <div className="p-8 text-center">
                  <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Belum ada milestone untuk proyek ini.</p>
                </div>
              ) : (
                <div className="p-4">
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-[18px] top-0 bottom-0 w-px bg-border" />
                    <div className="space-y-4">
                      {milestones.map((ms, i) => {
                        const msc = milestoneStatusConfig[ms.status] || milestoneStatusConfig["pending"];
                        const isLate = ms.status !== "completed" && new Date(ms.target_date) < now;
                        const effectiveConfig = isLate ? milestoneStatusConfig["delayed"] : msc;

                        return (
                          <div key={ms.id} className="relative flex items-start gap-4 pl-10">
                            {/* Dot */}
                            <div className={`absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 ${
                              ms.status === "completed" ? "bg-success border-success" :
                              ms.status === "in-progress" ? "bg-primary border-primary" :
                              isLate ? "bg-destructive border-destructive" :
                              "bg-muted border-border"
                            }`} />

                            <div className="flex-1 bg-muted/20 rounded-lg p-3 border border-border/50">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{ms.phase}</span>
                                  <span className="text-sm font-medium text-foreground">{ms.name}</span>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${effectiveConfig.className}`}>
                                  {isLate ? "! Terlambat" : effectiveConfig.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>Target: <span className="font-mono-data text-foreground">{new Date(ms.target_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span></span>
                                {ms.actual_date && (
                                  <span>Aktual: <span className="font-mono-data text-foreground">{new Date(ms.actual_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span></span>
                                )}
                                {ms.weight > 0 && <span>Bobot: <span className="font-mono-data text-foreground">{ms.weight}%</span></span>}
                                {!ms.actual_date && ms.status !== "completed" && (
                                  <span className={isLate ? "text-destructive font-medium" : ""}>
                                    {isLate
                                      ? `Overdue ${Math.ceil((now.getTime() - new Date(ms.target_date).getTime()) / (1000*60*60*24))} hari`
                                      : `${Math.ceil((new Date(ms.target_date).getTime() - now.getTime()) / (1000*60*60*24))} hari lagi`
                                    }
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Media Tab */}
          {activeTab === "media" && (
            <div className="glass-card rounded-lg shadow-card p-5">
              <div className="flex items-center gap-1 mb-4">
                {mediaTabs.filter(t => t.available).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveMedia(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      activeMedia === tab.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeMedia === "photo" && project.image_url && (
                <div className="rounded-lg overflow-hidden border border-border">
                  <img src={project.image_url} alt={project.name} className="w-full max-h-[500px] object-cover" />
                </div>
              )}
              {activeMedia === "video" && project.video_url && (
                <div className="w-full aspect-video rounded-lg overflow-hidden border border-border">
                  <iframe src={project.video_url} title={`Video ${project.name}`} className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>
              )}
              {activeMedia === "cctv" && project.cctv_url && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
                    </span>
                    <span className="text-xs font-medium text-destructive">LIVE</span>
                    <span className="text-[10px] text-muted-foreground">CCTV Monitoring — {project.location}</span>
                  </div>
                  <div className="w-full aspect-video rounded-lg overflow-hidden border border-border">
                    <iframe src={project.cctv_url} title={`CCTV ${project.name}`} className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                  </div>
                </div>
              )}

              {!mediaTabs.some(t => t.available) && (
                <div className="text-center py-8 text-muted-foreground">
                  <Camera className="h-10 w-10 mx-auto mb-3" />
                  <p className="text-sm">Belum ada media untuk proyek ini.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

function InfoItem({ icon: Icon, label, value, valueClassName = "" }: { icon: typeof MapPin; label: string; value: string; valueClassName?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><Icon className="h-3 w-3" /> {label}</div>
      <p className={`text-xs font-medium text-foreground ${valueClassName}`}>{value}</p>
    </div>
  );
}

function MiniKPI({ label, value, subtext, showProgress, progressValue, variant = "normal" }: {
  label: string; value: string; subtext?: string; showProgress?: boolean; progressValue?: number;
  variant?: "normal" | "warning" | "danger";
}) {
  return (
    <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-bold font-mono-data ${
        variant === "danger" ? "text-destructive" : variant === "warning" ? "text-warning" : "text-foreground"
      }`}>{value}</p>
      {showProgress && progressValue !== undefined && <Progress value={progressValue} className="h-1.5 mt-1" />}
      {subtext && <p className="text-[10px] text-muted-foreground mt-1 truncate">{subtext}</p>}
    </div>
  );
}

export default ProjectDetail;
