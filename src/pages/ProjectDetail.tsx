import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useProject, useWorkAreas, useWorkItems, useSubTasks, useMilestones, useAlerts, useAllAlerts, useSCurveData, useProcurementItems, usePurchaseOrders, useProjectCashflow, useFinanceEntries } from "@/hooks/useProjects";
import { supabase, formatRupiah, FINANCE_CATEGORIES, resolveImageUrl } from "@/lib/supabase";
import { Progress } from "@/components/ui/progress";
import { SCurveChart } from "@/components/dashboard/SCurveChart";
import { FormulaTooltip, FORMULAS } from "@/components/dashboard/FormulaTooltip";
import { WeeklyReportView } from "@/components/dashboard/WeeklyReportView";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, AreaChart, Area, Legend, ReferenceLine, ComposedChart, Line } from "recharts";
import {
  ChevronLeft, ChevronDown, ChevronRight, MapPin, User, Calendar, Briefcase,
  Camera, Video, Cctv, CheckCircle2, Clock, AlertTriangle, Target, Layers,
  Minus, Share2, Shield, TrendingUp, Activity, ExternalLink, Image as ImageIcon,
  Package, DollarSign, Wallet, Receipt, Lock, FileText
} from "lucide-react";

import { getStatusMeta } from "@/lib/supabase";

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

