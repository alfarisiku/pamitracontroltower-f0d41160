import { useState, useEffect, Fragment } from "react";
import { useParams, Link } from "react-router-dom";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useProject, useWorkAreas, useWorkItems, useSubTasks, useMilestones, useAlerts, useAllAlerts, useSCurveData, useProcurementItems, usePurchaseOrders, useProjectCashflow, useFinanceEntries, useAddendums } from "@/hooks/useProjects";
import { useBillings } from "@/components/data-entry/BillingPanel";
import { useHrPersonnel } from "@/components/data-entry/HrPanel";
import { BILLING_STATUSES, BILLING_STATUS_CLASS } from "@/lib/supabase";
import { supabase, formatRupiah, formatIDR, FINANCE_CATEGORIES, resolveImageUrl } from "@/lib/supabase";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SCurveChart } from "@/components/dashboard/SCurveChart";
import { FormulaTooltip, FORMULAS } from "@/components/dashboard/FormulaTooltip";
import { WeeklyReportView } from "@/components/dashboard/WeeklyReportView";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, AreaChart, Area, Legend, ReferenceLine, ComposedChart, Line } from "recharts";
import {
  ChevronLeft, ChevronDown, ChevronRight, MapPin, User, Calendar, Briefcase,
  Camera, Video, Cctv, Box, CheckCircle2, Clock, AlertTriangle, Target, Layers,
  Minus, Share2, Shield, TrendingUp, Activity, ExternalLink, Image as ImageIcon,
  Package, DollarSign, Wallet, Receipt, Lock, FileText
} from "lucide-react";

import { getStatusMeta } from "@/lib/supabase";
import { useDemoLevel } from "@/contexts/DemoLevelContext";


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

type MediaTab = "weekly" | "video" | "cctv" | "model3d";
type MainTab = "health" | "finance" | "scurve" | "wbs" | "milestones" | "procurement" | "risks" | "media" | "weekly-report" | "addendum" | "billing";

const riskCategoryLabels: Record<string, string> = {
  technical: "Technical", schedule: "Schedule", cost: "Cost",
  procurement: "Procurement", contractual: "Contractual", operational: "Operational",
};
const procStatusLabels: Record<string, string> = {
  ded: "DED", bq: "BQ", pr: "PR", rfq: "RFQ", po: "PO", delivery: "Delivery", onsite: "On Site",
  // legacy aliases
  planned: "DED", "rfq-sent": "PR", approval: "RFQ", "po-issued": "PO",
  fabrication: "PO", installed: "On Site",
};

// Procurement pipeline stage badges — semantic tokens only, aligned to dashboard theme.
const procStatusColors: Record<string, string> = {
  ded:        "bg-muted text-muted-foreground border border-border",
  bq:         "bg-muted text-muted-foreground border border-border",
  pr:         "bg-info/10 text-info border border-info/30",
  rfq:        "bg-warning/10 text-warning-foreground border border-warning/30",
  po:         "bg-primary/10 text-primary border border-primary/30",
  delivery:   "bg-accent/10 text-accent border border-accent/30",
  onsite:     "bg-success/10 text-success border border-success/30",
  // legacy aliases
  planned:    "bg-muted text-muted-foreground border border-border",
  "rfq-sent": "bg-info/10 text-info border border-info/30",
  approval:   "bg-warning/10 text-warning-foreground border border-warning/30",
  "po-issued":"bg-primary/10 text-primary border border-primary/30",
  fabrication:"bg-primary/10 text-primary border border-primary/30",
  installed:  "bg-success/10 text-success border border-success/30",
};


