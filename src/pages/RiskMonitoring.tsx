import { useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useProjects, useAlerts } from "@/hooks/useProjects";
import { formatRupiah } from "@/lib/supabase";
import { AlertCircle, AlertTriangle, Info, CheckCircle2, Shield, ChevronDown, Share2, TrendingDown, Clock, Download, Printer, X, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";

type Severity = "critical" | "high" | "medium" | "low";

const severityConfig: Record<Severity, { label: string; icon: typeof AlertCircle; color: string; bgColor: string; borderColor: string }> = {
  critical: { label: "Critical", icon: AlertCircle, color: "text-destructive", bgColor: "bg-destructive/15", borderColor: "border-destructive/30" },
  high: { label: "High", icon: AlertTriangle, color: "text-warning", bgColor: "bg-warning/15", borderColor: "border-warning/30" },
  medium: { label: "Medium", icon: Info, color: "text-info", bgColor: "bg-info/15", borderColor: "border-info/30" },
  low: { label: "Low", icon: Info, color: "text-muted-foreground", bgColor: "bg-muted/30", borderColor: "border-border" },
};

const probLevels = ["low", "medium", "high", "very-high"];
const impactLevels = ["low", "medium", "high", "very-high"];
const probLabels: Record<string, string> = { "low": "Low", "medium": "Medium", "high": "High", "very-high": "Very High" };
const impactLabels: Record<string, string> = { "low": "Low", "medium": "Medium", "high": "High", "very-high": "Very High" };

const matrixColors: Record<string, string> = {
  "0-0": "bg-success/20", "0-1": "bg-success/20", "0-2": "bg-warning/20", "0-3": "bg-warning/20",
  "1-0": "bg-success/20", "1-1": "bg-warning/20", "1-2": "bg-warning/20", "1-3": "bg-destructive/20",
  "2-0": "bg-warning/20", "2-1": "bg-warning/20", "2-2": "bg-destructive/20", "2-3": "bg-destructive/20",
  "3-0": "bg-warning/20", "3-1": "bg-destructive/20", "3-2": "bg-destructive/20", "3-3": "bg-destructive/30",
};

const matrixRiskLevel: Record<string, string> = {
  "0-0": "Low", "0-1": "Low", "0-2": "Medium", "0-3": "Medium",
  "1-0": "Low", "1-1": "Medium", "1-2": "Medium", "1-3": "High",
  "2-0": "Medium", "2-1": "Medium", "2-2": "High", "2-3": "Critical",
  "3-0": "Medium", "3-1": "High", "3-2": "Critical", "3-3": "Critical",
};

const RiskMonitoring = () => {
  const navigate = useNavigate();
  const { data: projects = [], isLoading: lp } = useProjects();
  const { data: alerts = [], isLoading: la } = useAlerts();
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  if (lp || la) {
    return <div className="flex min-h-screen"><Sidebar /><div className="flex-1 flex items-center justify-center"><div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div></div>;
  }

  const filteredAlerts = severityFilter === "all" ? alerts : alerts.filter(a => a.severity === severityFilter);
  const counts = { critical: alerts.filter(a => a.severity === "critical").length, high: alerts.filter(a => a.severity === "high").length, medium: alerts.filter(a => a.severity === "medium").length, low: alerts.filter(a => a.severity === "low").length };

  const delayedProjects = projects.filter(p => p.status === "delayed");
  const overBudgetProjects = projects.filter(p => p.spent / p.budget > 0.9);
  const atRiskProjects = projects.filter(p => p.status === "at-risk" || p.status === "delayed");

  const matrixData: Record<string, typeof alerts> = {};
  alerts.forEach(a => {
    const pi = probLevels.indexOf(a.probability || "medium");
    const ii = impactLevels.indexOf(a.impact || "medium");
    const key = `${Math.max(0, pi)}-${Math.max(0, ii)}`;
    if (!matrixData[key]) matrixData[key] = [];
    matrixData[key].push(a);
  });

  const selectedCellAlerts = selectedCell ? (matrixData[selectedCell] || []) : [];
  const selectedCellInfo = selectedCell ? {
    prob: probLabels[probLevels[parseInt(selectedCell.split("-")[0])]],
    impact: impactLabels[impactLevels[parseInt(selectedCell.split("-")[1])]],
    level: matrixRiskLevel[selectedCell],
  } : null;

  const handleShare = async () => {
    if (navigator.share) await navigator.share({ title: "Risk Monitoring", url: window.location.href });
    else { await navigator.clipboard.writeText(window.location.href); alert("Link copied!"); }
  };

  const handleExportPDF = () => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    pdf.setFontSize(16);
    pdf.text("Risk Monitoring Report", 14, 20);
    pdf.setFontSize(9);
    pdf.text(`Generated: ${new Date().toLocaleString("id-ID")}`, 14, 27);
    pdf.text(`Critical: ${counts.critical} | High: ${counts.high} | Medium: ${counts.medium} | Low: ${counts.low}`, 14, 33);

    let y = 42;
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    ["Risk", "Severity", "Probability", "Impact", "Owner", "Mitigation"].forEach((h, i) => {
      pdf.text(h, 14 + i * 30, y);
    });
    y += 5;
    pdf.setFont("helvetica", "normal");
    alerts.forEach(a => {
      if (y > 280) { pdf.addPage(); y = 20; }
      pdf.text(a.title.slice(0, 18), 14, y);
      pdf.text(a.severity, 44, y);
      pdf.text(a.probability || "—", 74, y);
      pdf.text(a.impact || "—", 104, y);
      pdf.text((a.risk_owner || "—").slice(0, 12), 134, y);
      pdf.text((a.mitigation_plan || "—").slice(0, 20), 164, y);
      y += 5;
    });
    pdf.save(`Risk_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handlePrint = () => {
    const printW = window.open("", "_blank");
    if (!printW) return;
    printW.document.write(`<html><head><title>Risk Report</title><style>body{font-family:Arial,sans-serif;padding:20px;font-size:11px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:4px 8px;text-align:left}th{background:#f5f5f5;font-size:10px;text-transform:uppercase}</style></head><body>`);
    printW.document.write(`<h2>Risk Monitoring Report</h2><p>Critical: ${counts.critical} | High: ${counts.high} | Medium: ${counts.medium} | Low: ${counts.low}</p>`);
    printW.document.write(`<table><thead><tr><th>Risk</th><th>Severity</th><th>Probability</th><th>Impact</th><th>Owner</th><th>Mitigation</th></tr></thead><tbody>`);
    alerts.forEach(a => {
      printW.document.write(`<tr><td>${a.title}</td><td>${a.severity}</td><td>${a.probability || "—"}</td><td>${a.impact || "—"}</td><td>${a.risk_owner || "—"}</td><td>${a.mitigation_plan || "—"}</td></tr>`);
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
              <h2 className="text-lg font-bold text-foreground">Risk Monitoring</h2>
              <p className="text-xs text-muted-foreground">Manajemen risiko dan peringatan proyek</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setShowGuide(!showGuide)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${showGuide ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-foreground border-border hover:bg-muted/80"}`}><BookOpen className="h-3.5 w-3.5" /> Risk Guide</button>
              <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90"><Download className="h-3.5 w-3.5" /> Export PDF</button>
              <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 border border-border"><Printer className="h-3.5 w-3.5" /> Print</button>
              <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 border border-border"><Share2 className="h-3.5 w-3.5" /> Share</button>
            </div>
          </div>

          {/* Risk Guide Panel */}
          {showGuide && (
            <div className="glass-card rounded-lg shadow-card p-4 mb-5 border-2 border-primary/20">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Panduan Risk Level</h3>
                <button onClick={() => setShowGuide(false)} className="p-1 hover:bg-muted rounded"><X className="h-4 w-4 text-muted-foreground" /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <div className="bg-destructive/10 rounded-lg p-3 border border-destructive/20">
                  <div className="flex items-center gap-2 mb-2"><AlertCircle className="h-4 w-4 text-destructive" /><span className="text-xs font-bold text-destructive">CRITICAL</span></div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">Risiko yang dapat menghentikan proyek secara total. Membutuhkan eskalasi ke top management dan tindakan segera dalam 24 jam.</p>
                  <p className="text-[10px] text-destructive mt-1 font-medium">Contoh: Kegagalan struktural, kecelakaan fatal, pembatalan kontrak</p>
                </div>
                <div className="bg-warning/10 rounded-lg p-3 border border-warning/20">
                  <div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4 text-warning" /><span className="text-xs font-bold text-warning">HIGH</span></div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">Risiko yang menyebabkan keterlambatan signifikan atau pembengkakan biaya &gt;10%. Perlu rencana mitigasi dalam 1 minggu.</p>
                  <p className="text-[10px] text-warning mt-1 font-medium">Contoh: Keterlambatan material utama, kekurangan SDM kritis</p>
                </div>
                <div className="bg-info/10 rounded-lg p-3 border border-info/20">
                  <div className="flex items-center gap-2 mb-2"><Info className="h-4 w-4 text-info" /><span className="text-xs font-bold text-info">MEDIUM</span></div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">Risiko yang dapat memengaruhi jadwal atau biaya dalam batas toleransi (5-10%). Monitoring berkala diperlukan.</p>
                  <p className="text-[10px] text-info mt-1 font-medium">Contoh: Perubahan scope minor, cuaca buruk musiman</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 border border-border">
                  <div className="flex items-center gap-2 mb-2"><Info className="h-4 w-4 text-muted-foreground" /><span className="text-xs font-bold text-muted-foreground">LOW</span></div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">Risiko minor yang jarang terjadi dan dampaknya kecil (&lt;5%). Cukup dicatat dan dimonitor rutin.</p>
                  <p className="text-[10px] text-muted-foreground mt-1 font-medium">Contoh: Keterlambatan dokumen administrasi</p>
                </div>
              </div>
              <div className="bg-muted/20 rounded-lg p-3 border border-border/50">
                <h4 className="text-xs font-semibold text-foreground mb-2">Bagaimana Risk Berkaitan dengan Proyek?</h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-[10px] text-muted-foreground">
                  <div><span className="font-medium text-destructive">Delays</span> → Proyek yang melewati target deadline akan otomatis memunculkan alert keterlambatan.</div>
                  <div><span className="font-medium text-warning">Budget Overruns</span> → Proyek dengan pengeluaran &gt;90% dari budget akan ditandai sebagai budget overrun.</div>
                  <div><span className="font-medium text-destructive">Critical Issues</span> → Risk dengan severity "Critical" menandakan masalah yang harus segera ditangani.</div>
                  <div><span className="font-medium text-warning">High Risk</span> → Risk dengan probability dan impact tinggi memerlukan rencana mitigasi aktif.</div>
                </div>
              </div>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {(["critical", "high", "medium", "low"] as Severity[]).map(sev => {
              const cfg = severityConfig[sev];
              const Icon = cfg.icon;
              return (
                <div key={sev} className={`glass-card rounded-lg p-3 shadow-card border ${cfg.borderColor} cursor-pointer hover:shadow-card-hover transition-all`} onClick={() => setSeverityFilter(sev)}>
                  <div className="flex items-center gap-2 mb-1"><div className={`p-1.5 rounded-lg ${cfg.bgColor}`}><Icon className={`h-4 w-4 ${cfg.color}`} /></div><span className="text-[10px] uppercase tracking-wider text-muted-foreground">{cfg.label}</span></div>
                  <p className={`text-2xl font-bold font-mono-data ${cfg.color}`}>{counts[sev]}</p>
                </div>
              );
            })}
          </div>

          {/* Critical Issues Overview */}
          <div className="glass-card rounded-lg shadow-card p-4 mb-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Shield className="h-4 w-4 text-destructive" /> Project Critical Issues Summary</h3>
            <p className="text-[11px] text-muted-foreground mb-3">Ringkasan masalah kritis untuk identifikasi cepat area yang perlu akselerasi</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-destructive/10 rounded-lg p-3 border border-destructive/20">
                <div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-destructive" /><span className="text-[10px] uppercase text-muted-foreground">Delays</span></div>
                <p className="text-xl font-bold font-mono-data text-destructive">{delayedProjects.length}</p>
                <div className="mt-1 space-y-0.5">{delayedProjects.slice(0, 3).map(p => <p key={p.id} className="text-[10px] text-muted-foreground truncate cursor-pointer hover:text-primary" onClick={() => navigate(`/project/${p.id}`)}>{p.project_code} · {p.name}</p>)}</div>
              </div>
              <div className="bg-warning/10 rounded-lg p-3 border border-warning/20">
                <div className="flex items-center gap-2 mb-1"><TrendingDown className="h-4 w-4 text-warning" /><span className="text-[10px] uppercase text-muted-foreground">Budget Overruns</span></div>
                <p className="text-xl font-bold font-mono-data text-warning">{overBudgetProjects.length}</p>
                <div className="mt-1 space-y-0.5">{overBudgetProjects.slice(0, 3).map(p => <p key={p.id} className="text-[10px] text-muted-foreground truncate cursor-pointer hover:text-primary" onClick={() => navigate(`/project/${p.id}`)}>{p.project_code} · {Math.round(p.spent/p.budget*100)}%</p>)}</div>
              </div>
              <div className="bg-destructive/10 rounded-lg p-3 border border-destructive/20">
                <div className="flex items-center gap-2 mb-1"><AlertCircle className="h-4 w-4 text-destructive" /><span className="text-[10px] uppercase text-muted-foreground">Critical Issues</span></div>
                <p className="text-xl font-bold font-mono-data text-destructive">{counts.critical}</p>
              </div>
              <div className="bg-warning/10 rounded-lg p-3 border border-warning/20">
                <div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-4 w-4 text-warning" /><span className="text-[10px] uppercase text-muted-foreground">High Risks</span></div>
                <p className="text-xl font-bold font-mono-data text-warning">{counts.high}</p>
              </div>
            </div>
            {atRiskProjects.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Projects Needing Acceleration</p>
                <div className="flex flex-wrap gap-2">
                  {atRiskProjects.map(p => (
                    <button key={p.id} onClick={() => navigate(`/project/${p.id}`)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 text-xs transition-colors">
                      <div className={`w-2 h-2 rounded-full ${p.status === "delayed" ? "bg-destructive" : "bg-warning"}`} />
                      <span className="font-mono-data text-primary">{p.project_code}</span>
                      <span className="text-muted-foreground">{p.progress}%</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
            {/* Risk Matrix */}
            <div className="glass-card rounded-lg p-4 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-2">Risk Matrix</h3>
              <p className="text-[10px] text-muted-foreground mb-3">Klik sel untuk melihat detail risiko</p>
              
              <div className="bg-muted/30 rounded-lg p-2 mb-3 border border-border/50">
                <p className="text-[9px] text-muted-foreground"><strong>Probability:</strong> Kemungkinan risiko terjadi (Low → Very High)</p>
                <p className="text-[9px] text-muted-foreground"><strong>Impact:</strong> Dampak terhadap proyek (Low → Very High)</p>
                <p className="text-[9px] text-muted-foreground"><strong>Risk Level:</strong> <span className="text-success">Green=Low</span> · <span className="text-warning">Yellow=Medium</span> · <span className="text-destructive">Red=High/Critical</span></p>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-0.5">
                  <div className="w-16 text-[8px] text-muted-foreground text-right pr-1">Impact →</div>
                  {impactLevels.map(l => <div key={l} className="flex-1 text-[8px] text-center text-muted-foreground">{impactLabels[l].slice(0, 4)}</div>)}
                </div>
                {[...probLevels].reverse().map((prob, pi) => (
                  <div key={prob} className="flex items-center gap-0.5">
                    <div className="w-16 text-[8px] text-muted-foreground text-right pr-1">{probLabels[prob].slice(0, 6)}</div>
                    {impactLevels.map((imp, ii) => {
                      const key = `${3 - pi}-${ii}`;
                      const items = matrixData[key] || [];
                      const isSelected = selectedCell === key;
                      return (
                        <button key={key}
                          onClick={() => setSelectedCell(isSelected ? null : key)}
                          className={`flex-1 aspect-square rounded flex items-center justify-center text-xs font-bold ${matrixColors[key]} border transition-all cursor-pointer hover:opacity-80 ${isSelected ? "border-primary ring-2 ring-primary/30 scale-105" : "border-border/30"}`}>
                          {items.length > 0 ? <span className="text-foreground">{items.length}</span> : "·"}
                        </button>
                      );
                    })}
                  </div>
                ))}
                <div className="flex items-center gap-0.5 mt-1">
                  <div className="w-16 text-[8px] text-muted-foreground text-right pr-1">Prob ↑</div>
                </div>
              </div>

              {/* Selected cell detail */}
              {selectedCell && selectedCellInfo && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-[10px] font-medium text-foreground">Probability: {selectedCellInfo.prob} × Impact: {selectedCellInfo.impact}</p>
                      <p className="text-[10px] text-muted-foreground">Risk Level: <span className={`font-bold ${selectedCellInfo.level === "Critical" ? "text-destructive" : selectedCellInfo.level === "High" ? "text-warning" : selectedCellInfo.level === "Medium" ? "text-accent" : "text-success"}`}>{selectedCellInfo.level}</span></p>
                    </div>
                    <button onClick={() => setSelectedCell(null)} className="p-1 hover:bg-muted rounded"><X className="h-3 w-3 text-muted-foreground" /></button>
                  </div>
                  {selectedCellAlerts.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground italic">Tidak ada risiko di kategori ini.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                      {selectedCellAlerts.map(a => (
                        <div key={a.id} className="bg-muted/30 rounded p-2 border border-border/50 cursor-pointer hover:border-primary/50" onClick={() => a.project_id && navigate(`/project/${a.project_id}`)}>
                          <p className="text-[10px] font-medium text-foreground">{a.title}</p>
                          {a.projects && <p className="text-[9px] text-primary">{a.projects.project_code}</p>}
                          {a.risk_owner && <p className="text-[9px] text-muted-foreground">Owner: {a.risk_owner}</p>}
                          {a.mitigation_plan && <p className="text-[9px] text-info">⚡ {a.mitigation_plan}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Alerts List */}
            <div className="lg:col-span-2 glass-card rounded-lg shadow-card overflow-hidden">
              <div className="p-3 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Risk Register</h3>
                  <p className="text-[11px] text-muted-foreground">{filteredAlerts.length} items</p>
                </div>
                <div className="relative">
                  <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value as any)}
                    className="appearance-none pl-3 pr-8 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
                    <option value="all">All ({alerts.length})</option>
                    {(["critical", "high", "medium", "low"] as Severity[]).map(s => <option key={s} value={s}>{severityConfig[s].label} ({counts[s]})</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div className="divide-y divide-border/30 max-h-[500px] overflow-y-auto">
                {filteredAlerts.map(alert => {
                  const cfg = severityConfig[alert.severity];
                  const Icon = cfg.icon;
                  return (
                    <div key={alert.id} className="p-3 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => alert.project_id && navigate(`/project/${alert.project_id}`)}>
                      <div className="flex items-start gap-2">
                        <div className={`p-1 rounded-lg ${cfg.bgColor} mt-0.5`}><Icon className={`h-3.5 w-3.5 ${cfg.color}`} /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <h4 className="text-xs font-medium text-foreground">{alert.title}</h4>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium border ${cfg.bgColor} ${cfg.color} ${cfg.borderColor}`}>{cfg.label}</span>
                            {alert.probability && <span className="text-[9px] text-muted-foreground">P: {alert.probability}</span>}
                            {alert.impact && <span className="text-[9px] text-muted-foreground">I: {alert.impact}</span>}
                          </div>
                          {alert.description && <p className="text-[11px] text-muted-foreground mb-1">{alert.description}</p>}
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                            {alert.projects && <span className="font-mono-data text-primary">{alert.projects.project_code}</span>}
                            {alert.risk_owner && <span>Owner: <span className="text-foreground">{alert.risk_owner}</span></span>}
                          </div>
                          {alert.mitigation_plan && <p className="text-[10px] text-info mt-0.5">⚡ {alert.mitigation_plan}</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredAlerts.length === 0 && <div className="p-8 text-center text-muted-foreground"><CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" /><p className="text-sm">Tidak ada peringatan.</p></div>}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RiskMonitoring;
