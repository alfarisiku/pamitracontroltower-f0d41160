import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useProject, useWorkAreas, useWorkItems, useSubTasks, useMilestones, useAlerts, useAllAlerts, useSCurveData, useProcurementItems, usePurchaseOrders, useProjectCashflow } from "@/hooks/useProjects";
import { supabase, formatRupiah } from "@/lib/supabase";
import { Progress } from "@/components/ui/progress";
import { SCurveChart } from "@/components/dashboard/SCurveChart";
import { FormulaTooltip, FORMULAS } from "@/components/dashboard/FormulaTooltip";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, AreaChart, Area, Legend } from "recharts";
import {
  ChevronLeft, ChevronDown, ChevronRight, MapPin, User, Calendar, Briefcase,
  Camera, Video, Cctv, CheckCircle2, Clock, AlertTriangle, Target, Layers,
  Minus, Share2, Shield, TrendingUp, Activity, ExternalLink, Image as ImageIcon,
  Package, DollarSign, Wallet, Receipt, Lock
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
type MainTab = "health" | "finance" | "scurve" | "wbs" | "milestones" | "procurement" | "risks" | "media" | "weekly-report";

const riskCategoryLabels: Record<string, string> = {
  technical: "Technical", schedule: "Schedule", cost: "Cost",
  procurement: "Procurement", contractual: "Contractual", operational: "Operational",
};
const procStatusLabels: Record<string, string> = {
  planned: "Planned", "rfq-sent": "RFQ Sent", approval: "Approval", "po-issued": "PO Issued",
  fabrication: "Fabrication", delivery: "Delivery", installed: "Installed",
};
const procStatusColors: Record<string, string> = {
  planned: "bg-muted text-muted-foreground", "rfq-sent": "bg-primary/15 text-primary",
  approval: "bg-warning/15 text-warning", "po-issued": "bg-info/15 text-info",
  fabrication: "bg-accent/15 text-accent-foreground", delivery: "bg-success/15 text-success",
  installed: "bg-success/20 text-success",
};

function extractYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function getYoutubeThumbnail(url: string): string | null {
  const id = extractYoutubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

const phaseLabels: Record<string, string> = { "Engineering": "E", "Procurement": "P", "Construction": "C", "Commissioning": "Co" };

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
  const { data: projectRisks = [] } = useAllAlerts(id);
  const { data: scurveData = [] } = useSCurveData(id);
  const { data: procurementItems = [] } = useProcurementItems(id);
  const { data: purchaseOrders = [] } = usePurchaseOrders(id);
  const { data: cashflowData = [] } = useProjectCashflow(id);

  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [activeMedia, setActiveMedia] = useState<MediaTab>("weekly");
  const [activeTab, setActiveTab] = useState<MainTab>("health");

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
  const contractValue = project.contract_value || project.budget;
  const poCommitted = purchaseOrders.reduce((s, po) => s + po.amount, 0);
  const actualCost = project.spent;
  const remainingBudget = project.budget - actualCost;
  const budgetPct = project.budget > 0 ? Math.round((actualCost / project.budget) * 100) : 0;

  // Margin calculations
  const plannedMargin = contractValue > 0 && project.rap > 0 ? contractValue - project.rap : 0;
  const plannedMarginPct = contractValue > 0 && project.rap > 0 ? Math.round(((contractValue - project.rap) / contractValue) * 100) : 0;
  const committedMargin = contractValue > 0 ? contractValue - poCommitted : 0;
  const committedMarginPct = contractValue > 0 ? Math.round(((contractValue - poCommitted) / contractValue) * 100) : 0;
  const actualMargin = contractValue > 0 ? contractValue - actualCost : 0;
  const actualMarginPct = contractValue > 0 ? Math.round(((contractValue - actualCost) / contractValue) * 100) : 0;

  const endDate = new Date(project.end_date);
  const now = new Date();
  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const totalDuration = Math.ceil((endDate.getTime() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24));
  const elapsedPct = totalDuration > 0 ? Math.min(100, Math.round(((totalDuration - Math.max(0, daysRemaining)) / totalDuration) * 100)) : 100;

  const scheduleHealth = project.progress >= elapsedPct - 5 ? "good" : project.progress >= elapsedPct - 15 ? "warning" : "critical";
  const cpi = actualCost > 0 ? ((project.progress / 100) * project.budget) / actualCost : 1;
  const costHealth = cpi >= 0.95 ? "good" : cpi >= 0.8 ? "warning" : "critical";
  const criticalAlerts = projectAlerts.filter(a => a.severity === "critical" || a.severity === "high").length;
  const riskHealth = criticalAlerts === 0 ? "good" : criticalAlerts <= 1 ? "warning" : "critical";

  const healthColor = (h: string) => h === "good" ? "text-success" : h === "warning" ? "text-warning" : "text-destructive";
  const healthBg = (h: string) => h === "good" ? "bg-success/15 border-success/30" : h === "warning" ? "bg-warning/15 border-warning/30" : "bg-destructive/15 border-destructive/30";
  const healthLabel = (h: string) => h === "good" ? "Good" : h === "warning" ? "At Risk" : "Critical";

  const handleShare = async () => {
    if (navigator.share) await navigator.share({ title: `${project.project_code} - ${project.name}`, url: window.location.href });
    else { await navigator.clipboard.writeText(window.location.href); alert("Link copied!"); }
  };

  const photosByWeek = weeklyPhotos.reduce((acc: Record<string, any[]>, p) => {
    const key = p.week_label || "Uncategorized";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const videoThumbnail = project.video_url ? getYoutubeThumbnail(project.video_url) : null;

  const chartTooltip = { backgroundColor: "hsl(0, 0%, 100%)", border: "1px solid hsl(215, 20%, 88%)", borderRadius: "6px", fontSize: "11px", color: "hsl(220, 25%, 15%)" };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-3 sm:p-5 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <DashboardHeader />

          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link to="/projects" className="hover:text-primary transition-colors flex items-center gap-1"><ChevronLeft className="h-3 w-3" /> Projects</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-medium">{project.project_code}</span>
            </div>
            <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 border border-border transition-colors">
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
          </div>

          {/* Project Header */}
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
                  {project.margin_locked && <span className="text-[10px] text-warning bg-card/80 backdrop-blur px-2 py-0.5 rounded flex items-center gap-1"><Lock className="h-2.5 w-2.5" />Margin Locked</span>}
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
              { key: "health" as const, label: "Health", icon: Activity },
              { key: "finance" as const, label: "Finance", icon: Wallet },
              { key: "scurve" as const, label: "S-Curve", icon: TrendingUp },
              { key: "wbs" as const, label: "WBS", icon: Layers },
              { key: "procurement" as const, label: `Procurement (${procurementItems.length})`, icon: Package },
              { key: "risks" as const, label: `Risks (${projectRisks.length})`, icon: AlertTriangle },
              { key: "milestones" as const, label: `Milestones (${milestones.length})`, icon: Target },
              { key: "weekly-report" as const, label: "Weekly Report", icon: FileText },
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

          {/* Health Summary */}
          {activeTab === "health" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className={`glass-card rounded-lg p-3 border ${healthBg(scheduleHealth)}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Calendar className={`h-3.5 w-3.5 ${healthColor(scheduleHealth)}`} />
                    <span className="text-[10px] text-muted-foreground uppercase">Schedule</span>
                    <FormulaTooltip {...FORMULAS.scheduleHealth} />
                  </div>
                  <p className={`text-sm font-bold ${healthColor(scheduleHealth)}`}>{healthLabel(scheduleHealth)}</p>
                  <p className="text-[10px] text-muted-foreground">Plan {elapsedPct}% vs Act {project.progress}%</p>
                </div>
                <div className={`glass-card rounded-lg p-3 border ${healthBg(costHealth)}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className={`h-3.5 w-3.5 ${healthColor(costHealth)}`} />
                    <span className="text-[10px] text-muted-foreground uppercase">Cost</span>
                    <FormulaTooltip {...FORMULAS.cpi} />
                  </div>
                  <p className={`text-sm font-bold ${healthColor(costHealth)}`}>CPI {cpi.toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground">{formatRupiah(actualCost)} / {formatRupiah(project.budget)}</p>
                </div>
                <div className={`glass-card rounded-lg p-3 border ${healthBg(riskHealth)}`}>
                  <div className="flex items-center gap-1.5 mb-1"><Shield className={`h-3.5 w-3.5 ${healthColor(riskHealth)}`} /><span className="text-[10px] text-muted-foreground uppercase">Risk</span></div>
                  <p className={`text-sm font-bold ${healthColor(riskHealth)}`}>{healthLabel(riskHealth)}</p>
                  <p className="text-[10px] text-muted-foreground">{criticalAlerts} critical/high</p>
                </div>
                <div className="glass-card rounded-lg p-3 border border-border">
                  <div className="flex items-center gap-1.5 mb-1"><Clock className="h-3.5 w-3.5 text-primary" /><span className="text-[10px] text-muted-foreground uppercase">Time Elapsed</span></div>
                  <p className="text-sm font-bold text-foreground">{elapsedPct}%</p>
                  <p className="text-[10px] text-muted-foreground">{totalDuration - Math.max(0, daysRemaining)}d of {totalDuration}d</p>
                </div>
                <div className="glass-card rounded-lg p-3 border border-border">
                  <div className="flex items-center gap-1.5 mb-1"><DollarSign className="h-3.5 w-3.5 text-accent" /><span className="text-[10px] text-muted-foreground uppercase">TKDN</span></div>
                  <p className="text-sm font-bold text-foreground">{project.tkdn_percentage}%</p>
                  <p className="text-[10px] text-muted-foreground">Target TKDN</p>
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
                  <h3 className="text-sm font-semibold text-foreground mb-3">Quick Financial Summary</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase mb-1">Contract Value</p>
                      <p className="text-lg font-bold font-mono-data text-primary">{formatRupiah(contractValue)}</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase mb-1">Remaining Budget</p>
                      <p className={`text-lg font-bold font-mono-data ${remainingBudget > 0 ? "text-success" : "text-destructive"}`}>{formatRupiah(remainingBudget)}</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase mb-1 flex items-center justify-center gap-1">Actual Margin<FormulaTooltip {...FORMULAS.profitMargin} /></p>
                      <p className={`text-lg font-bold font-mono-data ${actualMarginPct > 10 ? "text-success" : actualMarginPct > 0 ? "text-warning" : "text-destructive"}`}>{actualMarginPct}%</p>
                      {project.profit_margin_target > 0 && <p className="text-[9px] text-muted-foreground">Target: {project.profit_margin_target}%</p>}
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase mb-1">PO Committed</p>
                      <p className="text-lg font-bold font-mono-data text-foreground">{formatRupiah(poCommitted)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Finance Tab */}
          {activeTab === "finance" && (
            <div className="space-y-4">
              {/* Budget Breakdown */}
              <div className="glass-card rounded-lg p-4 shadow-card">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> Budget Breakdown</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <div className="bg-primary/5 rounded-lg p-3 border border-primary/20 text-center">
                    <p className="text-[9px] text-muted-foreground uppercase">Contract Value</p>
                    <p className="text-sm font-bold font-mono-data text-primary">{formatRupiah(contractValue)}</p>
                  </div>
                  <div className="bg-info/5 rounded-lg p-3 border border-info/20 text-center">
                    <p className="text-[9px] text-muted-foreground uppercase">RAP Budget</p>
                    <p className="text-sm font-bold font-mono-data text-info">{formatRupiah(project.rap)}</p>
                  </div>
                  <div className="bg-warning/5 rounded-lg p-3 border border-warning/20 text-center">
                    <p className="text-[9px] text-muted-foreground uppercase">PO Committed</p>
                    <p className="text-sm font-bold font-mono-data text-warning">{formatRupiah(poCommitted)}</p>
                  </div>
                  <div className="bg-destructive/5 rounded-lg p-3 border border-destructive/20 text-center">
                    <p className="text-[9px] text-muted-foreground uppercase">Actual Cost</p>
                    <p className="text-sm font-bold font-mono-data text-destructive">{formatRupiah(actualCost)}</p>
                  </div>
                  <div className={`rounded-lg p-3 border text-center ${remainingBudget > 0 ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20"}`}>
                    <p className="text-[9px] text-muted-foreground uppercase">Remaining</p>
                    <p className={`text-sm font-bold font-mono-data ${remainingBudget > 0 ? "text-success" : "text-destructive"}`}>{formatRupiah(remainingBudget)}</p>
                  </div>
                </div>
              </div>

              {/* Margin Calculation */}
              <div className="glass-card rounded-lg p-4 shadow-card">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-accent" /> Margin Calculation
                    {project.margin_locked && <span className="text-[9px] px-2 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/30 flex items-center gap-1"><Lock className="h-2.5 w-2.5" />Locked (Admin)</span>}
                  </h3>
                  <button
                    onClick={async () => {
                      const newVal = !project.margin_locked;
                      await supabase.from("projects").update({ margin_locked: newVal }).eq("id", project.id);
                      await supabase.from("activity_logs").insert({ action: newVal ? "margin_locked" : "margin_unlocked", entity_type: "project", entity_id: project.id, project_id: project.id, details: `Margin ${newVal ? "locked" : "unlocked"} by admin` });
                      window.location.reload();
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-medium border transition-colors ${project.margin_locked ? "bg-warning/15 text-warning border-warning/30 hover:bg-warning/25" : "bg-success/15 text-success border-success/30 hover:bg-success/25"}`}
                  >
                    <Lock className="h-3 w-3" /> {project.margin_locked ? "Unlock Margin" : "Lock Margin"}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                    <p className="text-[9px] text-muted-foreground uppercase mb-1">Planned Margin (Contract - RAP)</p>
                    <p className={`text-lg font-bold font-mono-data ${plannedMarginPct > 0 ? "text-success" : "text-destructive"}`}>{plannedMarginPct}%</p>
                    <p className="text-[10px] text-muted-foreground">{formatRupiah(plannedMargin)}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                    <p className="text-[9px] text-muted-foreground uppercase mb-1">Committed Margin (Contract - PO)</p>
                    <p className={`text-lg font-bold font-mono-data ${committedMarginPct > 10 ? "text-success" : committedMarginPct > 0 ? "text-warning" : "text-destructive"}`}>{committedMarginPct}%</p>
                    <p className="text-[10px] text-muted-foreground">{formatRupiah(committedMargin)}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                    <p className="text-[9px] text-muted-foreground uppercase mb-1">Actual Margin (Contract - Actual)</p>
                    <p className={`text-lg font-bold font-mono-data ${actualMarginPct > 10 ? "text-success" : actualMarginPct > 0 ? "text-warning" : "text-destructive"}`}>{actualMarginPct}%</p>
                    <p className="text-[10px] text-muted-foreground">{formatRupiah(actualMargin)}</p>
                  </div>
                </div>
              </div>

              {/* Cashflow Chart */}
              {cashflowData.length > 0 && (
                <div className="glass-card rounded-lg p-4 shadow-card">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Cashflow & Progress</h3>
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cashflowData.map(c => ({ ...c, net: c.cash_in - c.cash_out }))}>
                        <defs>
                          <linearGradient id="cfIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(145,60%,45%)" stopOpacity={0.3} /><stop offset="100%" stopColor="hsl(145,60%,45%)" stopOpacity={0} /></linearGradient>
                          <linearGradient id="cfOut" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(0,70%,50%)" stopOpacity={0.3} /><stop offset="100%" stopColor="hsl(0,70%,50%)" stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                        <XAxis dataKey="period_label" tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <RTooltip contentStyle={chartTooltip} />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: "10px" }} />
                        <Area type="monotone" dataKey="cash_in" stroke="hsl(145,60%,45%)" fill="url(#cfIn)" strokeWidth={2} name="Cash In" />
                        <Area type="monotone" dataKey="cash_out" stroke="hsl(0,70%,50%)" fill="url(#cfOut)" strokeWidth={2} name="Cash Out" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Purchase Orders */}
              <div className="glass-card rounded-lg shadow-card overflow-hidden">
                <div className="p-3 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /> Purchase Orders ({purchaseOrders.length})</h3>
                </div>
                {purchaseOrders.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-xs">
                    Belum ada PO. Tambahkan melalui <Link to="/data-entry" className="text-primary hover:underline">Data Entry</Link>.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="bg-muted/50 border-b border-border">
                        <th className="text-left py-2 px-3 text-[9px] uppercase text-muted-foreground">Description</th>
                        <th className="text-left py-2 px-3 text-[9px] uppercase text-muted-foreground">Vendor</th>
                        <th className="text-right py-2 px-3 text-[9px] uppercase text-muted-foreground">Amount</th>
                        <th className="text-center py-2 px-3 text-[9px] uppercase text-muted-foreground">PO Date</th>
                        <th className="text-left py-2 px-3 text-[9px] uppercase text-muted-foreground">Activity</th>
                        <th className="text-right py-2 px-3 text-[9px] uppercase text-muted-foreground">Penalty</th>
                        <th className="text-center py-2 px-3 text-[9px] uppercase text-muted-foreground">Category</th>
                      </tr></thead>
                      <tbody>
                        {purchaseOrders.map(po => (
                          <tr key={po.id} className="border-b border-border/30">
                            <td className="py-2 px-3 font-medium text-foreground">{po.description}</td>
                            <td className="py-2 px-3 text-muted-foreground">{po.vendor || "—"}</td>
                            <td className="py-2 px-3 text-right font-mono-data text-accent">{formatRupiah(po.amount)}</td>
                            <td className="py-2 px-3 text-center font-mono-data text-muted-foreground">{po.po_date ? new Date(po.po_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" }) : "—"}</td>
                            <td className="py-2 px-3 text-muted-foreground">{po.related_activity || "—"}</td>
                            <td className="py-2 px-3 text-right font-mono-data">{(po as any).penalty_amount > 0 ? <span className="text-destructive" title={(po as any).penalty_note || ""}>{formatRupiah((po as any).penalty_amount)}</span> : <span className="text-muted-foreground">—</span>}</td>
                            <td className="py-2 px-3 text-center"><span className="text-[9px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">{po.category}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
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
                  <p className={`text-lg font-bold font-mono-data ${cpi >= 0.95 ? "text-success" : cpi >= 0.8 ? "text-warning" : "text-destructive"}`}>{cpi.toFixed(2)}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">RAP vs Actual</p>
                  <p className={`text-lg font-bold font-mono-data ${project.rap > 0 && actualCost <= project.rap ? "text-success" : "text-destructive"}`}>
                    {project.rap > 0 ? `${Math.round((actualCost / project.rap) * 100)}%` : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* WBS Tab */}
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
                                        <span className="text-muted-foreground"><span className="font-mono-data font-bold text-foreground">{Number(item.qty_completed).toLocaleString()}</span>/{Number(item.qty_total).toLocaleString()} {item.unit}</span>
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
                            <div className={`absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 ${ms.status === "completed" ? "bg-success border-success" : ms.status === "in-progress" ? "bg-primary border-primary" : isLate ? "bg-destructive border-destructive" : "bg-muted border-border"}`} />
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

          {/* Procurement Tab */}
          {activeTab === "procurement" && (
            <div className="space-y-3">
              {procurementItems.length === 0 ? (
                <div className="glass-card rounded-lg p-8 text-center shadow-card">
                  <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Belum ada data procurement.</p>
                  <p className="text-xs text-muted-foreground mt-1">Tambah melalui <Link to="/data-entry" className="text-primary hover:underline">Data Entry</Link>.</p>
                </div>
              ) : (
                <>
                  <div className="glass-card rounded-lg p-3 shadow-card">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-primary/5 rounded-lg p-3 border border-primary/20 text-center">
                        <p className="text-[9px] text-muted-foreground uppercase">Total Items</p>
                        <p className="text-lg font-bold font-mono-data text-primary">{procurementItems.length}</p>
                      </div>
                      <div className="bg-success/5 rounded-lg p-3 border border-success/20 text-center">
                        <p className="text-[9px] text-muted-foreground uppercase">Installed</p>
                        <p className="text-lg font-bold font-mono-data text-success">{procurementItems.filter(i => i.status === 'installed').length}</p>
                      </div>
                      <div className="bg-warning/5 rounded-lg p-3 border border-warning/20 text-center">
                        <p className="text-[9px] text-muted-foreground uppercase">In Progress</p>
                        <p className="text-lg font-bold font-mono-data text-warning">{procurementItems.filter(i => !['installed','planned'].includes(i.status)).length}</p>
                      </div>
                      <div className="bg-accent/5 rounded-lg p-3 border border-border text-center">
                        <p className="text-[9px] text-muted-foreground uppercase">Total Cost</p>
                        <p className="text-lg font-bold font-mono-data text-foreground">{formatRupiah(procurementItems.reduce((s, i) => s + i.amount, 0))}</p>
                      </div>
                    </div>
                  </div>
                  <div className="glass-card rounded-lg shadow-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead><tr className="bg-muted/50 border-b border-border">
                          <th className="text-left py-2 px-3 text-[9px] uppercase text-muted-foreground">Item</th>
                          <th className="text-left py-2 px-3 text-[9px] uppercase text-muted-foreground">Vendor</th>
                          <th className="text-right py-2 px-3 text-[9px] uppercase text-muted-foreground">Amount</th>
                          <th className="text-center py-2 px-3 text-[9px] uppercase text-muted-foreground">Status</th>
                          <th className="text-center py-2 px-3 text-[9px] uppercase text-muted-foreground">RFQ</th>
                          <th className="text-center py-2 px-3 text-[9px] uppercase text-muted-foreground">PO</th>
                          <th className="text-center py-2 px-3 text-[9px] uppercase text-muted-foreground">Delivery</th>
                          <th className="text-center py-2 px-3 text-[9px] uppercase text-muted-foreground">Install</th>
                        </tr></thead>
                        <tbody>
                          {procurementItems.map(item => (
                            <tr key={item.id} className="border-b border-border/30 hover:bg-muted/20">
                              <td className="py-2 px-3"><p className="font-medium text-foreground">{item.item_name}</p>{item.description && <p className="text-[9px] text-muted-foreground">{item.description}</p>}</td>
                              <td className="py-2 px-3 text-muted-foreground">{item.vendor || "—"}</td>
                              <td className="py-2 px-3 text-right font-mono-data text-foreground">{formatRupiah(item.amount)}</td>
                              <td className="py-2 px-3 text-center"><span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${procStatusColors[item.status] || ""}`}>{procStatusLabels[item.status] || item.status}</span></td>
                              {["rfq_date","po_date","delivery_date","install_date"].map(field => (
                                <td key={field} className="py-2 px-3 text-center text-[9px] font-mono-data text-muted-foreground">
                                  {(item as any)[field] ? new Date((item as any)[field]).toLocaleDateString("id-ID", {day:"numeric",month:"short"}) : "—"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Risks Tab */}
          {activeTab === "risks" && (
            <div className="space-y-3">
              {projectRisks.length === 0 ? (
                <div className="glass-card rounded-lg p-8 text-center shadow-card"><Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">Tidak ada risiko tercatat.</p></div>
              ) : (
                <>
                  <div className="glass-card rounded-lg p-3 shadow-card">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-destructive/5 rounded-lg p-3 border border-destructive/20 text-center"><p className="text-[9px] text-muted-foreground uppercase">Active</p><p className="text-lg font-bold font-mono-data text-destructive">{projectRisks.filter(r => !r.is_resolved).length}</p></div>
                      <div className="bg-success/5 rounded-lg p-3 border border-success/20 text-center"><p className="text-[9px] text-muted-foreground uppercase">Resolved</p><p className="text-lg font-bold font-mono-data text-success">{projectRisks.filter(r => r.is_resolved).length}</p></div>
                      <div className="bg-warning/5 rounded-lg p-3 border border-warning/20 text-center"><p className="text-[9px] text-muted-foreground uppercase">Critical/High</p><p className="text-lg font-bold font-mono-data text-warning">{projectRisks.filter(r => !r.is_resolved && (r.severity === 'critical' || r.severity === 'high')).length}</p></div>
                      <div className="bg-muted rounded-lg p-3 border border-border text-center"><p className="text-[9px] text-muted-foreground uppercase">Total</p><p className="text-lg font-bold font-mono-data text-foreground">{projectRisks.length}</p></div>
                    </div>
                  </div>
                  <div className="glass-card rounded-lg shadow-card overflow-hidden">
                    <div className="divide-y divide-border/30">
                      {projectRisks.map(risk => {
                        const sevColor = risk.severity === "critical" ? "text-destructive" : risk.severity === "high" ? "text-warning" : risk.severity === "medium" ? "text-info" : "text-muted-foreground";
                        const duration = risk.is_resolved && risk.resolved_at
                          ? Math.ceil((new Date(risk.resolved_at).getTime() - new Date(risk.created_at).getTime()) / (1000*60*60*24))
                          : Math.ceil((new Date().getTime() - new Date(risk.created_at).getTime()) / (1000*60*60*24));
                        return (
                          <div key={risk.id} className={`p-3 hover:bg-muted/20 ${risk.is_resolved ? "opacity-60" : ""}`}>
                            <div className="flex items-start gap-3">
                              <AlertTriangle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${sevColor}`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-medium text-foreground">{risk.title}</span>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${sevColor}`}>{risk.severity}</span>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{riskCategoryLabels[risk.category] || risk.category}</span>
                                  {risk.is_resolved && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-success/15 text-success font-medium">✓ Resolved</span>}
                                </div>
                                {risk.description && <p className="text-[10px] text-muted-foreground mt-0.5">{risk.description}</p>}
                                <div className="flex items-center gap-4 mt-1 text-[9px] text-muted-foreground flex-wrap">
                                  <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> Created: {new Date(risk.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                                  {risk.due_date && <span className="flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" /> Due: {new Date(risk.due_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>}
                                  {risk.is_resolved && risk.resolved_at && (
                                    <span className="flex items-center gap-0.5 text-success"><CheckCircle2 className="h-2.5 w-2.5" /> Resolved: {new Date(risk.resolved_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                                  )}
                                  <span>Duration: <span className="font-mono-data font-bold text-foreground">{duration}d</span></span>
                                  {risk.risk_owner && <span>Owner: <span className="font-medium text-foreground">{risk.risk_owner}</span></span>}
                                </div>
                                {risk.mitigation_plan && <p className="text-[10px] text-primary mt-1">💡 Mitigation: {risk.mitigation_plan}</p>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Media Tab */}
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
              {activeMedia === "weekly" && (
                <div>
                  {weeklyPhotos.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Camera className="h-10 w-10 mx-auto mb-3" />
                      <p className="text-sm">Belum ada foto progress mingguan.</p>
                      <p className="text-xs mt-1">Upload melalui <Link to="/data-entry" className="text-primary hover:underline">Data Entry</Link></p>
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
                              <div key={p.id} className="rounded-lg overflow-hidden border border-border group cursor-pointer" onClick={() => window.open(p.photo_url, '_blank')}>
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
              {activeMedia === "video" && project.video_url && (
                <div>
                  {videoThumbnail ? (
                    <div className="relative rounded-lg overflow-hidden border border-border cursor-pointer group" onClick={() => window.open(project.video_url!, '_blank')}>
                      <img src={videoThumbnail} alt="Video" className="w-full max-h-[400px] object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                        <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                          <div className="w-0 h-0 border-l-[20px] border-l-primary border-y-[12px] border-y-transparent ml-1" />
                        </div>
                      </div>
                      <div className="absolute bottom-3 left-3 flex items-center gap-2"><ExternalLink className="h-4 w-4 text-white" /><span className="text-xs text-white font-medium">Buka di YouTube</span></div>
                    </div>
                  ) : (
                    <a href={project.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <Video className="h-8 w-8 text-primary" /><div><p className="text-sm font-medium text-foreground">Buka Video</p><p className="text-[10px] text-muted-foreground truncate max-w-md">{project.video_url}</p></div><ExternalLink className="h-4 w-4 text-muted-foreground ml-auto" />
                    </a>
                  )}
                </div>
              )}
              {activeMedia === "cctv" && project.cctv_url && (
                <a href={project.cctv_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-5 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div className="relative"><Cctv className="h-10 w-10 text-destructive" /><span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" /><span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" /></span></div>
                  <div><p className="text-sm font-medium text-foreground flex items-center gap-2">CCTV Live Stream<span className="text-[9px] px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive font-medium border border-destructive/30">LIVE</span></p><p className="text-[10px] text-muted-foreground truncate max-w-md mt-0.5">{project.cctv_url}</p></div>
                  <ExternalLink className="h-5 w-5 text-muted-foreground ml-auto" />
                </a>
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
