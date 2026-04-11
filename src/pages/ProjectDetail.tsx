import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useProject, useWorkAreas, useWorkItems, useSubTasks, useMilestones, useAlerts, useSCurveData } from "@/hooks/useProjects";
import { supabase, formatRupiah } from "@/lib/supabase";
import { Progress } from "@/components/ui/progress";
import { SCurveChart } from "@/components/dashboard/SCurveChart";
import { FormulaTooltip, FORMULAS } from "@/components/dashboard/FormulaTooltip";
import {
  ChevronLeft, ChevronDown, ChevronRight, MapPin, User, Calendar, Briefcase,
  Camera, Video, Cctv, CheckCircle2, Clock, AlertTriangle, Target, Layers,
  Minus, Share2, Shield, TrendingUp, Activity, ExternalLink, Image as ImageIcon
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

type MediaTab = "weekly" | "video" | "cctv";

function extractYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function getYoutubeThumbnail(url: string): string | null {
  const id = extractYoutubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

const phaseLabels: Record<string, string> = {
  "Engineering": "E",
  "Procurement": "P",
  "Construction": "C",
  "Commissioning": "Co",
};

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
  const { data: scurveData = [] } = useSCurveData(id);

  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [activeMedia, setActiveMedia] = useState<MediaTab>("weekly");
  const [activeTab, setActiveTab] = useState<"health" | "scurve" | "wbs" | "milestones" | "media">("health");

  // Weekly photos
  const [weeklyPhotos, setWeeklyPhotos] = useState<any[]>([]);
  useEffect(() => {
    if (!id) return;
    supabase.from("project_photos").select("*").eq("project_id", id).order("uploaded_at", { ascending: false })
      .then(({ data }) => setWeeklyPhotos(data || []));
  }, [id]);

  const toggleArea = (areaId: string) => {
    setExpandedAreas(prev => { const n = new Set(prev); n.has(areaId) ? n.delete(areaId) : n.add(areaId); return n; });
  };
  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => { const n = new Set(prev); n.has(itemId) ? n.delete(itemId) : n.add(itemId); return n; });
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
  const budgetPct = project.budget > 0 ? Math.round((project.spent / project.budget) * 100) : 0;
  const budgetRemaining = project.budget - project.spent;
  const endDate = new Date(project.end_date);
  const now = new Date();
  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const totalDuration = Math.ceil((endDate.getTime() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24));
  const elapsedPct = totalDuration > 0 ? Math.min(100, Math.round(((totalDuration - Math.max(0, daysRemaining)) / totalDuration) * 100)) : 100;

  const weeklyProgress = Math.max(0, Math.min(5, Math.round((project.progress / Math.max(1, elapsedPct)) * 3 * 10) / 10));
  const futureRemaining = 100 - project.progress;

  const scheduleHealth = project.progress >= elapsedPct - 5 ? "good" : project.progress >= elapsedPct - 15 ? "warning" : "critical";
  const cpi = project.spent > 0 ? ((project.progress / 100) * project.budget) / project.spent : 1;
  const costHealth = cpi >= 0.95 ? "good" : cpi >= 0.8 ? "warning" : "critical";
  const criticalAlerts = projectAlerts.filter(a => a.severity === "critical" || a.severity === "high").length;
  const riskHealth = criticalAlerts === 0 ? "good" : criticalAlerts <= 1 ? "warning" : "critical";

  const healthColor = (h: string) => h === "good" ? "text-success" : h === "warning" ? "text-warning" : "text-destructive";
  const healthBg = (h: string) => h === "good" ? "bg-success/15 border-success/30" : h === "warning" ? "bg-warning/15 border-warning/30" : "bg-destructive/15 border-destructive/30";
  const healthLabel = (h: string) => h === "good" ? "Good" : h === "warning" ? "At Risk" : "Critical";

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: `${project.project_code} - ${project.name}`, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert("Link copied!");
    }
  };

  // Group weekly photos by week_label
  const photosByWeek = weeklyPhotos.reduce((acc: Record<string, any[]>, p) => {
    const key = p.week_label || "Uncategorized";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const videoThumbnail = project.video_url ? getYoutubeThumbnail(project.video_url) : null;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-3 sm:p-5 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <DashboardHeader />

          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link to="/projects" className="hover:text-primary transition-colors flex items-center gap-1">
                <ChevronLeft className="h-3 w-3" /> Projects
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-medium">{project.project_code}</span>
            </div>
            <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 border border-border transition-colors">
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
          </div>

          {/* Project Header — cover photo as background header only */}
          <div className="glass-card rounded-lg overflow-hidden shadow-card mb-5">
            <div className="relative h-32 sm:h-44 overflow-hidden">
              {project.image_url ? (
                <img src={project.image_url} alt={project.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono-data text-primary bg-card/80 backdrop-blur px-2 py-0.5 rounded">{project.project_code}</span>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${st.className}`}>{st.label}</span>
                  <span className="text-[10px] text-muted-foreground bg-card/80 backdrop-blur px-2 py-0.5 rounded">{project.phase}</span>
                  {project.category && <span className="text-[10px] text-muted-foreground bg-card/80 backdrop-blur px-2 py-0.5 rounded">{project.category}</span>}
                </div>
                <h1 className="text-lg sm:text-xl font-bold text-foreground mt-1">{project.name}</h1>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              {project.description && <p className="text-xs text-muted-foreground mb-3">{project.description}</p>}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                <InfoItem icon={MapPin} label="Lokasi" value={project.location} />
                <InfoItem icon={User} label="PM" value={project.manager} />
                <InfoItem icon={Briefcase} label="Klien" value={project.client} />
                <InfoItem icon={Calendar} label="Mulai" value={new Date(project.start_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} />
                <InfoItem icon={Calendar} label="Target" value={endDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} />
                <InfoItem icon={Clock} label="Sisa" value={daysRemaining > 0 ? `${daysRemaining}d` : "Overdue"} valueClassName={daysRemaining <= 0 ? "text-destructive" : daysRemaining < 90 ? "text-warning" : ""} />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mb-4 border-b border-border pb-2 overflow-x-auto">
            {([
              { key: "health" as const, label: "Health Summary", icon: Activity },
              { key: "scurve" as const, label: "S-Curve", icon: TrendingUp },
              { key: "wbs" as const, label: "WBS", icon: Layers },
              { key: "milestones" as const, label: `Milestones (${milestones.length})`, icon: Target },
              { key: "media" as const, label: "Media", icon: Camera },
            ]).map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-md text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}>
                <tab.icon className="h-3.5 w-3.5" />{tab.label}
              </button>
            ))}
          </div>

          {/* Health Summary Tab */}
          {activeTab === "health" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className={`glass-card rounded-lg p-3 border ${healthBg(scheduleHealth)}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Calendar className={`h-3.5 w-3.5 ${healthColor(scheduleHealth)}`} />
                    <span className="text-[10px] text-muted-foreground uppercase">Schedule</span>
                    <FormulaTooltip {...FORMULAS.scheduleHealth} />
                  </div>
                  <p className={`text-sm font-bold ${healthColor(scheduleHealth)}`}>{healthLabel(scheduleHealth)}</p>
                  <p className="text-[10px] text-muted-foreground">Plan {elapsedPct}% vs Actual {project.progress}%</p>
                </div>
                <div className={`glass-card rounded-lg p-3 border ${healthBg(costHealth)}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className={`h-3.5 w-3.5 ${healthColor(costHealth)}`} />
                    <span className="text-[10px] text-muted-foreground uppercase">Cost</span>
                    <FormulaTooltip {...FORMULAS.cpi} />
                  </div>
                  <p className={`text-sm font-bold ${healthColor(costHealth)}`}>CPI {cpi.toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground">{formatRupiah(project.spent)} / {formatRupiah(project.budget)}</p>
                </div>
                <div className={`glass-card rounded-lg p-3 border ${healthBg(riskHealth)}`}>
                  <div className="flex items-center gap-1.5 mb-1"><Shield className={`h-3.5 w-3.5 ${healthColor(riskHealth)}`} /><span className="text-[10px] text-muted-foreground uppercase">Risk</span></div>
                  <p className={`text-sm font-bold ${healthColor(riskHealth)}`}>{healthLabel(riskHealth)}</p>
                  <p className="text-[10px] text-muted-foreground">{criticalAlerts} critical/high</p>
                </div>
                <div className="glass-card rounded-lg p-3 border border-border">
                  <div className="flex items-center gap-1.5 mb-1"><AlertTriangle className="h-3.5 w-3.5 text-warning" /><span className="text-[10px] text-muted-foreground uppercase">Alerts</span></div>
                  <p className="text-sm font-bold text-foreground">{projectAlerts.length}</p>
                  <p className="text-[10px] text-muted-foreground">active issues</p>
                </div>
                <div className="glass-card rounded-lg p-3 border border-border">
                  <div className="flex items-center gap-1.5 mb-1"><Target className="h-3.5 w-3.5 text-primary" /><span className="text-[10px] text-muted-foreground uppercase">Milestones</span></div>
                  <p className="text-sm font-bold text-foreground">{milestones.filter(m => m.status === "completed").length}/{milestones.length}</p>
                  <p className="text-[10px] text-muted-foreground">completed</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="glass-card rounded-lg p-4 shadow-card">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Overall Progress</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Physical Progress</span>
                        <span className="font-mono-data font-bold text-primary">{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground flex items-center">Budget Utilization<FormulaTooltip {...FORMULAS.budgetUtil} /></span>
                        <span className={`font-mono-data font-bold ${budgetPct > 85 ? "text-destructive" : "text-foreground"}`}>{budgetPct}%</span>
                      </div>
                      <Progress value={budgetPct} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Time Elapsed</span>
                        <span className="font-mono-data font-bold text-foreground">{elapsedPct}%</span>
                      </div>
                      <Progress value={elapsedPct} className="h-2" />
                    </div>
                  </div>
                </div>
                <div className="glass-card rounded-lg p-4 shadow-card">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Weekly & Payment Tracking</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase mb-1">Weekly Progress</p>
                      <p className="text-xl font-bold font-mono-data text-primary">{weeklyProgress}%</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase mb-1">Future Remaining</p>
                      <p className="text-xl font-bold font-mono-data text-warning">{futureRemaining}%</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase mb-1">Remaining Budget</p>
                      <p className="text-lg font-bold font-mono-data text-success">{formatRupiah(budgetRemaining)}</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase mb-1 flex items-center justify-center gap-1">Profit Margin<FormulaTooltip {...FORMULAS.profitMargin} /></p>
                      <p className={`text-lg font-bold font-mono-data ${budgetRemaining > 0 ? "text-success" : "text-destructive"}`}>
                        {project.budget > 0 ? Math.round((budgetRemaining / project.budget) * 100) : 0}%
                      </p>
                      {project.profit_margin_target > 0 && (
                        <p className="text-[9px] text-muted-foreground">Target: {project.profit_margin_target}%</p>
                      )}
                    </div>
                  </div>
                  {/* RAP vs Actual */}
                  {project.rap > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-2">💰 RAP vs Actual Monitoring</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-primary/5 rounded-lg p-2 text-center border border-primary/20">
                          <p className="text-[9px] text-muted-foreground">RAP</p>
                          <p className="text-xs font-bold font-mono-data text-primary">{formatRupiah(project.rap)}</p>
                        </div>
                        <div className="bg-warning/5 rounded-lg p-2 text-center border border-warning/20">
                          <p className="text-[9px] text-muted-foreground">Actual Spent</p>
                          <p className="text-xs font-bold font-mono-data text-warning">{formatRupiah(project.spent)}</p>
                        </div>
                        <div className={`rounded-lg p-2 text-center border ${project.spent <= project.rap ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"}`}>
                          <p className="text-[9px] text-muted-foreground">Selisih</p>
                          <p className={`text-xs font-bold font-mono-data ${project.spent <= project.rap ? "text-success" : "text-destructive"}`}>
                            {project.spent <= project.rap ? "+" : ""}{formatRupiah(project.rap - project.spent)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {projectAlerts.length > 0 && (
                <div className="glass-card rounded-lg shadow-card overflow-hidden">
                  <div className="p-3 border-b border-border"><h3 className="text-sm font-semibold text-foreground">Active Alerts & Risks</h3></div>
                  <div className="divide-y divide-border/30">
                    {projectAlerts.map(alert => (
                      <div key={alert.id} className="p-3 hover:bg-muted/20">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${
                            alert.severity === "critical" ? "text-destructive" : alert.severity === "high" ? "text-warning" : "text-info"
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-medium text-foreground">{alert.title}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium border ${
                                alert.severity === "critical" ? "bg-destructive/15 text-destructive border-destructive/30" :
                                alert.severity === "high" ? "bg-warning/15 text-warning border-warning/30" :
                                "bg-info/15 text-info border-info/30"
                              }`}>{alert.severity}</span>
                            </div>
                            {alert.description && <p className="text-[11px] text-muted-foreground mt-0.5">{alert.description}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* S-Curve Tab */}
          {activeTab === "scurve" && (
            <div className="glass-card rounded-lg shadow-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-1">S-Curve — Planned vs Actual Progress</h3>
              <p className="text-[10px] text-muted-foreground mb-3">Data S-Curve dapat diedit melalui Data Entry → S-Curve Editor.</p>
              <SCurveChart
                startDate={project.start_date}
                endDate={project.end_date}
                progress={project.progress}
                milestones={milestones}
                customData={scurveData.length > 0 ? scurveData : undefined}
              />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase mb-1 flex items-center justify-center gap-1">SPI<FormulaTooltip {...FORMULAS.spi} /></p>
                  <p className={`text-lg font-bold font-mono-data ${elapsedPct > 0 ? (project.progress / elapsedPct >= 0.95 ? "text-success" : project.progress / elapsedPct >= 0.8 ? "text-warning" : "text-destructive") : "text-foreground"}`}>
                    {elapsedPct > 0 ? (project.progress / elapsedPct).toFixed(2) : "N/A"}
                  </p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Deviasi</p>
                  <p className={`text-lg font-bold font-mono-data ${project.progress - elapsedPct >= 0 ? "text-success" : "text-destructive"}`}>
                    {project.progress - elapsedPct > 0 ? "+" : ""}{project.progress - elapsedPct}%
                  </p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase mb-1 flex items-center justify-center gap-1">CPI<FormulaTooltip {...FORMULAS.cpi} /></p>
                  <p className={`text-lg font-bold font-mono-data ${cpi >= 0.95 ? "text-success" : cpi >= 0.8 ? "text-warning" : "text-destructive"}`}>
                    {cpi.toFixed(2)}
                  </p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">RAP vs Actual</p>
                  <p className={`text-lg font-bold font-mono-data ${project.rap > 0 && project.spent <= project.rap ? "text-success" : "text-destructive"}`}>
                    {project.rap > 0 ? `${Math.round((project.spent / project.rap) * 100)}%` : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* WBS Tab — with EPC phase and deadline info */}
          {activeTab === "wbs" && (
            <div className="space-y-3">
              {workAreas.length === 0 ? (
                <div className="glass-card rounded-lg p-8 text-center shadow-card">
                  <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Belum ada data WBS.</p>
                  <p className="text-xs text-muted-foreground mt-1">Isi melalui <Link to="/data-entry" className="text-primary hover:underline">Data Entry</Link>.</p>
                </div>
              ) : (
                <>
                  {/* EPC Phase summary */}
                  <div className="glass-card rounded-lg p-3 shadow-card">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[10px] uppercase text-muted-foreground font-semibold">EPC Phase:</span>
                      {["Engineering", "Procurement", "Construction", "Commissioning"].map(phase => {
                        const phaseItems = workItems.filter(wi => {
                          const area = workAreas.find(wa => wa.id === wi.work_area_id);
                          return area?.name?.toLowerCase().includes(phase.toLowerCase()) || wi.name?.toLowerCase().includes(phase.toLowerCase());
                        });
                        const phaseProgress = phaseItems.length > 0 ? Math.round(phaseItems.reduce((s, i) => s + i.progress, 0) / phaseItems.length) : 0;
                        const isActive = project.phase === phase;
                        return (
                          <div key={phase} className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] border ${isActive ? "bg-primary/10 border-primary/30 text-primary font-bold" : "bg-muted/30 border-border/50 text-muted-foreground"}`}>
                            <span className="font-mono-data">{phaseLabels[phase]}</span>
                            <span>{phase}</span>
                            {phaseItems.length > 0 && <span className="font-mono-data">({phaseProgress}%)</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {workAreas.map(area => {
                    const areaItems = workItems.filter(wi => wi.work_area_id === area.id);
                    const isExpanded = expandedAreas.has(area.id);
                    const totalQty = areaItems.reduce((s, i) => s + Number(i.qty_total), 0);
                    const doneQty = areaItems.reduce((s, i) => s + Number(i.qty_completed), 0);

                    return (
                      <div key={area.id} className="glass-card rounded-lg shadow-card overflow-hidden">
                        <button onClick={() => toggleArea(area.id)} className="w-full flex items-center gap-3 p-3 sm:p-4 hover:bg-muted/30 transition-colors text-left">
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-mono-data text-primary bg-primary/10 px-1.5 py-0.5 rounded">{area.code}</span>
                              <span className="text-sm font-semibold text-foreground">{area.name}</span>
                              <span className="text-[10px] text-muted-foreground">W:{area.weight}%</span>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                              <span>{areaItems.length} items</span>
                              {totalQty > 0 && <span>{doneQty.toLocaleString()}/{totalQty.toLocaleString()}</span>}
                              <span className="text-warning">Sisa: {(totalQty - doneQty).toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="w-20 hidden sm:block"><Progress value={area.progress} className="h-1.5" /></div>
                            <span className="text-sm font-mono-data font-bold text-primary w-10 text-right">{area.progress}%</span>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-border">
                            {areaItems.map(item => {
                              const itemSubs = subTasks.filter(s => s.work_item_id === item.id);
                              const isItemExp = expandedItems.has(item.id);
                              const remaining = Number(item.qty_total) - Number(item.qty_completed);
                              const tsc = taskStatusConfig[item.status] || taskStatusConfig["in-progress"];
                              const ItemIcon = tsc.icon;

                              return (
                                <div key={item.id} className="border-b border-border/30 last:border-0">
                                  <button onClick={() => itemSubs.length > 0 && toggleItem(item.id)}
                                    className="w-full flex items-center gap-2 px-4 sm:px-6 py-2.5 hover:bg-muted/20 transition-colors text-left">
                                    {itemSubs.length > 0 ? <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${isItemExp ? "" : "-rotate-90"}`} /> : <div className="w-3" />}
                                    <ItemIcon className={`h-3.5 w-3.5 ${tsc.className} flex-shrink-0`} />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-mono-data text-muted-foreground">{item.code}</span>
                                        <span className="text-xs font-medium text-foreground">{item.name}</span>
                                        <span className="text-[9px] px-1 py-0.5 bg-muted rounded text-muted-foreground">W:{item.weight}%</span>
                                      </div>
                                      <div className="flex items-center gap-3 mt-0.5 flex-wrap text-[10px]">
                                        <span className="text-muted-foreground">
                                          <span className="font-mono-data font-bold text-foreground">{Number(item.qty_completed).toLocaleString()}</span>/{Number(item.qty_total).toLocaleString()} {item.unit}
                                        </span>
                                        <span className={`font-medium ${remaining > 0 ? "text-warning" : "text-success"}`}>Sisa: {remaining.toLocaleString()} {item.unit}</span>
                                        {item.start_date && <span className="text-muted-foreground">📅 {new Date(item.start_date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>}
                                        {item.end_date && <span className="text-muted-foreground">→ {new Date(item.end_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" })}</span>}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <div className="w-16 hidden sm:block"><Progress value={item.progress} className="h-1" /></div>
                                      <span className={`text-xs font-mono-data font-bold w-10 text-right ${tsc.className}`}>{item.progress}%</span>
                                    </div>
                                  </button>

                                  {isItemExp && itemSubs.length > 0 && (
                                    <div className="bg-muted/20 border-t border-border/30">
                                      {itemSubs.map(st => {
                                        const stc = taskStatusConfig[st.status] || taskStatusConfig["not-started"];
                                        const stRem = Number(st.qty_total) - Number(st.qty_completed);
                                        const StIcon = stc.icon;
                                        return (
                                          <div key={st.id} className="flex items-center gap-2 px-8 sm:px-10 py-2 border-b border-border/20 last:border-0">
                                            <StIcon className={`h-3 w-3 ${stc.className} flex-shrink-0`} />
                                            <div className="flex-1 min-w-0">
                                              <span className="text-[11px] text-foreground">{st.name}</span>
                                              <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                                                <span className="text-muted-foreground"><span className="font-mono-data font-bold text-foreground">{Number(st.qty_completed).toLocaleString()}</span>/{Number(st.qty_total).toLocaleString()} {st.unit}</span>
                                                <span className={`font-medium ${stRem > 0 ? "text-warning" : "text-success"}`}>Sisa: {stRem.toLocaleString()}</span>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                              <div className="w-12 hidden sm:block"><Progress value={st.progress} className="h-1" /></div>
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
                  })}
                </>
              )}
            </div>
          )}

          {/* Milestones Tab */}
          {activeTab === "milestones" && (
            <div className="glass-card rounded-lg shadow-card overflow-hidden">
              {milestones.length === 0 ? (
                <div className="p-8 text-center"><Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">Belum ada milestone.</p></div>
              ) : (
                <div className="p-4">
                  <div className="relative">
                    <div className="absolute left-[18px] top-0 bottom-0 w-px bg-border" />
                    <div className="space-y-3">
                      {milestones.map(ms => {
                        const msc = milestoneStatusConfig[ms.status] || milestoneStatusConfig["pending"];
                        const isLate = ms.status !== "completed" && new Date(ms.target_date) < now;
                        const cfg = isLate ? milestoneStatusConfig["delayed"] : msc;
                        return (
                          <div key={ms.id} className="relative flex items-start gap-4 pl-10">
                            <div className={`absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 ${
                              ms.status === "completed" ? "bg-success border-success" : ms.status === "in-progress" ? "bg-primary border-primary" : isLate ? "bg-destructive border-destructive" : "bg-muted border-border"
                            }`} />
                            <div className="flex-1 bg-muted/20 rounded-lg p-3 border border-border/50">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{ms.phase}</span>
                                  <span className="text-sm font-medium text-foreground">{ms.name}</span>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${cfg.className}`}>{isLate ? "! Terlambat" : cfg.label}</span>
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                                <span>Target: <span className="font-mono-data text-foreground">{new Date(ms.target_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span></span>
                                {ms.actual_date && <span>Aktual: <span className="font-mono-data text-foreground">{new Date(ms.actual_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span></span>}
                                {ms.weight > 0 && <span>Bobot: <span className="font-mono-data text-foreground">{ms.weight}%</span></span>}
                                {!ms.actual_date && ms.status !== "completed" && (
                                  <span className={isLate ? "text-destructive font-medium" : ""}>
                                    {isLate ? `Overdue ${Math.ceil((now.getTime() - new Date(ms.target_date).getTime()) / (1000*60*60*24))}d` : `${Math.ceil((new Date(ms.target_date).getTime() - now.getTime()) / (1000*60*60*24))}d lagi`}
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

          {/* Media Tab — NO cover photo tab, only weekly + video + cctv */}
          {activeTab === "media" && (
            <div className="glass-card rounded-lg shadow-card p-4">
              <div className="flex items-center gap-1 mb-4 flex-wrap">
                {([
                  { key: "weekly" as MediaTab, label: `Weekly Update (${weeklyPhotos.length})`, icon: Camera, available: true },
                  { key: "video" as MediaTab, label: "Video", icon: Video, available: !!project.video_url },
                  { key: "cctv" as MediaTab, label: "CCTV", icon: Cctv, available: !!project.cctv_url },
                ]).filter(t => t.available).map(tab => (
                  <button key={tab.key} onClick={() => setActiveMedia(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      activeMedia === tab.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}><tab.icon className="h-3.5 w-3.5" />{tab.label}</button>
                ))}
              </div>

              {/* Weekly Photos */}
              {activeMedia === "weekly" && (
                <div>
                  {weeklyPhotos.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Camera className="h-10 w-10 mx-auto mb-3" />
                      <p className="text-sm">Belum ada foto progress mingguan.</p>
                      <p className="text-xs mt-1">Upload melalui <Link to="/data-entry" className="text-primary hover:underline">Data Entry → Regular Update</Link></p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(photosByWeek).map(([week, photos]) => (
                        <div key={week}>
                          <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-primary" /> {week}
                            <span className="text-muted-foreground font-normal">({(photos as any[]).length} foto)</span>
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                            {(photos as any[]).map((p: any) => (
                              <div key={p.id} className="rounded-lg overflow-hidden border border-border group cursor-pointer"
                                onClick={() => window.open(p.photo_url, '_blank')}>
                                <img src={p.photo_url} alt={p.caption || "Progress"} className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300" />
                                {p.caption && <div className="p-1.5 text-[10px] text-muted-foreground truncate">{p.caption}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Video — YouTube link only */}
              {activeMedia === "video" && project.video_url && (
                <div>
                  {videoThumbnail ? (
                    <div className="relative rounded-lg overflow-hidden border border-border cursor-pointer group"
                      onClick={() => window.open(project.video_url!, '_blank')}>
                      <img src={videoThumbnail} alt="Video" className="w-full max-h-[400px] object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                        <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                          <div className="w-0 h-0 border-l-[20px] border-l-primary border-y-[12px] border-y-transparent ml-1" />
                        </div>
                      </div>
                      <div className="absolute bottom-3 left-3 flex items-center gap-2">
                        <ExternalLink className="h-4 w-4 text-white" />
                        <span className="text-xs text-white font-medium">Buka di YouTube</span>
                      </div>
                    </div>
                  ) : (
                    <a href={project.video_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <Video className="h-8 w-8 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Buka Video</p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-md">{project.video_url}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground ml-auto" />
                    </a>
                  )}
                </div>
              )}

              {/* CCTV — External link */}
              {activeMedia === "cctv" && project.cctv_url && (
                <div>
                  <a href={project.cctv_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-5 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <div className="relative">
                      <Cctv className="h-10 w-10 text-destructive" />
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground flex items-center gap-2">
                        CCTV Live Stream
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive font-medium border border-destructive/30">LIVE</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-md mt-0.5">{project.cctv_url}</p>
                    </div>
                    <ExternalLink className="h-5 w-5 text-muted-foreground ml-auto" />
                  </a>
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
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><Icon className="h-3 w-3" /> {label}</div>
      <p className={`text-xs font-medium text-foreground ${valueClassName}`}>{value}</p>
    </div>
  );
}

export default ProjectDetail;