// Palette per S-Curve type — plan & actual share the same HUE; distinguish only by dash vs solid.
// Baseline = primary blue, KSO/JO variants cycle through a distinct palette.
const KSO_HUES = ["hsl(280, 65%, 55%)", "hsl(30, 85%, 55%)", "hsl(340, 70%, 55%)"];
function curvePalette(ct: string, idxAmongExtras = 0): { plan: string; actual: string; hue: string } {
  if (ct === "baseline") {
    const hue = "hsl(215, 80%, 48%)";
    return { plan: hue, actual: hue, hue };
  }
  const hue = KSO_HUES[idxAmongExtras % KSO_HUES.length];
  return { plan: hue, actual: hue, hue };
}

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
  const { isClient: authIsClient } = useAuth();
  const { level: demoLevel } = useDemoLevel();
  const L3 = demoLevel === 3;
  const isClient = authIsClient || L3;

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
  const { data: addendums = [] } = useAddendums(id);

  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [expandedTimeline, setExpandedTimeline] = useState<Set<string>>(new Set());
  const [activeMedia, setActiveMedia] = useState<MediaTab>("weekly");
  const [activeTab, setActiveTab] = useState<MainTab>(L3 ? "scurve" : "health");
  const L3_TABS: MainTab[] = ["scurve", "milestones", "wbs", "weekly-report", "media"];
  useEffect(() => {
    if (L3 && !L3_TABS.includes(activeTab)) setActiveTab("scurve");
  }, [L3, activeTab]);

  const [epcFilter, setEpcFilter] = useState<string>("all");
  const { data: billings = [] } = useBillings(id);
  const { data: hrRows = [] } = useHrPersonnel(id);
  const staffCount = hrRows.filter(h => h.category === "staff").reduce((a, h) => a + (h.headcount || 0), 0);
  const manpowerCount = hrRows.filter(h => h.category === "manpower").reduce((a, h) => a + (h.headcount || 0), 0);
  const [cashflowCurve, setCashflowCurve] = useState<string>("baseline");
  const [cashflowGranularity, setCashflowGranularity] = useState<"monthly" | "weekly">("monthly");
  const [healthChartMode, setHealthChartMode] = useState<"bar" | "curve">("bar");
  const [financeGranularity, setFinanceGranularity] = useState<"monthly" | "weekly">("monthly");
  const [scurveGranularity, setScurveGranularity] = useState<"monthly" | "weekly">("monthly");
  const [descExpanded, setDescExpanded] = useState(false);
  // Gantt hover — cursor-following tooltip state (client x/y + payload)
  const [ganttHover, setGanttHover] = useState<null | { x: number; y: number; code: string; name: string; startMs: number; endMs: number; durationDays: number; remainingDays: number; progressPct: number; qty?: string; unit?: string; level: 1 | 2 }>(null);
  const toggleTimeline = (areaId: string) => {
    setExpandedTimeline(prev => { const n = new Set(prev); n.has(areaId) ? n.delete(areaId) : n.add(areaId); return n; });
  };


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

  // Bucket helper: weekly keeps period_label as-is; monthly groups by calendar month of period_date
  const bucketFor = (fe: { period_label?: string | null; period_date: string }, gran: "monthly" | "weekly") => {
    if (gran === "weekly") {
      const key = fe.period_label || fe.period_date;
      return { key, label: key, order: new Date(fe.period_date).getTime() };
    }
    const d = new Date(fe.period_date);
    const y = d.getUTCFullYear(); const m = d.getUTCMonth();
    const key = `${y}-${String(m + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
    return { key, label, order: Date.UTC(y, m, 1) };
  };

  // Small Monthly/Weekly toggle
  const GranularityToggle = ({ value, onChange }: { value: "monthly" | "weekly"; onChange: (g: "monthly" | "weekly") => void }) => (
    <div className="flex items-center gap-1 bg-muted/40 rounded-md p-0.5 border border-border">
      {(["monthly", "weekly"] as const).map(g => (
        <button
          key={g}
          onClick={() => onChange(g)}
          className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide rounded transition-colors ${value === g ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          {g === "monthly" ? "Monthly" : "Weekly"}
        </button>
      ))}
    </div>
  );

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
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${L3 ? "border-success/30 bg-success/10 text-success" : st.className}`}>{L3 ? "On Progress" : st.label}</span>
                  <span className="text-[10px] text-muted-foreground bg-card/80 backdrop-blur px-2 py-0.5 rounded">{project.phase}</span>
                  {project.margin_locked && <span className="text-[10px] text-warning bg-card/80 backdrop-blur px-2 py-0.5 rounded flex items-center gap-1"><Lock className="h-2.5 w-2.5" />Margin Locked</span>}
                </div>
                <h1 className="text-lg sm:text-xl font-bold text-foreground mt-1">{project.name}</h1>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              {project.description && (() => {
                const desc = project.description;
                const isLong = desc.length > 180;
                const shown = !isLong || descExpanded ? desc : desc.slice(0, 180).trimEnd() + "…";
                return (
                  <p className="text-xs text-muted-foreground mb-3">
                    {shown}
                    {isLong && (
                      <button onClick={() => setDescExpanded(v => !v)} className="ml-1.5 text-primary hover:underline font-medium text-[11px]">
                        {descExpanded ? "Sembunyikan" : "Selengkapnya"}
                      </button>
                    )}
                  </p>
                );
              })()}

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                <InfoItem icon={MapPin} label="Lokasi" value={project.location} />
                <InfoItem icon={User} label="PM" value={project.manager} />
                <InfoItem icon={Briefcase} label="Klien" value={project.client} />
                <InfoItem icon={Calendar} label="Mulai" value={new Date(project.start_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} />
                <InfoItem icon={Calendar} label="Target" value={endDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} />
                {!L3 && <InfoItem icon={User} label="Staff / Manpower" value={`${staffCount} / ${manpowerCount} org`} />}
                {!L3 && <InfoItem icon={Clock} label="Sisa" value={daysRemaining > 0 ? `${daysRemaining}d` : "Overdue"} valueClassName={daysRemaining <= 0 ? "text-destructive" : daysRemaining < 90 ? "text-warning" : ""} />}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mb-4 border-b border-border pb-2 overflow-x-auto">
            {(([
              { key: "health" as const, label: "Health", icon: Activity, publicOk: true },
              { key: "scurve" as const, label: "S-Curve", icon: TrendingUp, publicOk: true },
              { key: "milestones" as const, label: L3 ? "Milestones" : `Milestones (${milestones.length})`, icon: Target, publicOk: true },
              { key: "wbs" as const, label: L3 ? "WBS" : `WBS (${workAreas.length})`, icon: Layers, publicOk: true },
              { key: "procurement" as const, label: `Procurement (${procurementItems.length})`, icon: Package, publicOk: false },
              { key: "finance" as const, label: "Finance", icon: Wallet, publicOk: false },
              { key: "billing" as const, label: `Billing (${billings.length})`, icon: Receipt, publicOk: false },
              { key: "risks" as const, label: `Risks (${projectRisks.length})`, icon: AlertTriangle, publicOk: false },
              { key: "weekly-report" as const, label: "Weekly Report", icon: FileText, publicOk: false },
              { key: "media" as const, label: "Media", icon: Camera, publicOk: true },
              { key: "addendum" as const, label: `Addendum (${addendums.length})`, icon: FileText, publicOk: true },
            ]).filter(t => (L3 ? L3_TABS.includes(t.key) : (!isClient || t.publicOk)))).map(tab => (

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
                  <div className="flex items-center gap-1.5 mb-1"><Clock className="h-3.5 w-3.5 text-primary" /><span className="text-[10px] text-muted-foreground uppercase">Time Progress</span><FormulaTooltip {...FORMULAS.timeProgress} /></div>
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
                        <span className="text-muted-foreground">Progress Project</span>
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
                        <span className="text-muted-foreground">Time Progress</span>
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
                          <p className="text-[10px] text-muted-foreground uppercase mb-1 tracking-wide">Contract Value</p>
                          <p className="text-lg font-bold font-mono-data text-primary">{formatRupiah(contractValue)}</p>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase mb-1 tracking-wide">RAP</p>
                          <p className="text-lg font-bold font-mono-data text-info">{formatRupiah(rapValue)}</p>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase mb-1 tracking-wide">Actual Cash Out</p>
                          <p className="text-lg font-bold font-mono-data text-accent">{formatRupiah(actualCashOut)}</p>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase mb-1 tracking-wide">Remaining (RAP − Actual)</p>
                          <p className={`text-lg font-bold font-mono-data ${remainingRap >= 0 ? "text-success" : "text-destructive"}`}>{formatRupiah(remainingRap)}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* === Progress vs Cashflow per Periode (moved from Finance) === */}
              {(() => {
                type Period = { key: string; label: string; order: number; cashIn: number; cashOut: number; planIn: number; planOut: number };
                const periodMap: Record<string, Period> = {};
                financeEntries.forEach(fe => {
                  const b = bucketFor(fe, cashflowGranularity);
                  if (!periodMap[b.key]) periodMap[b.key] = { key: b.key, label: b.label, order: b.order, cashIn: 0, cashOut: 0, planIn: 0, planOut: 0 };
                  const amt = Number(fe.amount) || 0;
                  const isPlan = fe.entry_kind === "rap" || fe.entry_kind === "forecast";
                  if (fe.entry_kind === "actual") {
                    if (fe.direction === "in") periodMap[b.key].cashIn += amt;
                    else periodMap[b.key].cashOut += amt;
                  } else if (isPlan) {
                    if (fe.direction === "in") periodMap[b.key].planIn += amt;
                    else periodMap[b.key].planOut += amt;
                  }
                });

                const availableCurves = Array.from(new Set(scurveData.map(s => s.curve_type)));
                if (!availableCurves.includes("baseline")) availableCurves.unshift("baseline");
                const activeCurve = availableCurves.includes(cashflowCurve) ? cashflowCurve : "baseline";
                const activeRows = scurveData.filter(s => s.curve_type === activeCurve);

                // Add S-Curve periods so we show plan/actual even where no cashflow entry exists.
                activeRows.forEach(s => {
                  const anchor = s.period_end || s.period_start;
                  if (!anchor) return;
                  const d = new Date(anchor);
                  if (isNaN(d.getTime())) return;
                  let key: string, label: string, order: number;
                  if (cashflowGranularity === "weekly") {
                    key = s.period_label || anchor;
                    label = s.period_label || anchor;
                    order = d.getTime();
                  } else {
                    const y = d.getUTCFullYear(); const m = d.getUTCMonth();
                    key = `${y}-${String(m + 1).padStart(2, "0")}`;
                    label = d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
                    order = Date.UTC(y, m, 1);
                  }
                  if (!periodMap[key]) periodMap[key] = { key, label, order, cashIn: 0, cashOut: 0, planIn: 0, planOut: 0 };
                });

                const periodList = Object.values(periodMap).sort((a, b) => a.order - b.order);
                if (periodList.length === 0) return null;

                // Build a date-anchored point set (ms) directly from active curve rows.
                const points = activeRows
                  .map(s => {
                    const anchor = s.period_end || s.period_start;
                    if (!anchor) return null;
                    const t = new Date(anchor).getTime();
                    if (isNaN(t)) return null;
                    return {
                      t,
                      start: s.period_start ? new Date(s.period_start).getTime() : t,
                      end: s.period_end ? new Date(s.period_end).getTime() : t,
                      plan: s.planned_progress != null ? Number(s.planned_progress) : null,
                      actual: s.actual_progress != null ? Number(s.actual_progress) : null,
                    };
                  })
                  .filter(Boolean) as { t: number; start: number; end: number; plan: number | null; actual: number | null }[];
                points.sort((a, b) => a.t - b.t);

                const valueAt = (periodMs: number, field: "plan" | "actual"): number | null => {
                  if (points.length === 0) return null;
                  // 1) Exact window: any scurve row whose [start,end] contains the period date
                  const hit = points.find(p => p[field] != null && periodMs >= p.start && periodMs <= p.end);
                  if (hit) return hit[field]!;
                  // 2) Interpolate between neighbours; no extrapolation outside the curve's data range
                  const pts = points.filter(p => p[field] != null) as { t: number; plan: number; actual: number }[];
                  if (pts.length === 0) return null;
                  if (periodMs < pts[0].t || periodMs > pts[pts.length - 1].t) return null;
                  for (let i = 0; i < pts.length - 1; i++) {
                    const a = pts[i], b = pts[i + 1];
                    if (periodMs >= a.t && periodMs <= b.t) {
                      const r = (periodMs - a.t) / Math.max(1, b.t - a.t);
                      return a[field] + (b[field] - a[field]) * r;
                    }
                  }
                  return pts[pts.length - 1][field];
                };

                const todayMs = Date.now();
                const lastActualMs = (() => {
                  const withAct = points.filter(p => p.actual != null);
                  return withAct.length ? withAct[withAct.length - 1].t : -Infinity;
                })();
                const todayLabel = (() => {
                  const containing = activeRows.find(s => {
                    const start = s.period_start ? new Date(s.period_start).getTime() : null;
                    const end = s.period_end ? new Date(s.period_end).getTime() : null;
                    return start != null && end != null && todayMs >= start && todayMs <= end;
                  });
                  if (containing) return containing.period_label || containing.period_end || null;
                  if (cashflowGranularity === "monthly") {
                    const d = new Date();
                    return d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
                  }
                  return null;
                })();

                let _cumPlanIn = 0, _cumPlanOut = 0, _cumIn = 0, _cumOut = 0;
                let _prevPlanPct: number | null = null, _prevActPct: number | null = null;
                const rows = periodList.map(p => {
                  const periodMs = p.order;
                  const planPct = valueAt(periodMs, "plan");
                  const cutoffMs = lastActualMs === -Infinity ? todayMs : lastActualMs;
                  const actPct = periodMs <= cutoffMs ? valueAt(periodMs, "actual") : null;
                  const planPctN = planPct == null ? null : Number(planPct);
                  const actPctN = actPct == null ? null : Number(actPct);
                  const dPlan = planPctN == null ? null : planPctN - (_prevPlanPct ?? 0);
                  const dAct = actPctN == null ? null : actPctN - (_prevActPct ?? 0);
                  if (planPctN != null) _prevPlanPct = planPctN;
                  if (actPctN != null) _prevActPct = actPctN;
                  _cumPlanIn += p.planIn; _cumPlanOut += p.planOut; _cumIn += p.cashIn; _cumOut += p.cashOut;
                  return {
                    label: p.label,
                    planPct: planPctN,
                    actPct: actPctN,
                    planPctDelta: dPlan,
                    actPctDelta: dAct,
                    cashIn: p.cashIn,
                    cashOut: p.cashOut,
                    planIn: p.planIn,
                    planOut: p.planOut,
                    cumPlanIn: _cumPlanIn,
                    cumPlanOut: _cumPlanOut,
                    cumCashIn: _cumIn,
                    cumCashOut: _cumOut,
                    cumPlanNet: _cumPlanIn - _cumPlanOut,
                    cumActNet: _cumIn - _cumOut,

                  };
                });

                return (
                  <div className="glass-card rounded-lg p-4 shadow-card">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Progress vs Cashflow per Periode</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <GranularityToggle value={cashflowGranularity} onChange={setCashflowGranularity} />
                        <Select value={healthChartMode} onValueChange={(v) => setHealthChartMode(v as "bar" | "curve")}>
                          <SelectTrigger className="h-7 w-32 text-[10px] font-semibold bg-muted/40 border-border">
                            <SelectValue placeholder="Jenis grafik" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bar" className="text-xs">Bar Chart</SelectItem>
                            <SelectItem value="curve" className="text-xs">Curve</SelectItem>
                          </SelectContent>
                        </Select>
                        {availableCurves.length > 1 && (
                          <div className="flex items-center gap-1 bg-muted/40 rounded-md p-0.5 border border-border">
                            {availableCurves.map(ct => (
                              <button
                                key={ct}
                                onClick={() => setCashflowCurve(ct)}
                                className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide rounded transition-colors ${activeCurve === ct ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                              >
                                {ct === "baseline" ? "Baseline" : ct}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-3">Plan % & Actual % diambil dari S-Curve <span className="font-semibold text-foreground">({activeCurve === "baseline" ? "Baseline" : activeCurve})</span>. Periode & proyeksi mengikuti data Cashflow hingga proyek selesai. Mode <span className="font-semibold text-foreground">{healthChartMode === "bar" ? "Bar Chart (kenaikan per periode)" : "Curve (kumulatif)"}</span>.</p>
                    <div className="h-[280px] mb-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                          <XAxis dataKey="label" tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 10 }} />
                          <YAxis yAxisId="left" orientation="left" tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 9 }} tickFormatter={(v: number) => formatRupiah(v)} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} domain={healthChartMode === "bar" ? [0, "auto"] : [0, 100]} />
                          <RTooltip
                            contentStyle={chartTooltip}
                            content={({ active, payload, label }: any) => {
                              if (!active || !payload || payload.length === 0) return null;
                              const row = payload[0]?.payload || {};
                              const rowNum = (v: any) => (v == null ? null : Number(v));
                              const isBarMode = healthChartMode === "bar";
                              const planPct = isBarMode ? rowNum(row.planPctDelta) : rowNum(row.planPct);
                              const actPct = isBarMode ? rowNum(row.actPctDelta) : rowNum(row.actPct);
                              const planIn = rowNum(isBarMode ? row.planIn : row.cumPlanIn) ?? 0;
                              const planOut = rowNum(isBarMode ? row.planOut : row.cumPlanOut) ?? 0;
                              const cashIn = rowNum(isBarMode ? row.cashIn : row.cumCashIn) ?? 0;
                              const cashOut = rowNum(isBarMode ? row.cashOut : row.cumCashOut) ?? 0;
                              const extrasList2 = availableCurves.filter(c => c !== "baseline");
                              const idx2 = activeCurve === "baseline" ? 0 : Math.max(0, extrasList2.indexOf(activeCurve));
                              const lc = curvePalette(activeCurve, idx2);
                              return (
                                <div className="bg-card border border-border rounded-md shadow-lg px-3 py-2 text-[11px] min-w-[220px]">
                                  <p className="text-foreground font-bold mb-1.5">{label} <span className="ml-1 text-[9px] uppercase font-semibold" style={{ color: lc.hue }}>({activeCurve === "baseline" ? "Baseline" : activeCurve})</span></p>
                                  <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5">
                                    <span className="text-muted-foreground font-semibold uppercase text-[9px] tracking-wide">{isBarMode ? "Δ Progress (kenaikan periode)" : "Progress"}</span><span />
                                    <span className="text-muted-foreground">Planning</span>
                                    <span className="font-mono-data font-semibold text-right" style={{ color: lc.plan }}>{planPct == null ? "—" : `${planPct.toFixed(1)}%`}</span>
                                    <span className="text-muted-foreground">Actual</span>
                                    <span className="font-mono-data font-semibold text-right" style={{ color: lc.actual }}>{actPct == null ? "—" : `${actPct.toFixed(1)}%`}</span>
                                    <span className="col-span-2 border-t border-border/60 my-1" />
                                    <span className="text-muted-foreground font-semibold uppercase text-[9px] tracking-wide">{isBarMode ? "Cash In / Out" : "Net Kumulatif"}</span><span />
                                    {isBarMode ? (
                                      <>
                                        <span className="text-muted-foreground">Plan Cash In</span>
                                        <span className="font-mono-data text-muted-foreground text-right">{formatRupiah(planIn)}</span>
                                        <span className="text-muted-foreground">Actual Cash In</span>
                                        <span className="font-mono-data text-primary font-semibold text-right">{formatRupiah(cashIn)}</span>
                                        <span className="text-muted-foreground">Plan Cash Out</span>
                                        <span className="font-mono-data text-muted-foreground/70 text-right">{formatRupiah(planOut)}</span>
                                        <span className="text-muted-foreground">Actual Cash Out</span>
                                        <span className="font-mono-data text-accent font-semibold text-right">{formatRupiah(cashOut)}</span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="text-muted-foreground">Plan Net</span>
                                        <span className="font-mono-data text-muted-foreground text-right">{formatRupiah(rowNum(row.cumPlanNet) ?? 0)}</span>
                                        <span className="text-muted-foreground">Actual Net</span>
                                        <span className="font-mono-data text-primary font-semibold text-right">{formatRupiah(rowNum(row.cumActNet) ?? 0)}</span>
                                      </>
                                    )}

                                  </div>
                                </div>
                              );
                            }}
                          />

                          <Legend iconSize={10} wrapperStyle={{ fontSize: "11px" }} />
                          {(() => {
                            // Cash bars ALWAYS use the same fiscal palette so switching curve never changes bar meaning.
                            const cash = {
                              planIn:  "hsl(var(--primary) / 0.35)",
                              actIn:   "hsl(var(--primary))",
                              planOut: "hsl(var(--accent) / 0.35)",
                              actOut:  "hsl(var(--accent))",
                            };
                            // Curve-typed color for the progress line (plan & actual share the same HUE).
                            const extrasList = availableCurves.filter(c => c !== "baseline");
                            const extraIdx = activeCurve === "baseline" ? 0 : Math.max(0, extrasList.indexOf(activeCurve));
                            const line = curvePalette(activeCurve, extraIdx);
                            return (
                              <>
                                {healthChartMode === "bar" ? (
                                  <>
                                    <Bar yAxisId="left" dataKey="planIn" name="Plan Cash In" fill={cash.planIn} radius={[3,3,0,0]} />
                                    <Bar yAxisId="left" dataKey="cashIn" name="Actual Cash In" fill={cash.actIn} radius={[3,3,0,0]} />
                                    <Bar yAxisId="left" dataKey="planOut" name="Plan Cash Out" fill={cash.planOut} radius={[3,3,0,0]} />
                                    <Bar yAxisId="left" dataKey="cashOut" name="Actual Cash Out" fill={cash.actOut} radius={[3,3,0,0]} />
                                    <Bar yAxisId="right" dataKey="planPctDelta" name={`Δ Plan % (${activeCurve})`} fill={line.plan} radius={[3,3,0,0]} />
                                    <Bar yAxisId="right" dataKey="actPctDelta" name={`Δ Actual % (${activeCurve})`} fill={line.actual} radius={[3,3,0,0]} />
                                  </>
                                ) : (
                                  <>
                                    <Line yAxisId="left" type="monotone" dataKey="cumPlanIn" name="Kum. Plan Cash In" stroke={cash.planIn} strokeWidth={2} strokeDasharray="5 3" dot={false} connectNulls />
                                    <Line yAxisId="left" type="monotone" dataKey="cumCashIn" name="Kum. Actual Cash In" stroke={cash.actIn} strokeWidth={2.5} dot={false} connectNulls />
                                    <Line yAxisId="left" type="monotone" dataKey="cumPlanOut" name="Kum. Plan Cash Out" stroke={cash.planOut} strokeWidth={2} strokeDasharray="5 3" dot={false} connectNulls />
                                    <Line yAxisId="left" type="monotone" dataKey="cumCashOut" name="Kum. Actual Cash Out" stroke={cash.actOut} strokeWidth={2.5} dot={false} connectNulls />
                                    <Line yAxisId="right" type="monotone" dataKey="planPct" name={`Plan % (${activeCurve})`} stroke={line.plan} strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3, fill: line.plan }} connectNulls />
                                    <Line yAxisId="right" type="monotone" dataKey="actPct" name={`Actual % (${activeCurve})`} stroke={line.actual} strokeWidth={2.5} dot={{ r: 3, fill: line.actual }} connectNulls />
                                  </>
                                )}
                                {todayLabel && (
                                  <ReferenceLine yAxisId="left" x={todayLabel} stroke="hsl(0, 72%, 50%)" strokeDasharray="5 5" strokeWidth={1.5} label={{ value: "Today", position: "top", fontSize: 9, fill: "hsl(0, 72%, 50%)" }} />
                                )}
                              </>
                            );
                          })()}

                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    {(() => {
                      const extrasList3 = availableCurves.filter(c => c !== "baseline");
                      const idx3 = activeCurve === "baseline" ? 0 : Math.max(0, extrasList3.indexOf(activeCurve));
                      const lineColor = curvePalette(activeCurve, idx3);
                      return (
                    <div className="max-h-[280px] overflow-auto rounded border border-border">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-muted border-b border-border">
                            <th rowSpan={2} className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground align-bottom">Periode</th>
                            <th colSpan={3} className="text-center py-1 px-2 text-[9px] uppercase text-muted-foreground border-l border-border">{healthChartMode === "bar" ? "Δ Progress % / Periode" : "Progress %"} <span className="font-semibold text-foreground">({activeCurve === "baseline" ? "Baseline" : activeCurve})</span></th>
                            <th colSpan={2} className="text-center py-1 px-2 text-[9px] uppercase text-muted-foreground border-l border-border">{healthChartMode === "bar" ? "Cash In" : "Kum. Cash In"}</th>
                            <th colSpan={2} className="text-center py-1 px-2 text-[9px] uppercase text-muted-foreground border-l border-border">{healthChartMode === "bar" ? "Cash Out" : "Kum. Cash Out"}</th>
                            <th rowSpan={2} className="text-right py-1.5 px-2 text-[9px] uppercase text-muted-foreground border-l border-border align-bottom">
                              <span className="inline-flex items-center gap-0.5">Net Kumulatif (Actual)<FormulaTooltip {...FORMULAS.cumulativeNet} /></span>
                            </th>
                          </tr>
                          <tr className="bg-muted/70 border-b border-border">
                            <th className="text-right py-1 px-2 text-[9px] uppercase text-muted-foreground border-l border-border">Plan</th>
                            <th className="text-right py-1 px-2 text-[9px] uppercase text-muted-foreground">Actual</th>
                            <th className="text-right py-1 px-2 text-[9px] uppercase text-muted-foreground">
                              <span className="inline-flex items-center gap-0.5">Deviasi<FormulaTooltip {...FORMULAS.deviation} /></span>
                            </th>
                            <th className="text-right py-1 px-2 text-[9px] uppercase text-muted-foreground border-l border-border">Plan</th>
                            <th className="text-right py-1 px-2 text-[9px] uppercase text-muted-foreground">Actual</th>
                            <th className="text-right py-1 px-2 text-[9px] uppercase text-muted-foreground border-l border-border">Plan</th>
                            <th className="text-right py-1 px-2 text-[9px] uppercase text-muted-foreground">Actual</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            let cum = 0;
                            let hasAnyActual = false;
                            const isBarTable = healthChartMode === "bar";
                            return rows.map(r0 => {
                              const r = isBarTable
                                ? { ...r0, planPct: r0.planPctDelta, actPct: r0.actPctDelta, planIn: r0.planIn, cashIn: r0.cashIn, planOut: r0.planOut, cashOut: r0.cashOut }
                                : { ...r0, planPct: r0.planPct, actPct: r0.actPct, planIn: r0.cumPlanIn, cashIn: r0.cumCashIn, planOut: r0.cumPlanOut, cashOut: r0.cumCashOut };
                              const dev = r.planPct != null && r.actPct != null ? r.actPct - r.planPct : null;
                              const hasActualHere = r.actPct != null || r0.cashIn !== 0 || r0.cashOut !== 0;
                              if (hasActualHere) { hasAnyActual = true; cum += (r0.cashIn - r0.cashOut); }
                              const showNet = hasAnyActual && r.actPct != null;
                              return (
                              <tr key={r.label} className="border-b border-border/30 hover:bg-muted/20">
                                <td className="py-1.5 px-2 text-foreground font-medium">{r.label}</td>
                                <td className="py-1.5 px-2 text-right font-mono-data border-l border-border/40" style={{ color: lineColor.plan }}>{r.planPct == null ? "—" : `${r.planPct.toFixed(1)}%`}</td>
                                <td className="py-1.5 px-2 text-right font-mono-data font-semibold" style={{ color: r.actPct == null ? undefined : lineColor.actual }}>{r.actPct == null ? "—" : `${r.actPct.toFixed(1)}%`}</td>
                                <td className={`py-1.5 px-2 text-right font-mono-data ${dev == null ? "text-muted-foreground" : dev >= 0 ? "text-success" : "text-destructive"}`}>{dev == null ? "—" : `${dev > 0 ? "+" : ""}${dev.toFixed(1)}%`}</td>
                                <td className="py-1.5 px-2 text-right font-mono-data text-muted-foreground border-l border-border/40">{formatRupiah(r.planIn)}</td>
                                <td className="py-1.5 px-2 text-right font-mono-data text-primary font-semibold">{formatRupiah(r.cashIn)}</td>
                                <td className="py-1.5 px-2 text-right font-mono-data text-muted-foreground/70 border-l border-border/40">{formatRupiah(r.planOut)}</td>
                                <td className="py-1.5 px-2 text-right font-mono-data text-foreground font-semibold">{formatRupiah(r.cashOut)}</td>
                                <td className={`py-1.5 px-2 text-right font-mono-data font-bold border-l border-border/40 ${!showNet ? "text-muted-foreground" : "text-foreground"}`}>{showNet ? formatRupiah(cum) : "—"}</td>
                              </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                      );
                    })()}


                  </div>
                );
              })()}
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === "billing" && (
            <div className="glass-card rounded-lg p-4 shadow-card">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-1"><Receipt className="h-4 w-4 text-primary" /> Billing / Termin ke Client</h3>
              <p className="text-[10px] text-muted-foreground mb-3">Monitoring pengakuan pembayaran termin — status, nominal, % progress tertagih, serta tanggal PO / Invoice / Cash In.</p>
              {billings.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">Belum ada data termin.</p>
              ) : (
                <div className="overflow-x-auto rounded border border-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted border-b border-border">
                        <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Termin</th>
                        <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Deskripsi</th>
                        <th className="text-center py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Status</th>
                        <th className="text-right py-1.5 px-2 text-[9px] uppercase text-muted-foreground">% Progress</th>
                        <th className="text-right py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Nominal</th>
                        <th className="text-center py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Tgl PO</th>
                        <th className="text-center py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Tgl Invoice</th>
                        <th className="text-center py-1.5 px-2 text-[9px] uppercase text-muted-foreground">Tgl Cash In</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billings.map(b => {
                        const st = BILLING_STATUSES.find(x => x.value === b.status);
                        const d = (v: string | null) => (v ? new Date(v).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" }) : "—");
                        return (
                          <tr key={b.id} className="border-b border-border/30 hover:bg-muted/20">
                            <td className="py-1.5 px-2 font-semibold text-foreground">{b.termin_code}</td>
                            <td className="py-1.5 px-2 text-muted-foreground">{b.description || "—"}</td>
                            <td className="py-1.5 px-2 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${BILLING_STATUS_CLASS[b.status] || "bg-muted text-muted-foreground border-border"}`}>{st?.label || b.status}</span>
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono-data">{Number(b.plan_progress_pct || 0).toFixed(1)}%</td>
                            <td className="py-1.5 px-2 text-right font-mono-data font-semibold text-foreground">{formatRupiah(Number(b.plan_amount || 0))}</td>
                            <td className="py-1.5 px-2 text-center font-mono-data text-muted-foreground">{d(b.actual_po_date || b.plan_po_date)}</td>
                            <td className="py-1.5 px-2 text-center font-mono-data text-muted-foreground">{d(b.actual_invoice_date || b.plan_invoice_date)}</td>
                            <td className="py-1.5 px-2 text-center font-mono-data text-muted-foreground">{d(b.actual_cash_in_date || b.plan_cash_in_date)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Finance Tab */}
          {activeTab === "finance" && (
            <div className="space-y-4">

              {/* === Cashflow Bipolar Bar Chart (Cash In ↑ / Cash Out ↓) — Top === */}
              {(() => {
                const map: Record<string, { label: string; order: number; planIn: number; actIn: number; planOut: number; actOut: number }> = {};
                financeEntries.forEach(fe => {
                  const b = bucketFor(fe, financeGranularity);
                  if (!map[b.key]) map[b.key] = { label: b.label, order: b.order, planIn: 0, actIn: 0, planOut: 0, actOut: 0 };
                  const isPlan = fe.entry_kind === "rap" || fe.entry_kind === "forecast";
                  const isAct = fe.entry_kind === "actual";
                  const amt = Number(fe.amount) || 0;
                  if (fe.direction === "in" && isPlan) map[b.key].planIn += amt;
                  if (fe.direction === "in" && isAct) map[b.key].actIn += amt;
                  if (fe.direction === "out" && isPlan) map[b.key].planOut += amt;
                  if (fe.direction === "out" && isAct) map[b.key].actOut += amt;
                });
                const sorted = Object.values(map).sort((a, b) => a.order - b.order);
                let cumPlan = 0, cumAct = 0;
                let hasAnyActual = false;
                const bipolar = sorted.map(r => {
                  cumPlan += (r.planIn - r.planOut);
                  const hasAct = r.actIn !== 0 || r.actOut !== 0;
                  if (hasAct) { hasAnyActual = true; cumAct += (r.actIn - r.actOut); }
                  return {
                    label: r.label,
                    planIn: r.planIn,
                    actIn: r.actIn,
                    planOut: r.planOut,
                    actOut: r.actOut,
                    "Plan Cash In": r.planIn,
                    "Actual Cash In": r.actIn,
                    "Plan Cash Out": -r.planOut,
                    "Actual Cash Out": -r.actOut,
                    "Cum. Plan Net": cumPlan,
                    "Cum. Actual Net": hasAnyActual && hasAct ? cumAct : null,
                    _cumPlan: cumPlan,
                    _cumAct: hasAnyActual && hasAct ? cumAct : null,
                  };
                });
                // Breakeven marker (first period where cumulative actual net turns >= 0)
                const breakevenLabel = (() => {
                  let prev = -Infinity;
                  for (const r of bipolar) {
                    const v = r["Cum. Actual Net"];
                    if (v == null) continue;
                    if (prev < 0 && v >= 0) return r.label;
                    prev = v as number;
                  }
                  return null;
                })();
                if (bipolar.length === 0) return null;
                return (
                  <div className="glass-card rounded-lg p-4 shadow-card">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" /> Cashflow — Plan vs Actual
                      </h3>
                      <GranularityToggle value={financeGranularity} onChange={setFinanceGranularity} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-3">Bar = Cash In (↑) / Cash Out (↓) per periode · Garis kumulatif Plan (dashed) &amp; Actual (solid) menunjukkan posisi net cashflow. Titik potong Actual ke atas nol = <span className="font-semibold text-primary">breakeven / titik balik profit</span>{breakevenLabel && <> — proyek breakeven pada <span className="font-bold text-primary">{breakevenLabel}</span></>}.</p>
                    <div className="h-[340px] overflow-x-auto">
                      <div style={{ minWidth: financeGranularity === "weekly" ? Math.max(700, bipolar.length * 42) : "100%", height: "100%" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={bipolar} stackOffset="sign" margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                          <XAxis dataKey="label" tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={financeGranularity === "weekly" ? -35 : 0} textAnchor={financeGranularity === "weekly" ? "end" : "middle"} height={financeGranularity === "weekly" ? 60 : 30} />
                          <YAxis tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatRupiah(Math.abs(v))} />
                          <RTooltip
                            contentStyle={chartTooltip}
                            content={({ active, payload, label }: any) => {
                              if (!active || !payload || payload.length === 0) return null;
                              const row = payload[0]?.payload || {};
                              const planIn = Number(row.planIn) || 0;
                              const planOut = Number(row.planOut) || 0;
                              const actIn = Number(row.actIn) || 0;
                              const actOut = Number(row.actOut) || 0;
                              const cumPlan = row._cumPlan;
                              const cumAct = row._cumAct;
                              const hasAct = actIn !== 0 || actOut !== 0;
                              return (
                                <div className="bg-card border border-border rounded-md shadow-lg px-3 py-2 text-[11px] min-w-[220px]">
                                  <p className="text-foreground font-bold mb-1.5">{label}</p>
                                  <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5">
                                    <span className="text-muted-foreground font-semibold uppercase text-[9px] tracking-wide">Planning</span><span />
                                    <span className="text-muted-foreground">Cash In</span>
                                    <span className="font-mono-data text-primary/70 text-right">{formatRupiah(planIn)}</span>
                                    <span className="text-muted-foreground">Cash Out</span>
                                    <span className="font-mono-data text-accent/70 text-right">{formatRupiah(planOut)}</span>
                                    <span className="text-muted-foreground">Kumulatif Net</span>
                                    <span className="font-mono-data text-info font-semibold text-right">{cumPlan == null ? "—" : formatRupiah(cumPlan)}</span>
                                    <span className="col-span-2 border-t border-border/60 my-1" />
                                    <span className="text-muted-foreground font-semibold uppercase text-[9px] tracking-wide">Actual</span><span />
                                    <span className="text-muted-foreground">Cash In</span>
                                    <span className="font-mono-data text-primary font-semibold text-right">{hasAct ? formatRupiah(actIn) : "—"}</span>
                                    <span className="text-muted-foreground">Cash Out</span>
                                    <span className="font-mono-data text-accent font-semibold text-right">{hasAct ? formatRupiah(actOut) : "—"}</span>
                                    <span className="text-muted-foreground">Kumulatif Net</span>
                                    <span className="font-mono-data text-success font-bold text-right">{cumAct == null ? "—" : formatRupiah(cumAct)}</span>
                                  </div>
                                </div>
                              );
                            }}
                          />
                          <Legend iconSize={10} wrapperStyle={{ fontSize: "11px" }} />
                          <ReferenceLine y={0} stroke="hsl(215, 15%, 30%)" strokeWidth={1.5} />
                          {breakevenLabel && <ReferenceLine x={breakevenLabel} stroke="hsl(var(--primary))" strokeDasharray="4 3" label={{ value: "Breakeven", fill: "hsl(var(--primary))", fontSize: 10, position: "top" }} />}
                          <Bar dataKey="Plan Cash In" fill="hsl(var(--primary) / 0.35)" radius={[3,3,0,0]} minPointSize={2} />
                          <Bar dataKey="Actual Cash In" fill="hsl(var(--primary))" radius={[3,3,0,0]} minPointSize={2} />
                          <Bar dataKey="Plan Cash Out" fill="hsl(var(--accent) / 0.35)" radius={[0,0,3,3]} minPointSize={2} />
                          <Bar dataKey="Actual Cash Out" fill="hsl(var(--accent))" radius={[0,0,3,3]} minPointSize={2} />
                          <Line type="monotone" dataKey="Cum. Plan Net" name="Kumulatif Plan (Net)" stroke="hsl(var(--info))" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 2.5, fill: "hsl(var(--info))" }} connectNulls />
                          <Line type="monotone" dataKey="Cum. Actual Net" name="Kumulatif Actual (Net)" stroke="hsl(var(--success))" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(var(--success))" }} connectNulls />

                        </ComposedChart>
                      </ResponsiveContainer>
                      </div>
                    </div>

                    {/* === Detailed Cashflow Table === */}
                    <div className="mt-4 border border-border rounded-md overflow-hidden">
                      <div className="overflow-auto max-h-[360px]">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 z-10">
                            <tr className="bg-muted border-b border-border">
                              <th rowSpan={2} className="text-left py-2 px-2 text-[9px] uppercase text-muted-foreground align-bottom">Periode</th>
                              <th colSpan={4} className="text-center py-1 px-2 text-[9px] uppercase text-muted-foreground border-l border-border">Planning</th>
                              <th colSpan={4} className="text-center py-1 px-2 text-[9px] uppercase text-foreground border-l-2 border-border">Actual</th>
                            </tr>
                            <tr className="bg-muted/70 border-b border-border">
                              <th className="text-right py-1 px-2 text-[9px] uppercase text-primary/70 border-l border-border">Cash In</th>
                              <th className="text-right py-1 px-2 text-[9px] uppercase text-accent/70">Cash Out</th>
                              <th className="text-right py-1 px-2 text-[9px] uppercase text-info">
                                <span className="inline-flex items-center gap-0.5 justify-end w-full">Net<FormulaTooltip {...FORMULAS.netPeriode} /></span>
                              </th>
                              <th className="text-right py-1 px-2 text-[9px] uppercase text-info">
                                <span className="inline-flex items-center gap-0.5 justify-end w-full">Kumulatif<FormulaTooltip {...FORMULAS.cumulativeNet} /></span>
                              </th>
                              <th className="text-right py-1 px-2 text-[9px] uppercase text-primary border-l-2 border-border">Cash In</th>
                              <th className="text-right py-1 px-2 text-[9px] uppercase text-accent">Cash Out</th>
                              <th className="text-right py-1 px-2 text-[9px] uppercase text-success">
                                <span className="inline-flex items-center gap-0.5 justify-end w-full">Net<FormulaTooltip {...FORMULAS.netPeriode} /></span>
                              </th>
                              <th className="text-right py-1 px-2 text-[9px] uppercase text-success">
                                <span className="inline-flex items-center gap-0.5 justify-end w-full">Kumulatif<FormulaTooltip {...FORMULAS.cumulativeNet} /></span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {bipolar.map((r, idx) => {
                              const netPlan = r.planIn - r.planOut;
                              const hasAct = r.actIn !== 0 || r.actOut !== 0;
                              const netAct = hasAct ? r.actIn - r.actOut : null;
                              return (
                                <tr key={idx} className="border-b border-border/30 hover:bg-muted/20">
                                  <td className="py-1.5 px-2 font-medium text-foreground">{r.label}</td>
                                  <td className="py-1.5 px-2 text-right font-mono-data text-primary/70 border-l border-border/40">{formatRupiah(r.planIn)}</td>
                                  <td className="py-1.5 px-2 text-right font-mono-data text-accent/70">{formatRupiah(r.planOut)}</td>
                                  <td className="py-1.5 px-2 text-right font-mono-data text-info">{formatRupiah(netPlan)}</td>
                                  <td className="py-1.5 px-2 text-right font-mono-data text-info font-semibold">{formatRupiah(r._cumPlan)}</td>
                                  <td className="py-1.5 px-2 text-right font-mono-data text-primary font-semibold border-l-2 border-border/60">{hasAct ? formatRupiah(r.actIn) : "—"}</td>
                                  <td className="py-1.5 px-2 text-right font-mono-data text-accent font-semibold">{hasAct ? formatRupiah(r.actOut) : "—"}</td>
                                  <td className={`py-1.5 px-2 text-right font-mono-data font-semibold ${netAct == null ? "text-muted-foreground" : "text-success"}`}>{netAct == null ? "—" : formatRupiah(netAct)}</td>
                                  <td className={`py-1.5 px-2 text-right font-mono-data font-bold ${r._cumAct == null ? "text-muted-foreground" : "text-success"}`}>{r._cumAct == null ? "—" : formatRupiah(r._cumAct)}</td>
                                </tr>
                              );
                            })}
                            {(() => {
                              const tPlanIn = bipolar.reduce((s, r) => s + r.planIn, 0);
                              const tActIn = bipolar.reduce((s, r) => s + r.actIn, 0);
                              const tPlanOut = bipolar.reduce((s, r) => s + r.planOut, 0);
                              const tActOut = bipolar.reduce((s, r) => s + r.actOut, 0);
                              const tNetPlan = tPlanIn - tPlanOut;
                              const tNetAct = tActIn - tActOut;
                              const lastCumPlan = bipolar[bipolar.length - 1]?._cumPlan ?? tNetPlan;
                              const lastCumAct = bipolar[bipolar.length - 1]?._cumAct ?? tNetAct;
                              return (
                                <tr className="bg-primary/5 font-bold border-t-2 border-primary/30">
                                  <td className="py-2 px-2 text-foreground text-[11px]">TOTAL</td>
                                  <td className="py-2 px-2 text-right font-mono-data text-primary/70 border-l border-border/40">{formatRupiah(tPlanIn)}</td>
                                  <td className="py-2 px-2 text-right font-mono-data text-accent/70">{formatRupiah(tPlanOut)}</td>
                                  <td className="py-2 px-2 text-right font-mono-data text-info">{formatRupiah(tNetPlan)}</td>
                                  <td className="py-2 px-2 text-right font-mono-data text-info">{formatRupiah(lastCumPlan)}</td>
                                  <td className="py-2 px-2 text-right font-mono-data text-primary border-l-2 border-border/60">{formatRupiah(tActIn)}</td>
                                  <td className="py-2 px-2 text-right font-mono-data text-accent">{formatRupiah(tActOut)}</td>
                                  <td className="py-2 px-2 text-right font-mono-data text-success">{formatRupiah(tNetAct)}</td>
                                  <td className="py-2 px-2 text-right font-mono-data text-success">{lastCumAct == null ? "—" : formatRupiah(lastCumAct)}</td>
                                </tr>
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}


              {/* === Cost Breakdown by Category — Below === */}
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
                const EXCLUDED = new Set(["bank_guarantee", "overhead"]);
                const coreRows = rows.filter(r => !EXCLUDED.has(r.key));
                const coreRap = coreRows.reduce((s, r) => s + r.rap, 0);
                const coreAct = coreRows.reduce((s, r) => s + r.actual, 0);
                return (
                  <div className="glass-card rounded-lg p-4 shadow-card">
                    <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /> Cost Breakdown per Kategori</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="border border-border rounded-md overflow-hidden">
                        <table className="w-full text-xs">
                          <thead><tr className="bg-muted/50 border-b border-border">
                            <th className="text-left py-2 px-2 text-[9px] uppercase text-muted-foreground">Kategori</th>
                            <th className="text-right py-2 px-2 text-[9px] uppercase text-muted-foreground">RAP</th>
                            <th className="text-right py-2 px-2 text-[9px] uppercase text-muted-foreground">Actual</th>
                            <th className="text-right py-2 px-2 text-[9px] uppercase text-muted-foreground">
                              <span className="inline-flex items-center gap-0.5 justify-end w-full">Variance<FormulaTooltip {...FORMULAS.costVariance} /></span>
                            </th>
                            <th className="text-right py-2 px-2 text-[9px] uppercase text-muted-foreground">
                              <span className="inline-flex items-center gap-0.5 justify-end w-full">%<FormulaTooltip {...FORMULAS.costUtilization} /></span>
                            </th>
                          </tr></thead>
                          <tbody>
                            {rows.map(r => (
                              <tr key={r.key} className={`border-b border-border/30 hover:bg-muted/20 ${EXCLUDED.has(r.key) ? "text-muted-foreground italic" : ""}`}>
                                <td className="py-1.5 px-2 font-medium">{r.label}</td>
                                <td className="py-1.5 px-2 text-right font-mono-data text-primary">{formatRupiah(r.rap)}</td>
                                <td className="py-1.5 px-2 text-right font-mono-data text-accent">{formatRupiah(r.actual)}</td>
                                <td className={`py-1.5 px-2 text-right font-mono-data ${r.variance >= 0 ? "text-success" : "text-destructive"}`}>{formatRupiah(r.variance)}</td>
                                <td className={`py-1.5 px-2 text-right font-mono-data ${r.pct > 100 ? "text-destructive" : r.pct > 85 ? "text-warning" : "text-success"}`}>{r.pct}%</td>
                              </tr>
                            ))}
                            <tr className="bg-primary/5 font-bold border-t-2 border-primary/30">
                              <td className="py-2 px-2 text-foreground text-[11px]">SUBTOTAL <span className="font-normal text-[9px] text-muted-foreground">(excl. Bank Guarantee & Overhead)</span></td>
                              <td className="py-2 px-2 text-right font-mono-data text-primary">{formatRupiah(coreRap)}</td>
                              <td className="py-2 px-2 text-right font-mono-data text-accent">{formatRupiah(coreAct)}</td>
                              <td className={`py-2 px-2 text-right font-mono-data ${coreRap - coreAct >= 0 ? "text-success" : "text-destructive"}`}>{formatRupiah(coreRap - coreAct)}</td>
                              <td className={`py-2 px-2 text-right font-mono-data ${coreRap > 0 && (coreAct / coreRap) > 1 ? "text-destructive" : "text-foreground"}`}>{coreRap > 0 ? Math.round((coreAct/coreRap)*100) : 0}%</td>
                            </tr>
                            <tr className="bg-muted/60 font-bold">
                              <td className="py-2 px-2 text-foreground text-[11px]">TOTAL <span className="font-normal text-[9px] text-muted-foreground">(incl. Bank Guarantee & Overhead)</span></td>
                              <td className="py-2 px-2 text-right font-mono-data text-primary">{formatRupiah(totalRap)}</td>
                              <td className="py-2 px-2 text-right font-mono-data text-accent">{formatRupiah(totalAct)}</td>
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
                            <Bar dataKey="rap" fill="hsl(var(--primary))" name="RAP" radius={[0,4,4,0]} barSize={12} />
                            <Bar dataKey="actual" fill="hsl(var(--accent))" name="Actual" radius={[0,4,4,0]} barSize={12} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* S-Curve Tab */}
          {activeTab === "scurve" && L3 && (
            <div className="glass-card rounded-lg shadow-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-1">Progress Actual</h3>
              <p className="text-[11px] text-muted-foreground mb-3">Realisasi progress pekerjaan</p>
              <SCurveChart
                startDate={project.start_date}
                endDate={project.end_date}
                progress={project.progress}
                customData={scurveData as any}
                actualOnly
              />
            </div>
          )}
          {activeTab === "scurve" && !L3 && (() => {

            // Group curves by type (baseline + KSO / joint ops etc.)
            const curveTypes = Array.from(new Set(scurveData.map(s => s.curve_type)));
            if (!curveTypes.includes("baseline")) curveTypes.unshift("baseline");

            // Per-curve stats & last-4-periods list
            const perCurve = curveTypes.map(ct => {
              const rows = scurveData.filter(s => s.curve_type === ct);
              const actuals = rows
                .filter(s => s.actual_progress != null)
                .map(s => ({ ...s, _t: (s as any).period_date ? new Date((s as any).period_date).getTime() : s.period_order }))
                .sort((a, b) => b._t - a._t);
              const lastRow = actuals[0];
              const lastLabel = lastRow?.period_label ?? null;
              const lastAct = lastRow ? Number(lastRow.actual_progress) : null;
              const planRow = lastLabel ? rows.find(r => r.period_label === lastLabel && r.planned_progress != null) : null;
              const lastPlan = planRow ? Number(planRow.planned_progress) : null;
              const dev = lastAct != null && lastPlan != null ? lastAct - lastPlan : null;
              const spi = lastAct != null && lastPlan != null && lastPlan > 0 ? lastAct / lastPlan : null;

              // Last 4 periods (current + 3 prior) — anchored at last-actual
              const byLabel: Record<string, { label: string; order: number; date: number; plan: number | null; actual: number | null }> = {};
              for (const s of rows) {
                const key = s.period_label;
                const d = (s as any).period_date ? new Date((s as any).period_date).getTime() : s.period_order;
                if (!byLabel[key]) byLabel[key] = { label: key, order: s.period_order, date: d, plan: null, actual: null };
                if (s.planned_progress != null) byLabel[key].plan = Number(s.planned_progress);
                if (s.actual_progress != null) byLabel[key].actual = Number(s.actual_progress);
              }
              const cutoff = lastRow ? lastRow._t : Infinity;
              const list = Object.values(byLabel)
                .filter(r => r.date <= cutoff)
                .sort((a, b) => (b.date || b.order) - (a.date || a.order))
                .slice(0, 4)
                .reverse();

              return { ct, lastLabel, lastAct, lastPlan, dev, spi, list };
            });
            const extrasOnly = curveTypes.filter(c => c !== "baseline");
            const paletteFor = (ct: string) => curvePalette(ct, ct === "baseline" ? 0 : extrasOnly.indexOf(ct));

            return (
            <div className="space-y-4">
              <div className="glass-card rounded-lg shadow-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                  <h3 className="text-sm font-bold text-foreground">S-Curve — Planned vs Actual Progress</h3>
                  <GranularityToggle value={scurveGranularity} onChange={setScurveGranularity} />
                </div>
                <p className="text-[10px] text-muted-foreground mb-3">Data S-Curve dapat diedit melalui Data Entry → S-Curve Editor. {curveTypes.length > 1 && <span className="text-primary font-medium">Termasuk kurva tambahan: {curveTypes.filter(c => c !== "baseline").join(", ")}.</span>}</p>
                {(() => {
                  let chartRows: any[] = scurveData;
                  if (scurveGranularity === "monthly" && scurveData.length > 0) {
                    // Bucket by calendar month; keep the LAST row per (curve_type + month) so cumulative %
                    // is highest of the month. Assign a SHARED period_order across curves so KSO/addendum
                    // curves stay anchored to the actual calendar month (no back-drag to project start).
                    const groups: Record<string, any> = {};
                    const monthKeys = new Set<string>();
                    for (const s of scurveData) {
                      const dstr = (s as any).period_end || (s as any).period_date;
                      if (!dstr) continue;
                      const d = new Date(dstr);
                      const bkt = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
                      monthKeys.add(bkt);
                      const key = `${s.curve_type}|${bkt}`;
                      const existing = groups[key];
                      if (!existing || s.period_order > existing.period_order) groups[key] = { ...s, _bkt: bkt, _monthLabel: d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" }) };
                    }
                    const orderedMonths = Array.from(monthKeys).sort();
                    const monthOrder: Record<string, number> = {};
                    orderedMonths.forEach((m, i) => { monthOrder[m] = i; });
                    chartRows = Object.values(groups)
                      .sort((a: any, b: any) => (a.curve_type as string).localeCompare(b.curve_type) || monthOrder[a._bkt] - monthOrder[b._bkt])
                      .map((s: any) => ({ ...s, period_order: monthOrder[s._bkt], period_label: s._monthLabel }));
                  }
                  return (
                    <SCurveChart
                      startDate={project.start_date}
                      endDate={project.end_date}
                      progress={project.progress}
                      milestones={milestones}
                      customData={chartRows.length > 0 ? chartRows : undefined}
                    />
                  );
                })()}

                {/* Per-curve KPI row (SPI + Deviasi) — compact single-row layout */}
                <div className="mt-4 space-y-2">
                  {perCurve.map(({ ct, lastLabel, lastAct, lastPlan, dev, spi }) => {
                    const pal = paletteFor(ct);
                    return (
                    <div key={ct} className="bg-muted/30 rounded-lg border border-border/50 p-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide"
                          style={{ color: pal.hue, backgroundColor: `${pal.hue.replace('hsl(', 'hsla(').replace(')', ', 0.12)')}` }}
                        >
                          {ct === "baseline" ? "Baseline" : ct}
                        </span>
                        {lastLabel && <span className="text-[9px] text-muted-foreground">Cut-off: <span className="font-semibold text-foreground">{lastLabel}</span></span>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">SPI<FormulaTooltip {...FORMULAS.spi} /></span>
                        <span className={`text-sm font-bold font-mono-data ${spi != null ? (spi >= 0.95 ? "text-success" : spi >= 0.8 ? "text-warning" : "text-destructive") : "text-muted-foreground"}`}>
                          {spi != null ? spi.toFixed(2) : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase text-muted-foreground">Deviasi</span>
                        <span className={`text-sm font-bold font-mono-data ${dev == null ? "text-muted-foreground" : dev >= 0 ? "text-success" : "text-destructive"}`}>
                          {dev == null ? "N/A" : `${dev > 0 ? "+" : ""}${dev.toFixed(1)}%`}
                        </span>
                      </div>
                      {lastAct != null && lastPlan != null && (
                        <div className="text-[10px] text-muted-foreground ml-auto font-mono-data flex items-center gap-2">
                          <span>Plan <span className="font-semibold" style={{ color: pal.plan }}>{lastPlan.toFixed(1)}%</span></span>
                          <span className="text-border">|</span>
                          <span>Actual <span className="font-semibold" style={{ color: pal.actual }}>{lastAct.toFixed(1)}%</span></span>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>

              {/* Reporting Periods Summary — all curves merged into one card, side-by-side when multiple */}
              {perCurve.some(pc => pc.list.length > 0) && (
                <div className="glass-card rounded-lg shadow-card p-4">
                  <h3 className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" /> Ringkasan Periode Pelaporan
                  </h3>
                  <p className="text-[10px] text-muted-foreground mb-3">Periode Actual terakhir dan 3 periode sebelumnya — Planned vs Actual Progress per kurva.</p>
                  <div className={`grid gap-3 ${perCurve.filter(pc => pc.list.length > 0).length > 1 ? "lg:grid-cols-2" : "grid-cols-1"}`}>
                    {perCurve.map(({ ct, lastLabel, list }) => {
                      if (list.length === 0) return null;
                      const pal = paletteFor(ct);
                      return (
                        <div key={ct} className="border border-border rounded-md overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b border-border">
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide"
                              style={{ color: pal.hue, backgroundColor: `${pal.hue.replace('hsl(', 'hsla(').replace(')', ', 0.12)')}` }}
                            >
                              {ct === "baseline" ? "Baseline" : ct}
                            </span>
                            <span className="text-[9px] text-muted-foreground">Cut-off: <span className="font-semibold text-foreground">{lastLabel || "—"}</span></span>
                          </div>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-muted/20 border-b border-border">
                                <th className="text-left py-1.5 px-2 text-[9px] uppercase text-muted-foreground font-bold">Periode</th>
                                <th className="text-right py-1.5 px-2 text-[9px] uppercase font-bold" style={{ color: pal.plan }}>Planned</th>
                                <th className="text-right py-1.5 px-2 text-[9px] uppercase font-bold" style={{ color: pal.actual }}>Actual</th>
                                <th className="text-right py-1.5 px-2 text-[9px] uppercase text-muted-foreground font-bold">Deviasi</th>
                              </tr>
                            </thead>
                            <tbody>
                              {list.map((r, i) => {
                                const d = (r.actual ?? 0) - (r.plan ?? 0);
                                const isCurrent = i === list.length - 1;
                                return (
                                  <tr key={r.label} className={`border-b border-border/30 hover:bg-muted/20 ${isCurrent ? "bg-muted/30" : ""}`}>
                                    <td className="py-1.5 px-2 text-foreground font-medium">
                                      {r.label}
                                      {isCurrent && <span className="ml-1.5 text-[8px] px-1 py-0.5 rounded font-semibold uppercase" style={{ color: pal.hue, backgroundColor: `${pal.hue.replace('hsl(', 'hsla(').replace(')', ', 0.15)')}` }}>Now</span>}
                                    </td>
                                    <td className="py-1.5 px-2 text-right font-mono-data" style={{ color: pal.plan }}>{r.plan != null ? `${Number(r.plan).toFixed(1)}%` : "—"}</td>
                                    <td className="py-1.5 px-2 text-right font-mono-data font-semibold" style={{ color: pal.actual }}>{r.actual != null ? `${Number(r.actual).toFixed(1)}%` : "—"}</td>
                                    <td className={`py-1.5 px-2 text-right font-mono-data font-semibold ${r.actual == null || r.plan == null ? "text-muted-foreground" : d >= 0 ? "text-success" : "text-destructive"}`}>{r.actual == null || r.plan == null ? "—" : `${d > 0 ? "+" : ""}${d.toFixed(1)}%`}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            );
          })()}






          {/* WBS Tab */}
          {activeTab === "wbs" && L3 && (
            <div className="glass-card rounded-lg shadow-card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Progress per Work Area</h3>
              {workAreas.length === 0 ? (
                <p className="text-xs text-muted-foreground">Belum ada data WBS.</p>
              ) : workAreas.map(area => (
                <div key={area.id} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-foreground flex-1 truncate">{area.name}</span>
                  <div className="w-32 hidden sm:block"><Progress value={area.progress} className="h-1.5" /></div>
                  <span className="text-xs font-mono-data font-bold text-primary w-10 text-right">{area.progress}%</span>
                </div>
              ))}
            </div>
          )}
          {activeTab === "wbs" && !L3 && (

            <div className="space-y-3">
              {workAreas.length === 0 ? (
                <div className="glass-card rounded-lg p-8 text-center shadow-card">
                  <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Belum ada data WBS.</p>
                  <p className="text-xs text-muted-foreground mt-1">Isi melalui <Link to="/data-entry" className="text-primary hover:underline">Data Entry</Link>.</p>
                </div>
              ) : (
                <>
                  {/* === Compact Gantt for Work Areas === */}
                  {(() => {
                    const projStart = new Date(project.start_date).getTime();
                    const projEnd = new Date(project.end_date).getTime();
                    // Extend timeline to cover ALL work items (so bars starting before project start / ending after project end are fully visible when scrolling).
                    const allTimes: number[] = [projStart, projEnd];
                    workItems.forEach(wi => {
                      if (wi.start_date) allTimes.push(new Date(wi.start_date).getTime());
                      if (wi.end_date) allTimes.push(new Date(wi.end_date).getTime());
                    });
                    const rawStart = Math.min(...allTimes);
                    const rawEnd = Math.max(...allTimes);
                    // Add ~1 month padding on each side so scroll shows some breathing room.
                    const pad = 30 * 24 * 60 * 60 * 1000;
                    const pStart = rawStart - pad;
                    const pEnd = rawEnd + pad;
                    const total = Math.max(1, pEnd - pStart);
                    // Monthly ticks
                    const months: { label: string; leftPct: number; isYear: boolean }[] = [];
                    const cur = new Date(pStart);
                    cur.setDate(1);
                    while (cur.getTime() <= pEnd) {
                      const off = ((cur.getTime() - pStart) / total) * 100;
                      months.push({
                        label: cur.getMonth() === 0 ? `Jan'${String(cur.getFullYear()).slice(-2)}` : cur.toLocaleDateString("id-ID", { month: "short" }).slice(0, 3),
                        leftPct: Math.max(0, off),
                        isYear: cur.getMonth() === 0,
                      });
                      cur.setMonth(cur.getMonth() + 1);
                    }
                    const todayMs = new Date().getTime();
                    const todayPct = ((Math.min(pEnd, Math.max(pStart, todayMs)) - pStart) / total) * 100;
                    const fmt = (ms: number) => new Date(ms).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
                    type Row = { id: string; code: string; name: string; leftPct: number; widthPct: number; progressPct: number; level: 1 | 2; areaId?: string; hasChildren?: boolean; expanded?: boolean; startMs: number; endMs: number; unit?: string; qty?: string };
                    const rowsData: Row[] = [];
                    workAreas.forEach(area => {
                      const areaItems = workItems.filter(wi => wi.work_area_id === area.id);
                      const dates = areaItems.flatMap(i => [i.start_date, i.end_date]).filter(Boolean) as string[];
                      const times = dates.map(d => new Date(d).getTime());
                      const s = times.length ? Math.min(...times) : projStart;
                      const e = times.length ? Math.max(...times) : projEnd;
                      const isExp = expandedTimeline.has(area.id);
                      rowsData.push({
                        id: area.id, code: area.code, name: area.name, level: 1,
                        leftPct: ((s - pStart) / total) * 100,
                        widthPct: Math.max(0.5, ((e - s) / total) * 100),
                        progressPct: area.progress || 0,
                        areaId: area.id, hasChildren: areaItems.length > 0, expanded: isExp,
                        startMs: s, endMs: e,
                      });
                      if (isExp) {
                        areaItems.forEach(wi => {
                          const ws = wi.start_date ? new Date(wi.start_date).getTime() : s;
                          const we = wi.end_date ? new Date(wi.end_date).getTime() : e;
                          rowsData.push({
                            id: wi.id, code: wi.code, name: wi.name, level: 2,
                            leftPct: ((ws - pStart) / total) * 100,
                            widthPct: Math.max(0.5, ((we - ws) / total) * 100),
                            progressPct: wi.progress || 0,
                            startMs: ws, endMs: we,
                            unit: wi.unit, qty: `${Number(wi.qty_completed)}/${Number(wi.qty_total)}`,
                          });
                        });
                      }
                    });
                    const timelineMinPx = Math.max(1100, months.length * 70);
                    return (
                      <div className="glass-card rounded-lg shadow-card p-4">
                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                          <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> Work Areas — Timeline & Progress</h3>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <div className="flex items-center gap-1"><div className="w-3 h-2 rounded-sm bg-primary/25" /> Duration</div>
                            <div className="flex items-center gap-1"><div className="w-3 h-2 rounded-sm bg-primary" /> Progress</div>
                            <div className="flex items-center gap-1"><div className="w-0.5 h-3 bg-destructive" /> Today</div>
                            <span className="hidden sm:inline text-muted-foreground/70">· Klik baris parent untuk expand level 2 · Scroll ↔ untuk lihat start &amp; finish</span>
                          </div>
                        </div>
                        <div
                          className="overflow-auto max-h-[480px] border border-border rounded-md bg-muted/10 relative"
                          onMouseLeave={() => setGanttHover(null)}
                        >
                          <div style={{ minWidth: `${220 + timelineMinPx}px` }}>
                            {/* Month header (sticky top) */}
                            <div className="sticky top-0 z-20 flex h-6 border-b border-border bg-muted/90 backdrop-blur">
                              <div className="sticky left-0 z-30 w-[220px] shrink-0 bg-muted/90 border-r border-border flex items-center px-2 text-[9px] uppercase text-muted-foreground font-semibold">Work Item</div>
                              <div className="relative flex-1" style={{ minWidth: `${timelineMinPx}px` }}>
                                {months.map((m, i) => (
                                  <div key={i} className={`absolute top-0 h-full flex items-center pl-1 border-l ${m.isYear ? "border-border" : "border-border/40"}`} style={{ left: `${m.leftPct}%` }}>
                                    <span className={`font-mono-data ${m.isYear ? "text-[9px] font-bold text-foreground" : "text-[8px] text-muted-foreground"}`}>{m.label}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {/* Rows */}
                            <div>
                              {rowsData.map(({ id, code, name, leftPct, widthPct, progressPct, level, areaId, hasChildren, expanded, startMs, endMs, unit, qty }) => {
                                const clickable = level === 1 && hasChildren;
                                const durationDays = Math.max(0, Math.round((endMs - startMs) / 86400000));
                                const remainingDays = Math.max(0, Math.ceil((endMs - todayMs) / 86400000));
                                return (
                                  <div
                                    key={id}
                                    onClick={clickable ? () => toggleTimeline(areaId!) : undefined}
                                    className={`flex border-b border-border/30 last:border-0 hover:bg-muted/20 ${level === 2 ? "h-7 bg-muted/5" : "h-9"} ${clickable ? "cursor-pointer" : ""}`}
                                  >
                                    {/* Sticky left column (frozen on horizontal scroll) */}
                                    <div className={`sticky left-0 z-10 w-[220px] shrink-0 flex items-center px-2 gap-1.5 bg-card border-r border-border/50 ${level === 2 ? "pl-6" : ""}`}>
                                      {level === 1 && (
                                        hasChildren ? <ChevronDown className={`h-3 w-3 text-muted-foreground shrink-0 transition-transform ${expanded ? "" : "-rotate-90"}`} /> : <div className="w-3 shrink-0" />
                                      )}
                                      <span className={`text-[9px] font-mono-data px-1 rounded shrink-0 ${level === 1 ? "text-primary bg-primary/10" : "text-muted-foreground bg-muted"}`}>{code}</span>
                                      <span className={`text-[10px] truncate ${level === 1 ? "text-foreground font-semibold" : "text-muted-foreground"}`}>{name}</span>
                                    </div>
                                    {/* Timeline area */}
                                    <div className="relative flex-1" style={{ minWidth: `${timelineMinPx}px` }}>
                                      <div
                                        className={`absolute top-1/2 -translate-y-1/2 rounded-sm cursor-default ${level === 1 ? "h-3 bg-primary/25 hover:bg-primary/40" : "h-2 bg-accent/25 hover:bg-accent/40"}`}
                                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                                        onMouseMove={(e) => setGanttHover({ x: e.clientX, y: e.clientY, code, name, startMs, endMs, durationDays, remainingDays, progressPct, qty: qty != null ? String(qty) : undefined, unit: unit ?? undefined, level: level as 1 | 2 })}
                                        onMouseLeave={() => setGanttHover(null)}
                                      />
                                      <div className={`absolute top-1/2 -translate-y-1/2 rounded-sm pointer-events-none ${level === 1 ? "h-3 bg-primary" : "h-2 bg-accent"}`} style={{ left: `${leftPct}%`, width: `${(widthPct * progressPct) / 100}%` }} />
                                      <div className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-end pr-1 pointer-events-none ${level === 1 ? "h-3" : "h-2"}`} style={{ left: `${leftPct}%`, width: `${widthPct}%` }}>
                                        <span className="text-[8px] font-mono-data font-bold text-foreground bg-card/80 px-0.5 rounded">{progressPct}%</span>
                                      </div>
                                      <div className="absolute top-0 bottom-0 w-0.5 bg-destructive z-[1] pointer-events-none" style={{ left: `${todayPct}%` }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          {/* Cursor-following tooltip (fixed positioning) */}
                          {ganttHover && (
                            <div
                              className="pointer-events-none fixed z-50 bg-card border border-border rounded-md shadow-lg px-2.5 py-1.5 text-[10px] whitespace-nowrap"
                              style={{
                                left: Math.min(window.innerWidth - 260, ganttHover.x + 12),
                                top: Math.max(8, ganttHover.y - 68),
                              }}
                            >
                              <p className="font-bold text-foreground mb-0.5">{ganttHover.code} — {ganttHover.name}</p>
                              <p className="text-muted-foreground">Start: <span className="font-mono-data text-foreground">{fmt(ganttHover.startMs)}</span> · Finish: <span className="font-mono-data text-foreground">{fmt(ganttHover.endMs)}</span></p>
                              <p className="text-muted-foreground">Durasi: <span className="font-mono-data text-foreground">{ganttHover.durationDays}d</span> · Sisa: <span className={`font-mono-data ${ganttHover.remainingDays === 0 ? "text-destructive" : "text-foreground"}`}>{ganttHover.remainingDays}d</span></p>
                              <p className="text-muted-foreground">Progress: <span className="font-mono-data font-semibold text-primary">{ganttHover.progressPct}%</span>{ganttHover.qty ? <> · Qty: <span className="font-mono-data text-foreground">{ganttHover.qty} {ganttHover.unit || ""}</span></> : null}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );

                  })()}



                  <div className="max-h-[560px] overflow-y-auto space-y-3 pr-1">
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
                  </div>
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
                                {L3 ? (
                                  ms.status === "completed" && <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium border-success/30 bg-success/10 text-success">Selesai</span>
                                ) : (
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${cfg.className}`}>{isLate ? "! Terlambat" : cfg.label}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                                {!L3 && <span>Target: <span className="font-mono-data text-foreground">{new Date(ms.target_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span></span>}
                                {ms.actual_date && <span>Aktual: <span className="font-mono-data text-foreground">{new Date(ms.actual_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span></span>}
                                {!L3 && ms.weight > 0 && <span>Bobot: <span className="font-mono-data text-foreground">{ms.weight}%</span></span>}

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
                    {(() => {
                      const countBy = (keys: string[]) => procurementItems.filter(i => keys.includes(i.status)).length;
                      const cards = [
                        { label: "Total",     value: procurementItems.length,                                     tone: "text-foreground", bg: "bg-muted/40 border-border" },
                        { label: "PR",        value: countBy(["pr","rfq-sent","ded","bq","planned"]),             tone: "text-info",       bg: "bg-info/5 border-info/30" },
                        { label: "PO",        value: countBy(["po","po-issued","rfq","approval","fabrication"]), tone: "text-primary",    bg: "bg-primary/5 border-primary/30" },
                        { label: "Delivery",  value: countBy(["delivery"]),                                       tone: "text-accent",     bg: "bg-accent/5 border-accent/30" },
                        { label: "On Site",   value: countBy(["onsite","installed"]),                             tone: "text-success",    bg: "bg-success/5 border-success/30" },
                      ];
                      const totalCost = procurementItems.reduce((s, i) => s + i.amount, 0);
                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                          {cards.map(c => (
                            <div key={c.label} className={`rounded-lg p-3 border text-center ${c.bg}`}>
                              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{c.label}</p>
                              <p className={`text-lg font-bold font-mono-data ${c.tone}`}>{c.value}</p>
                            </div>
                          ))}
                          <div className="rounded-lg p-3 border border-border bg-muted/40 text-center col-span-2 sm:col-span-3 lg:col-span-1">
                            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Total Cost</p>
                            <p className="text-lg font-bold font-mono-data text-foreground">{formatIDR(totalCost)}</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="glass-card rounded-lg shadow-card overflow-hidden">
                    <div className="overflow-auto max-h-[520px]">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-muted border-b border-border">
                            <th rowSpan={2} className="text-left py-2 px-3 text-[9px] uppercase text-muted-foreground align-bottom">Item</th>
                            <th rowSpan={2} className="text-left py-2 px-3 text-[9px] uppercase text-muted-foreground align-bottom">Vendor</th>
                            <th rowSpan={2} className="text-right py-2 px-3 text-[9px] uppercase text-muted-foreground align-bottom">Amount</th>
                            <th rowSpan={2} className="text-center py-2 px-3 text-[9px] uppercase text-muted-foreground align-bottom">Status</th>
                            {["PR","PO","Delivery","On Site"].map(g => (
                              <th key={g} colSpan={2} className="text-center py-1 px-2 text-[9px] uppercase text-muted-foreground border-l border-border">{g}</th>
                            ))}
                          </tr>
                          <tr className="bg-muted/70 border-b border-border">
                            {["PR","PO","Delivery","On Site"].map(g => (
                              <Fragment key={g}>
                                <th className="text-center py-1 px-2 text-[8px] uppercase text-muted-foreground border-l border-border font-normal">Plan</th>
                                <th className="text-center py-1 px-2 text-[8px] uppercase text-muted-foreground font-normal">Actual</th>
                              </Fragment>
                            ))}

                          </tr>
                        </thead>
                        <tbody>
                          {procurementItems.map(item => {
                            const pairs: [string, string][] = [
                              ["pr_plan_date","rfq_date"],
                              ["po_plan_date","po_date"],
                              ["delivery_plan_date","delivery_date"],
                              ["onsite_plan_date","install_date"],
                            ];
                            const fmtD = (v: any) => v ? new Date(v).toLocaleDateString("id-ID", {day:"numeric",month:"short"}) : "—";
                            return (
                            <tr key={item.id} className="border-b border-border/30 hover:bg-muted/20">
                              <td className="py-2 px-3"><p className="font-medium text-foreground">{item.item_name}</p>{item.description && <p className="text-[9px] text-muted-foreground">{item.description}</p>}</td>
                              <td className="py-2 px-3 text-muted-foreground">{item.vendor || "—"}</td>
                              <td className="py-2 px-3 text-right font-mono-data text-foreground">{formatIDR(item.amount)}</td>
                              <td className="py-2 px-3 text-center"><span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${procStatusColors[item.status] || ""}`}>{procStatusLabels[item.status] || item.status}</span></td>
                              {pairs.map(([planF, actF], i) => {
                                const plan = (item as any)[planF];
                                const actual = (item as any)[actF];
                                const late = plan && actual && new Date(actual) > new Date(plan);
                                return (
                                  <Fragment key={i}>
                                    <td className="py-2 px-2 text-center text-[9px] font-mono-data text-muted-foreground border-l border-border/40">{fmtD(plan)}</td>
                                    <td className={`py-2 px-2 text-center text-[9px] font-mono-data font-semibold ${late ? "text-destructive" : actual ? "text-success" : "text-muted-foreground"}`}>{fmtD(actual)}</td>
                                  </Fragment>
                                );

                              })}
                            </tr>
                            );
                          })}
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
                    <div className="divide-y divide-border/30 overflow-auto max-h-[520px]">

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
          {activeTab === "weekly-report" && id && <WeeklyReportView projectId={id} achievementsOnly={L3} />}

          {/* Media Tab */}
          {activeTab === "media" && (
            <div className="glass-card rounded-lg shadow-card p-4">
              <div className="flex items-center gap-1 mb-4 flex-wrap">
                {([
                  { key: "weekly" as MediaTab, label: `Weekly Update (${weeklyPhotos.length})`, icon: Camera, available: true },
                  { key: "video" as MediaTab, label: "Video", icon: Video, available: !!project.video_url },
                  { key: "cctv" as MediaTab, label: "CCTV", icon: Cctv, available: !!project.cctv_url },
                  { key: "model3d" as MediaTab, label: "3D Model", icon: Box, available: !!(project as any).model_3d_url },

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
              {activeMedia === "model3d" && (project as any).model_3d_url && (
                <div className="space-y-3">
                  <a href={(project as any).model_3d_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-5 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <Box className="h-10 w-10 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground flex items-center gap-2">3D Model Viewer<span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium border border-primary/30">BIM · Autodesk</span></p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-md mt-0.5">{(project as any).model_3d_url}</p>
                    </div>
                    <ExternalLink className="h-5 w-5 text-muted-foreground ml-auto" />
                  </a>
                  <div className="rounded-lg overflow-hidden border border-border bg-muted/20" style={{ height: 520 }}>
                    <iframe src={(project as any).model_3d_url} className="w-full h-full" title="3D Model" allow="fullscreen; xr-spatial-tracking" />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "addendum" && (
            <div className="glass-card rounded-lg shadow-card overflow-hidden">
              <div className="p-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Contract Addendums</h3>
                <span className="text-[10px] text-muted-foreground">{addendums.length} entri</span>
              </div>
              {addendums.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Belum ada addendum untuk proyek ini.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">ID</th>
                        <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Date</th>
                        <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Description</th>
                        <th className="text-right py-2 px-3 text-[10px] uppercase text-muted-foreground">Cost Impact</th>
                        <th className="text-right py-2 px-3 text-[10px] uppercase text-muted-foreground">Schedule</th>
                        <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Status</th>
                        
                      </tr>
                    </thead>
                    <tbody>
                      {addendums.map((a: any) => (
                        <tr key={a.id} className="border-b border-border/30 hover:bg-muted/30">
                          <td className="py-2 px-3 font-mono-data text-primary whitespace-nowrap">{a.addendum_code}</td>
                          <td className="py-2 px-3 whitespace-nowrap text-foreground">{a.addendum_date ? new Date(a.addendum_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
                          <td className="py-2 px-3 text-foreground">{a.description}</td>
                          <td className={`py-2 px-3 text-right font-mono-data whitespace-nowrap ${a.cost_impact > 0 ? "text-accent" : a.cost_impact < 0 ? "text-success" : "text-muted-foreground"}`}>{a.cost_impact > 0 ? "+" : ""}{formatIDR((a.cost_impact || 0) * 1_000_000)}</td>
                          <td className={`py-2 px-3 text-right font-mono-data whitespace-nowrap ${a.schedule_impact_days > 0 ? "text-warning" : a.schedule_impact_days < 0 ? "text-success" : "text-muted-foreground"}`}>{a.schedule_impact_days > 0 ? "+" : ""}{a.schedule_impact_days}d</td>
                          <td className="py-2 px-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize ${a.approval_status === "approved" ? "bg-success/15 text-success border-success/30" : a.approval_status === "rejected" ? "bg-destructive/15 text-destructive border-destructive/30" : a.approval_status === "potential" ? "bg-primary/10 text-primary border-primary/30" : "bg-warning/15 text-warning border-warning/30"}`}>{a.approval_status === "potential" ? "Potensial" : a.approval_status}</span>
                          </td>
                          
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
