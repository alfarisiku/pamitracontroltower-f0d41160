import { useState, useRef } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useProjects, useAlerts, useMonthlyBudgets, useWorkAreas, useWorkItems, useMilestones } from "@/hooks/useProjects";
import { formatRupiah } from "@/lib/supabase";
import { FileText, Download, Printer, Share2, ChevronDown } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const Reporting = () => {
  const { data: projects = [] } = useProjects();
  const { data: alerts = [] } = useAlerts();
  const { data: budgets = [] } = useMonthlyBudgets();
  const [reportType, setReportType] = useState<"general" | "detailed">("general");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [generating, setGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const filteredProjects = selectedProjectId === "all" ? projects : projects.filter(p => p.id === selectedProjectId);
  const { data: workAreas = [] } = useWorkAreas(selectedProjectId !== "all" ? selectedProjectId : undefined);
  const waIds = workAreas.map(wa => wa.id);
  const { data: workItems = [] } = useWorkItems(waIds);
  const { data: milestones = [] } = useMilestones(selectedProjectId !== "all" ? selectedProjectId : undefined);

  const totalBudget = filteredProjects.reduce((s, p) => s + p.budget, 0);
  const totalSpent = filteredProjects.reduce((s, p) => s + p.spent, 0);
  const avgProgress = filteredProjects.length > 0 ? Math.round(filteredProjects.reduce((s, p) => s + p.progress, 0) / filteredProjects.length) : 0;

  const generatePDF = async () => {
    if (!reportRef.current) return;
    setGenerating(true);
    try {
      const el = reportRef.current;
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const isLandscape = reportType === "general";
      const pdf = new jsPDF({ orientation: isLandscape ? "landscape" : "portrait", unit: "mm", format: "a4" });
      const pW = pdf.internal.pageSize.getWidth();
      const pH = pdf.internal.pageSize.getHeight();
      const imgW = pW - 20;
      const imgH = (canvas.height * imgW) / canvas.width;

      if (imgH <= pH - 20) {
        pdf.addImage(imgData, "PNG", 10, 10, imgW, imgH);
      } else {
        const pageCH = pH - 20;
        let srcY = 0;
        while (srcY < canvas.height) {
          const sliceH = Math.min((pageCH / imgW) * canvas.width, canvas.height - srcY);
          const sc = document.createElement("canvas");
          sc.width = canvas.width; sc.height = sliceH;
          sc.getContext("2d")!.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
          const si = sc.toDataURL("image/png");
          const sih = (sliceH * imgW) / canvas.width;
          if (srcY > 0) pdf.addPage();
          pdf.addImage(si, "PNG", 10, 10, imgW, sih);
          srcY += sliceH;
        }
      }
      pdf.save(`Report_${reportType}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally { setGenerating(false); }
  };

  const handlePrint = () => {
    const printW = window.open("", "_blank");
    if (!printW || !reportRef.current) return;
    printW.document.write(`<html><head><title>Report</title><style>body{font-family:Arial,sans-serif;padding:20px;font-size:11px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:4px 8px;text-align:left}th{background:#f5f5f5;font-size:10px;text-transform:uppercase}.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:9px}</style></head><body>`);
    printW.document.write(reportRef.current.innerHTML);
    printW.document.write("</body></html>");
    printW.document.close();
    printW.print();
  };

  const handleShare = async () => {
    if (navigator.share) await navigator.share({ title: "EPC Project Report", text: `PMO Report - ${new Date().toLocaleDateString("id-ID")}`, url: window.location.href });
    else { await navigator.clipboard.writeText(window.location.href); alert("Link copied!"); }
  };

  const filteredAlerts = selectedProjectId === "all" ? alerts : alerts.filter(a => a.project_id === selectedProjectId);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-3 sm:p-5 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <DashboardHeader />

          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Reporting</h2>
              <p className="text-xs text-muted-foreground">Generate & export laporan proyek EPC</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={generatePDF} disabled={generating} className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50"><Download className="h-3.5 w-3.5" /> {generating ? "..." : "Export PDF"}</button>
              <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 border border-border"><Printer className="h-3.5 w-3.5" /> Print</button>
              <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-2 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 border border-border"><Share2 className="h-3.5 w-3.5" /> Share</button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
              <button onClick={() => setReportType("general")} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${reportType === "general" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>General (Landscape)</button>
              <button onClick={() => setReportType("detailed")} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${reportType === "detailed" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Detailed (Portrait)</button>
            </div>
            <div className="relative">
              <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
                <option value="all">Semua Proyek</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Report Content */}
          <div ref={reportRef} className="glass-card rounded-lg shadow-card p-6 space-y-5" style={{ backgroundColor: "white" }}>
            <div className="text-center border-b border-border pb-4">
              <h2 className="text-lg font-bold text-foreground">PT Pamitra Jaya Konstruksi</h2>
              <h3 className="text-sm text-muted-foreground">{reportType === "general" ? "General Project Report — Executive Summary" : "Detailed Project Report — Full Breakdown"}</h3>
              <p className="text-xs text-muted-foreground mt-1">{new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
            </div>

            {/* 1. Executive Summary */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-1">1. Executive Summary</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Total Projects", value: String(filteredProjects.length), color: "text-primary" },
                  { label: "Total Budget", value: formatRupiah(totalBudget), color: "text-accent" },
                  { label: "Avg Progress", value: `${avgProgress}%`, color: "text-success" },
                  { label: "Active Alerts", value: String(filteredAlerts.length), color: "text-destructive" },
                ].map(kpi => (
                  <div key={kpi.label} className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">{kpi.label}</p>
                    <p className={`text-lg font-bold font-mono-data ${kpi.color}`}>{kpi.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Project Table */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-1">2. {reportType === "general" ? "Schedule & Cost Summary" : "Project Detail with WBS"}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-border">
                  <thead><tr className="bg-muted/50">
                    <th className="text-left py-2 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Code</th>
                    <th className="text-left py-2 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Project</th>
                    <th className="text-left py-2 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Status</th>
                    <th className="text-right py-2 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Progress</th>
                    <th className="text-right py-2 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Budget</th>
                    <th className="text-right py-2 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Spent</th>
                    <th className="text-right py-2 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Margin</th>
                    {reportType === "detailed" && <>
                      <th className="text-right py-2 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">CPI</th>
                      <th className="text-left py-2 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">End</th>
                    </>}
                  </tr></thead>
                  <tbody>
                    {filteredProjects.map(p => {
                      const cpi = p.spent > 0 ? ((p.progress / 100) * p.budget) / p.spent : 1;
                      const margin = Math.round((p.budget - p.spent) / p.budget * 100);
                      return (
                        <tr key={p.id} className="border-b border-border/30">
                          <td className="py-1.5 px-2 font-mono-data text-primary">{p.project_code}</td>
                          <td className="py-1.5 px-2 font-medium text-foreground">{p.name}</td>
                          <td className="py-1.5 px-2"><span className={`text-[9px] px-1.5 py-0.5 rounded ${
                            p.status === "on-track" ? "bg-success/15 text-success" : p.status === "at-risk" ? "bg-warning/15 text-warning" :
                            p.status === "delayed" ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"
                          }`}>{p.status}</span></td>
                          <td className="py-1.5 px-2 text-right font-mono-data">{p.progress}%</td>
                          <td className="py-1.5 px-2 text-right font-mono-data text-accent">{formatRupiah(p.budget)}</td>
                          <td className="py-1.5 px-2 text-right font-mono-data">{formatRupiah(p.spent)}</td>
                          <td className={`py-1.5 px-2 text-right font-mono-data font-bold ${margin > 10 ? "text-success" : "text-destructive"}`}>{margin}%</td>
                          {reportType === "detailed" && <>
                            <td className={`py-1.5 px-2 text-right font-mono-data font-bold ${cpi >= 1 ? "text-success" : "text-destructive"}`}>{cpi.toFixed(2)}</td>
                            <td className="py-1.5 px-2 font-mono-data text-muted-foreground">{new Date(p.end_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" })}</td>
                          </>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Detailed WBS (only in detailed report) */}
            {reportType === "detailed" && selectedProjectId !== "all" && workAreas.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-1">3. WBS Breakdown</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-border">
                    <thead><tr className="bg-muted/50">
                      <th className="text-left py-1.5 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Code</th>
                      <th className="text-left py-1.5 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Name</th>
                      <th className="text-right py-1.5 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Qty</th>
                      <th className="text-right py-1.5 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Done</th>
                      <th className="text-right py-1.5 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Rem</th>
                      <th className="text-right py-1.5 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">%</th>
                    </tr></thead>
                    <tbody>
                      {workAreas.map(wa => {
                        const items = workItems.filter(wi => wi.work_area_id === wa.id);
                        return [
                          <tr key={wa.id} className="bg-muted/30 border-b border-border">
                            <td className="py-1 px-2 font-mono-data text-primary font-bold" colSpan={5}>{wa.code} — {wa.name}</td>
                            <td className="py-1 px-2 text-right font-mono-data font-bold text-primary">{wa.progress}%</td>
                          </tr>,
                          ...items.map(wi => (
                            <tr key={wi.id} className="border-b border-border/30">
                              <td className="py-1 px-2 pl-4 font-mono-data text-muted-foreground">{wi.code}</td>
                              <td className="py-1 px-2 text-foreground">{wi.name}</td>
                              <td className="py-1 px-2 text-right font-mono-data">{Number(wi.qty_total).toLocaleString()} {wi.unit}</td>
                              <td className="py-1 px-2 text-right font-mono-data">{Number(wi.qty_completed).toLocaleString()}</td>
                              <td className="py-1 px-2 text-right font-mono-data text-warning">{(Number(wi.qty_total) - Number(wi.qty_completed)).toLocaleString()}</td>
                              <td className="py-1 px-2 text-right font-mono-data">{wi.progress}%</td>
                            </tr>
                          ))
                        ];
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Milestones in detailed */}
            {reportType === "detailed" && selectedProjectId !== "all" && milestones.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-1">4. Milestone Tracking</h4>
                <table className="w-full text-xs border border-border">
                  <thead><tr className="bg-muted/50">
                    <th className="text-left py-1.5 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Milestone</th>
                    <th className="text-left py-1.5 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Phase</th>
                    <th className="text-left py-1.5 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Target</th>
                    <th className="text-left py-1.5 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Status</th>
                    <th className="text-right py-1.5 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Weight</th>
                  </tr></thead>
                  <tbody>
                    {milestones.map(ms => (
                      <tr key={ms.id} className="border-b border-border/30">
                        <td className="py-1 px-2 text-foreground">{ms.name}</td>
                        <td className="py-1 px-2 text-muted-foreground">{ms.phase}</td>
                        <td className="py-1 px-2 font-mono-data">{new Date(ms.target_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" })}</td>
                        <td className="py-1 px-2 capitalize">{ms.status}</td>
                        <td className="py-1 px-2 text-right font-mono-data">{ms.weight}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Risk Summary */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-1">{reportType === "detailed" && selectedProjectId !== "all" ? "5" : "3"}. Risk Summary</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {["critical", "high", "medium", "low"].map(sev => {
                  const cnt = filteredAlerts.filter(a => a.severity === sev).length;
                  return (
                    <div key={sev} className="bg-muted/20 rounded p-2 border border-border/50 text-center">
                      <p className="text-[10px] uppercase text-muted-foreground">{sev}</p>
                      <p className={`text-lg font-bold font-mono-data ${sev === "critical" ? "text-destructive" : sev === "high" ? "text-warning" : "text-foreground"}`}>{cnt}</p>
                    </div>
                  );
                })}
              </div>
              {reportType === "detailed" && filteredAlerts.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs border border-border">
                    <thead><tr className="bg-muted/50">
                      <th className="text-left py-1.5 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Risk</th>
                      <th className="text-left py-1.5 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Severity</th>
                      <th className="text-left py-1.5 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">P/I</th>
                      <th className="text-left py-1.5 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Owner</th>
                      <th className="text-left py-1.5 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Mitigation</th>
                    </tr></thead>
                    <tbody>
                      {filteredAlerts.map(a => (
                        <tr key={a.id} className="border-b border-border/30">
                          <td className="py-1 px-2 text-foreground">{a.title}</td>
                          <td className="py-1 px-2 capitalize text-muted-foreground">{a.severity}</td>
                          <td className="py-1 px-2 text-muted-foreground capitalize">{a.probability}/{a.impact}</td>
                          <td className="py-1 px-2 text-muted-foreground">{a.risk_owner || "—"}</td>
                          <td className="py-1 px-2 text-muted-foreground">{a.mitigation_plan || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Schedule Performance */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-1">{reportType === "detailed" && selectedProjectId !== "all" ? "6" : "4"}. Schedule Performance</h4>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: "On Track", count: filteredProjects.filter(p => p.status === "on-track").length, color: "bg-success/10 border-success/20", textColor: "text-success" },
                  { label: "At Risk", count: filteredProjects.filter(p => p.status === "at-risk").length, color: "bg-warning/10 border-warning/20", textColor: "text-warning" },
                  { label: "Delayed", count: filteredProjects.filter(p => p.status === "delayed").length, color: "bg-destructive/10 border-destructive/20", textColor: "text-destructive" },
                ].map(s => (
                  <div key={s.label} className={`rounded-lg p-3 border ${s.color}`}>
                    <p className={`text-2xl font-bold font-mono-data ${s.textColor}`}>{s.count}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-3 text-center text-[10px] text-muted-foreground">
              <p>Report generated by Pamitra Control Tower · {new Date().toLocaleString("id-ID")}</p>
              <p>© 2026 PT Pamitra Jaya Konstruksi — Confidential</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Reporting;