const phaseLabels: Record<string, string> = { "Production I": "PI", "Production II": "PII", "Production III": "PIII", "Production IV": "PIV", "Engineering": "E", "Procurement": "P", "Construction": "C", "Commissioning": "Co" };
const EPC_PHASES = ["Production I", "Production II", "Production III", "Production IV"] as const;

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { isClient } = useAuth();
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
  const { data: financeEntries = [] } = useFinanceEntries(id);

  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [activeMedia, setActiveMedia] = useState<MediaTab>("weekly");
  const [activeTab, setActiveTab] = useState<MainTab>("health");
  const [epcFilter, setEpcFilter] = useState<string>("all");

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

  const st = getStatusMeta(project.status);
  const contractValue = project.contract_value || project.budget;
  const poCommitted = purchaseOrders.reduce((s, po) => s + po.amount, 0);
  const actualCost = project.spent;
  const remainingBudget = project.budget - actualCost;

  // Actual Cash Out (from finance entries — used for CPI, budget utilization and margins)
  const actualCashOutTotal = financeEntries
    .filter(fe => fe.direction === "out" && fe.entry_kind === "actual")
    .reduce((s, fe) => s + (Number(fe.amount) || 0), 0);
  const rapValue = project.rap || 0;
  // Utilisasi RAP: Actual Cash Out / RAP
  const budgetPct = rapValue > 0 ? Math.round((actualCashOutTotal / rapValue) * 100) : 0;

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
  // CPI berdasarkan Actual Cash Out vs RAP (bukan Budget/Contract)
  const cpi = actualCashOutTotal > 0 && rapValue > 0 ? ((project.progress / 100) * rapValue) / actualCashOutTotal : 1;
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
                <img src={resolveImageUrl(project.image_url)} alt={project.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono-data text-primary bg-card/80 backdrop-blur px-2 py-0.5 rounded">{project.project_code}</span>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${st.className}`}>{st.label}</span>
                  <span className="text-[10px] text-muted-foreground bg-card/80 backdrop-blur px-2 py-0.5 rounded">{project.phase}</span>
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
            {(([
              { key: "health" as const, label: "Health", icon: Activity, publicOk: true },
              { key: "finance" as const, label: "Finance", icon: Wallet, publicOk: false },
              { key: "scurve" as const, label: "S-Curve", icon: TrendingUp, publicOk: true },
              { key: "wbs" as const, label: `WBS (${workAreas.length})`, icon: Layers, publicOk: true },
              { key: "procurement" as const, label: `Procurement (${procurementItems.length})`, icon: Package, publicOk: false },
              { key: "risks" as const, label: `Risks (${projectRisks.length})`, icon: AlertTriangle, publicOk: false },
              { key: "milestones" as const, label: `Milestones (${milestones.length})`, icon: Target, publicOk: true },
              { key: "weekly-report" as const, label: "Weekly Report", icon: FileText, publicOk: false },
              { key: "media" as const, label: "Media", icon: Camera, publicOk: true },
            ]).filter(t => !isClient || t.publicOk)).map(tab => (
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
                  <p className="text-[10px] text-muted-foreground">{formatRupiah(actualCashOutTotal)} / {formatRupiah(rapValue)} RAP</p>
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
                        <span className="text-muted-foreground flex items-center">Actual Cash Out vs RAP<FormulaTooltip {...FORMULAS.budgetUtil} /></span>
                        <span className={`font-mono-data font-bold ${budgetPct > 95 ? "text-destructive" : budgetPct > 85 ? "text-warning" : "text-foreground"}`}>{budgetPct}%</span>
                      </div>
                      <Progress value={Math.min(100, budgetPct)} className="h-2" />
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
                  {(() => {
                    const actualCashOut = financeEntries
                      .filter(fe => fe.direction === "out" && fe.entry_kind === "actual")
                      .reduce((s, fe) => s + (Number(fe.amount) || 0), 0);
                    const rapValue = project.rap || 0;
                    const remainingRap = rapValue - actualCashOut;
                    return (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase mb-1">Contract Value</p>
                          <p className="text-lg font-bold font-mono-data text-primary">{formatRupiah(contractValue)}</p>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase mb-1">RAP</p>
                          <p className="text-lg font-bold font-mono-data text-info">{formatRupiah(rapValue)}</p>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase mb-1">Actual Cash Out</p>
                          <p className="text-lg font-bold font-mono-data text-destructive">{formatRupiah(actualCashOut)}</p>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase mb-1">Remaining (RAP − Actual)</p>
                          <p className={`text-lg font-bold font-mono-data ${remainingRap >= 0 ? "text-success" : "text-destructive"}`}>{formatRupiah(remainingRap)}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Finance Tab */}
          {activeTab === "finance" && (
            <div className="space-y-4">


              {/* (Cost Breakdown is rendered first) */}

              {/* === Cost Breakdown by Category === */}
              {(() => {
                const rows = FINANCE_CATEGORIES.map(c => {
                  let rap = 0, actual = 0;
                  financeEntries.forEach(fe => {
                    if (fe.direction !== "out" || fe.category !== c.value) return;
                    const amt = Number(fe.amount) || 0;
                    if (fe.entry_kind === "rap") rap += amt;
                    if (fe.entry_kind === "actual") actual += amt;
                  });
                  return { key: c.value, label: c.label, rap, actual, variance: rap - actual, pct: rap > 0 ? Math.round((actual / rap) * 100) : 0 };
                }).filter(r => r.rap > 0 || r.actual > 0).sort((a, b) => (b.rap + b.actual) - (a.rap + a.actual));
                if (rows.length === 0) return null;
                const totalRap = rows.reduce((s, r) => s + r.rap, 0);
                const totalAct = rows.reduce((s, r) => s + r.actual, 0);
                return (
                  <div className="glass-card rounded-lg p-4 shadow-card">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Receipt className="h-4 w-4 text-accent" /> Cost Breakdown per Kategori</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead><tr className="bg-muted/50 border-b border-border">
                            <th className="text-left py-2 px-2 text-[9px] uppercase text-muted-foreground">Kategori</th>
                            <th className="text-right py-2 px-2 text-[9px] uppercase text-muted-foreground">RAP</th>
                            <th className="text-right py-2 px-2 text-[9px] uppercase text-muted-foreground">Actual</th>
                            <th className="text-right py-2 px-2 text-[9px] uppercase text-muted-foreground">Variance</th>
                            <th className="text-right py-2 px-2 text-[9px] uppercase text-muted-foreground">%</th>
                          </tr></thead>
                          <tbody>
                            {rows.map(r => (
                              <tr key={r.key} className="border-b border-border/30 hover:bg-muted/20">
                                <td className="py-1.5 px-2 text-foreground">{r.label}</td>
                                <td className="py-1.5 px-2 text-right font-mono-data text-info">{formatRupiah(r.rap)}</td>
                                <td className="py-1.5 px-2 text-right font-mono-data text-destructive">{formatRupiah(r.actual)}</td>
                                <td className={`py-1.5 px-2 text-right font-mono-data ${r.variance >= 0 ? "text-success" : "text-destructive"}`}>{formatRupiah(r.variance)}</td>
                                <td className={`py-1.5 px-2 text-right font-mono-data ${r.pct > 100 ? "text-destructive" : r.pct > 85 ? "text-warning" : "text-success"}`}>{r.pct}%</td>
                              </tr>
                            ))}
                            <tr className="bg-muted/40 font-bold">
                              <td className="py-2 px-2 text-foreground">TOTAL</td>
                              <td className="py-2 px-2 text-right font-mono-data text-info">{formatRupiah(totalRap)}</td>
                              <td className="py-2 px-2 text-right font-mono-data text-destructive">{formatRupiah(totalAct)}</td>
                              <td className={`py-2 px-2 text-right font-mono-data ${totalRap - totalAct >= 0 ? "text-success" : "text-destructive"}`}>{formatRupiah(totalRap - totalAct)}</td>
                              <td className={`py-2 px-2 text-right font-mono-data ${totalRap > 0 && (totalAct / totalRap) > 1 ? "text-destructive" : "text-foreground"}`}>{totalRap > 0 ? Math.round((totalAct/totalRap)*100) : 0}%</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="h-[340px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 8 }} barCategoryGap={8}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 92%)" horizontal={false} />
                            <XAxis type="number" tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 10 }} tickFormatter={(v: number) => formatRupiah(v)} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="label" tick={{ fill: "hsl(215, 15%, 30%)", fontSize: 10 }} width={140} axisLine={false} tickLine={false} />
                            <RTooltip contentStyle={chartTooltip} formatter={(v: number) => formatRupiah(v)} cursor={{ fill: "hsl(215, 30%, 95%)" }} />
                            <Legend iconSize={10} wrapperStyle={{ fontSize: "11px", paddingTop: 4 }} />
                            <Bar dataKey="rap" fill="hsl(215, 80%, 55%)" name="RAP" radius={[0,4,4,0]} barSize={12} />
                            <Bar dataKey="actual" fill="hsl(0, 70%, 55%)" name="Actual" radius={[0,4,4,0]} barSize={12} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* === Cashflow Bipolar Bar Chart (Cash In ↑ / Cash Out ↓) === */}
              {(() => {
                const map: Record<string, { label: string; order: number; planIn: number; actIn: number; planOut: number; actOut: number }> = {};
                financeEntries.forEach(fe => {
                  const key = fe.period_label || fe.period_date;
                  if (!map[key]) map[key] = { label: key, order: new Date(fe.period_date).getTime(), planIn: 0, actIn: 0, planOut: 0, actOut: 0 };
                  const isPlan = fe.entry_kind === "rap" || fe.entry_kind === "forecast";
                  const isAct = fe.entry_kind === "actual";
                  const amt = Number(fe.amount) || 0;
                  if (fe.direction === "in" && isPlan) map[key].planIn += amt;
                  if (fe.direction === "in" && isAct) map[key].actIn += amt;
                  if (fe.direction === "out" && isPlan) map[key].planOut += amt;
                  if (fe.direction === "out" && isAct) map[key].actOut += amt;
                });
                const bipolar = Object.values(map).sort((a, b) => a.order - b.order).map(r => ({
                  label: r.label,
                  "Plan Cash In": r.planIn,
                  "Actual Cash In": r.actIn,
                  "Plan Cash Out": -r.planOut,
                  "Actual Cash Out": -r.actOut,
                }));
                if (bipolar.length === 0) return null;
                return (
                  <div className="glass-card rounded-lg p-4 shadow-card">
                    <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" /> Cashflow & Progress — Plan vs Actual
                    </h3>
                    <p className="text-[10px] text-muted-foreground mb-3">Bar ke atas = Cash In (positif) · Bar ke bawah = Cash Out (negatif).</p>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={bipolar} stackOffset="sign" margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                          <XAxis dataKey="label" tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatRupiah(Math.abs(v))} />
                          <RTooltip contentStyle={chartTooltip} formatter={(v: number) => formatRupiah(Math.abs(v))} />
                          <Legend iconSize={10} wrapperStyle={{ fontSize: "11px" }} />
                          <ReferenceLine y={0} stroke="hsl(215, 15%, 30%)" />
                          <Bar dataKey="Plan Cash In" fill="hsl(145, 40%, 65%)" radius={[3,3,0,0]} />
                          <Bar dataKey="Actual Cash In" fill="hsl(145, 65%, 40%)" radius={[3,3,0,0]} />
                          <Bar dataKey="Plan Cash Out" fill="hsl(15, 40%, 70%)" radius={[0,0,3,3]} />
                          <Bar dataKey="Actual Cash Out" fill="hsl(0, 70%, 50%)" radius={[0,0,3,3]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })()}

              {/* === Progress vs Cashflow Summary per Periode === */}
              {(() => {
                // Unified period set = ALL financeEntries (same as Cashflow & Progress card)
                const periodMap: Record<string, { label: string; order: number; cashIn: number; cashOut: number; planIn: number; planOut: number }> = {};
                financeEntries.forEach(fe => {
                  const key = fe.period_label || fe.period_date;
                  if (!periodMap[key]) periodMap[key] = { label: key, order: new Date(fe.period_date).getTime(), cashIn: 0, cashOut: 0, planIn: 0, planOut: 0 };
                  const amt = Number(fe.amount) || 0;
                  const isPlan = fe.entry_kind === "rap" || fe.entry_kind === "forecast";
                  if (fe.entry_kind === "actual") {
                    if (fe.direction === "in") periodMap[key].cashIn += amt;
                    else periodMap[key].cashOut += amt;
                  } else if (isPlan) {
                    if (fe.direction === "in") periodMap[key].planIn += amt;
                    else periodMap[key].planOut += amt;
                  }
                });
                const periodList = Object.values(periodMap).sort((a, b) => a.order - b.order);
                if (periodList.length === 0) return null;

                // Lookup progress from S-Curve; if missing, interpolate linearly by date
                const scurveByLabel: Record<string, { plan: number | null; actual: number | null }> = {};
                scurveData.forEach(s => {
                  const k = s.period_label;
                  if (!scurveByLabel[k]) scurveByLabel[k] = { plan: null, actual: null };
                  if (s.planned_progress != null) scurveByLabel[k].plan = Number(s.planned_progress);
                  if (s.actual_progress != null) scurveByLabel[k].actual = Number(s.actual_progress);
                });
                const startT = new Date(project.start_date).getTime();
                const endT = new Date(project.end_date).getTime();
                const todayT = Date.now();
                const interpPlan = (t: number) => endT > startT ? Math.max(0, Math.min(100, Math.round(((t - startT) / (endT - startT)) * 100))) : 0;

                const rows = periodList.map(p => {
                  const sc = scurveByLabel[p.label];
                  const planPct = sc?.plan ?? interpPlan(p.order);
                  const isPast = p.order <= todayT;
                  const actPct = sc?.actual != null ? sc.actual : (isPast ? project.progress : null);
                  return {
                    label: p.label,
                    planPct: Number(planPct),
                    actPct: actPct == null ? null : Number(actPct),
                    cashIn: p.cashIn,
                    cashOut: p.cashOut,
                    planIn: p.planIn,
                    planOut: p.planOut,
                  };
                });

                return (
                  <div className="glass-card rounded-lg p-4 shadow-card">
                    <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Progress vs Cashflow per Periode</h3>
                    <p className="text-[10px] text-muted-foreground mb-3">Plan % & Actual % diambil dari S-Curve. Periode & proyeksi mengikuti card Cashflow & Progress hingga proyek selesai.</p>
                    <div className="h-[280px] mb-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                          <XAxis dataKey="label" tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 10 }} />
                          <YAxis yAxisId="left" orientation="left" tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 9 }} tickFormatter={(v: number) => formatRupiah(v)} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} domain={[0, 100]} />
                          <RTooltip contentStyle={chartTooltip} formatter={(v: number, name: string) => name.includes("%") ? `${Number(v).toFixed(1)}%` : formatRupiah(v)} />
                          <Legend iconSize={10} wrapperStyle={{ fontSize: "11px" }} />
                          <Bar yAxisId="left" dataKey="planIn" name="Plan Cash In" fill="hsl(145, 40%, 75%)" radius={[3,3,0,0]} />
                          <Bar yAxisId="left" dataKey="cashIn" name="Actual Cash In" fill="hsl(145, 65%, 45%)" radius={[3,3,0,0]} />
                          <Bar yAxisId="left" dataKey="planOut" name="Plan Cash Out" fill="hsl(15, 40%, 78%)" radius={[3,3,0,0]} />
                          <Bar yAxisId="left" dataKey="cashOut" name="Actual Cash Out" fill="hsl(0, 70%, 55%)" radius={[3,3,0,0]} />
                          <Line yAxisId="right" type="monotone" dataKey="planPct" name="Plan %" stroke="hsl(215, 80%, 48%)" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} connectNulls />
                          <Line yAxisId="right" type="monotone" dataKey="actPct" name="Actual %" stroke="hsl(30, 85%, 50%)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead><tr className="bg-muted/50 border-b border-border">
                          <th className="text-left py-2 px-2 text-[9px] uppercase text-muted-foreground">Periode</th>
                          <th className="text-right py-2 px-2 text-[9px] uppercase text-muted-foreground">Plan %</th>
                          <th className="text-right py-2 px-2 text-[9px] uppercase text-muted-foreground">Actual %</th>
                          <th className="text-right py-2 px-2 text-[9px] uppercase text-muted-foreground">Deviasi</th>
                          <th className="text-right py-2 px-2 text-[9px] uppercase text-muted-foreground">Cash In</th>
                          <th className="text-right py-2 px-2 text-[9px] uppercase text-muted-foreground">Cash Out</th>
                          <th className="text-right py-2 px-2 text-[9px] uppercase text-muted-foreground">Net</th>
                        </tr></thead>
                        <tbody>
                          {rows.map(r => {
                            const dev = (r.actPct ?? 0) - r.planPct;
                            return (
                            <tr key={r.label} className="border-b border-border/30 hover:bg-muted/20">
                              <td className="py-1.5 px-2 text-foreground">{r.label}</td>
                              <td className="py-1.5 px-2 text-right font-mono-data text-info">{r.planPct.toFixed(1)}%</td>
                              <td className="py-1.5 px-2 text-right font-mono-data text-warning">{r.actPct == null ? "—" : `${r.actPct.toFixed(1)}%`}</td>
                              <td className={`py-1.5 px-2 text-right font-mono-data ${r.actPct == null ? "text-muted-foreground" : dev >= 0 ? "text-success" : "text-destructive"}`}>{r.actPct == null ? "—" : `${dev > 0 ? "+" : ""}${dev.toFixed(1)}%`}</td>
                              <td className="py-1.5 px-2 text-right font-mono-data text-success">{formatRupiah(r.cashIn)}</td>
                              <td className="py-1.5 px-2 text-right font-mono-data text-destructive">{formatRupiah(r.cashOut)}</td>
                              <td className={`py-1.5 px-2 text-right font-mono-data ${(r.cashIn - r.cashOut) >= 0 ? "text-success" : "text-destructive"}`}>{formatRupiah(r.cashIn - r.cashOut)}</td>
                            </tr>
                          );})}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* S-Curve Tab */}
          {activeTab === "scurve" && (
            <div className="space-y-4">
              <div className="glass-card rounded-lg shadow-card p-4">
                <h3 className="text-sm font-bold text-foreground mb-1">S-Curve — Planned vs Actual Progress</h3>
                <p className="text-[10px] text-muted-foreground mb-3">Data S-Curve dapat diedit melalui Data Entry → S-Curve Editor.</p>
                <SCurveChart
                  startDate={project.start_date}
                  endDate={project.end_date}
                  progress={project.progress}
                  milestones={milestones}
                  customData={scurveData.length > 0 ? scurveData : undefined}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase mb-1 flex items-center justify-center gap-1">SPI<FormulaTooltip {...FORMULAS.spi} /></p>
                    <p className={`text-lg font-bold font-mono-data ${elapsedPct > 0 ? (project.progress / elapsedPct >= 0.95 ? "text-success" : project.progress / elapsedPct >= 0.8 ? "text-warning" : "text-destructive") : "text-foreground"}`}>
                      {elapsedPct > 0 ? (project.progress / elapsedPct).toFixed(2) : "N/A"}
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase mb-1">Deviasi Progress</p>
                    <p className={`text-lg font-bold font-mono-data ${project.progress - elapsedPct >= 0 ? "text-success" : "text-destructive"}`}>
                      {project.progress - elapsedPct > 0 ? "+" : ""}{project.progress - elapsedPct}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Last 3 Reporting Periods Summary — dedicated card */}
              {(() => {
                const today = new Date();
                const rows = scurveData
                  .filter(s => (s.curve_type === "planned" || s.curve_type === "actual" || s.curve_type === "monthly" || s.curve_type === "weekly"))
                  .reduce((acc: Record<string, { label: string; order: number; date: number; plan: number | null; actual: number | null }>, s) => {
                    const key = s.period_label;
                    const d = (s as any).period_date ? new Date((s as any).period_date).getTime() : s.period_order;
                    if (!acc[key]) acc[key] = { label: key, order: s.period_order, date: d, plan: null, actual: null };
                    if (s.curve_type === "planned" || s.curve_type === "monthly") acc[key].plan = Number(s.planned_progress ?? acc[key].plan ?? 0);
                    if (s.curve_type === "actual" || s.curve_type === "monthly") acc[key].actual = s.actual_progress != null ? Number(s.actual_progress) : acc[key].actual;
                    return acc;
                  }, {});
                const list = Object.values(rows)
                  .filter(r => !r.date || r.date <= today.getTime())
                  .sort((a, b) => (b.date || b.order) - (a.date || a.order))
                  .slice(0, 4)
                  .reverse();
                if (list.length === 0) return null;
                return (
                  <div className="glass-card rounded-lg shadow-card p-4">
                    <h3 className="text-sm font-bold text-foreground mb-1 flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Ringkasan Periode Pelaporan</h3>
                    <p className="text-[10px] text-muted-foreground mb-3">Periode saat ini dan 3 periode sebelumnya — Planned vs Actual Progress dan deviasinya.</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted/50 border-b border-border">
                            <th className="text-left py-2 px-2 text-[9px] uppercase text-muted-foreground font-bold">Periode</th>
                            <th className="text-right py-2 px-2 text-[9px] uppercase text-muted-foreground font-bold">Planned</th>
                            <th className="text-right py-2 px-2 text-[9px] uppercase text-muted-foreground font-bold">Actual</th>
                            <th className="text-right py-2 px-2 text-[9px] uppercase text-muted-foreground font-bold">Deviasi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.map((r, i) => {
                            const dev = (r.actual ?? 0) - (r.plan ?? 0);
                            const isCurrent = i === list.length - 1;
                            return (
                              <tr key={r.label} className={`border-b border-border/30 hover:bg-muted/20 ${isCurrent ? "bg-primary/5" : ""}`}>
                                <td className="py-2 px-2 text-foreground font-medium">
                                  {r.label}
                                  {isCurrent && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-semibold uppercase">Saat ini</span>}
                                </td>
                                <td className="py-2 px-2 text-right font-mono-data text-info">{r.plan != null ? `${Number(r.plan).toFixed(1)}%` : "—"}</td>
                                <td className="py-2 px-2 text-right font-mono-data text-foreground font-semibold">{r.actual != null ? `${Number(r.actual).toFixed(1)}%` : "—"}</td>
                                <td className={`py-2 px-2 text-right font-mono-data font-semibold ${dev >= 0 ? "text-success" : "text-destructive"}`}>{r.actual == null ? "—" : `${dev > 0 ? "+" : ""}${dev.toFixed(1)}%`}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
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

          {/* Weekly Report Tab */}
          {activeTab === "weekly-report" && id && <WeeklyReportView projectId={id} />}

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
