import { useState, useRef } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useProjects, useAlerts, useMonthlyBudgets } from "@/hooks/useProjects";
import { formatRupiah } from "@/lib/supabase";
import { FileText, Download, Printer, Share2, Camera, ChevronDown } from "lucide-react";
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
  const totalBudget = filteredProjects.reduce((s, p) => s + p.budget, 0);
  const totalSpent = filteredProjects.reduce((s, p) => s + p.spent, 0);
  const avgProgress = filteredProjects.length > 0 ? Math.round(filteredProjects.reduce((s, p) => s + p.progress, 0) / filteredProjects.length) : 0;

  const generatePDF = async () => {
    if (!reportRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const isLandscape = reportType === "general";
      const pdf = new jsPDF({ orientation: isLandscape ? "landscape" : "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW - 20;
      const imgH = (canvas.height * imgW) / canvas.width;

      let y = 10;
      if (imgH <= pageH - 20) {
        pdf.addImage(imgData, "PNG", 10, y, imgW, imgH);
      } else {
        // Multi-page
        const pageContentH = pageH - 20;
        let srcY = 0;
        while (srcY < canvas.height) {
          const sliceH = Math.min((pageContentH / imgW) * canvas.width, canvas.height - srcY);
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceH;
          const ctx = sliceCanvas.getContext("2d")!;
          ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
          const sliceImg = sliceCanvas.toDataURL("image/png");
          const sliceImgH = (sliceH * imgW) / canvas.width;
          if (srcY > 0) pdf.addPage();
          pdf.addImage(sliceImg, "PNG", 10, 10, imgW, sliceImgH);
          srcY += sliceH;
        }
      }
      pdf.save(`Report_${reportType}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => window.print();

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: "EPC Project Report", text: `PMO Report - ${new Date().toLocaleDateString("id-ID")}`, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  const handleScreenCapture = async () => {
    if (!reportRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = `Dashboard_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-3 sm:p-5 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <DashboardHeader />

          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Reporting Dashboard
              </h2>
              <p className="text-xs text-muted-foreground">Generate & export laporan proyek EPC</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={generatePDF} disabled={generating} className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                <Download className="h-3.5 w-3.5" /> {generating ? "Generating..." : "Export PDF"}
              </button>
              <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 border border-border transition-colors">
                <Printer className="h-3.5 w-3.5" /> Print
              </button>
              <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-2 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 border border-border transition-colors">
                <Share2 className="h-3.5 w-3.5" /> Share
              </button>
              <button onClick={handleScreenCapture} disabled={generating} className="flex items-center gap-1.5 px-3 py-2 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 border border-border transition-colors">
                <Camera className="h-3.5 w-3.5" /> Capture
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
              <button onClick={() => setReportType("general")} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${reportType === "general" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                General (Landscape)
              </button>
              <button onClick={() => setReportType("detailed")} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${reportType === "detailed" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                Detailed (Portrait)
              </button>
            </div>
            <div className="relative">
              <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
                <option value="all">Semua Proyek</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Report Content */}
          <div ref={reportRef} className="glass-card rounded-lg shadow-card p-6 space-y-6">
            {/* Report Header */}
            <div className="text-center border-b border-border pb-4">
              <h2 className="text-lg font-bold text-foreground">PT Pamitra Jaya Konstruksi</h2>
              <h3 className="text-sm text-muted-foreground">{reportType === "general" ? "General Project Report" : "Detailed Project Report"}</h3>
              <p className="text-xs text-muted-foreground mt-1">Generated: {new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
            </div>

            {/* Executive Summary */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-1">1. Executive Summary</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Total Projects</p>
                  <p className="text-xl font-bold font-mono-data text-primary">{filteredProjects.length}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Total Budget</p>
                  <p className="text-lg font-bold font-mono-data text-accent">{formatRupiah(totalBudget)}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Avg Progress</p>
                  <p className="text-xl font-bold font-mono-data text-success">{avgProgress}%</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Active Alerts</p>
                  <p className="text-xl font-bold font-mono-data text-destructive">{alerts.length}</p>
                </div>
              </div>
            </div>

            {/* Project Table */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-1">2. {reportType === "general" ? "Project Summary" : "Project Detail"}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-border">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left py-2 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Code</th>
                      <th className="text-left py-2 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Project</th>
                      <th className="text-left py-2 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Status</th>
                      <th className="text-left py-2 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Phase</th>
                      <th className="text-right py-2 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Progress</th>
                      <th className="text-right py-2 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Budget</th>
                      <th className="text-right py-2 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Spent</th>
                      {reportType === "detailed" && (
                        <>
                          <th className="text-right py-2 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">CPI</th>
                          <th className="text-left py-2 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">End Date</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.map(p => {
                      const cpi = p.spent > 0 ? ((p.progress / 100) * p.budget) / p.spent : 1;
                      return (
                        <tr key={p.id} className="border-b border-border/30">
                          <td className="py-1.5 px-2 font-mono-data text-primary">{p.project_code}</td>
                          <td className="py-1.5 px-2 font-medium text-foreground">{p.name}</td>
                          <td className="py-1.5 px-2">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                              p.status === "on-track" ? "bg-success/15 text-success" :
                              p.status === "at-risk" ? "bg-warning/15 text-warning" :
                              p.status === "delayed" ? "bg-destructive/15 text-destructive" :
                              "bg-primary/15 text-primary"
                            }`}>{p.status}</span>
                          </td>
                          <td className="py-1.5 px-2 text-muted-foreground">{p.phase}</td>
                          <td className="py-1.5 px-2 text-right font-mono-data text-foreground">{p.progress}%</td>
                          <td className="py-1.5 px-2 text-right font-mono-data text-accent">{formatRupiah(p.budget)}</td>
                          <td className="py-1.5 px-2 text-right font-mono-data text-foreground">{formatRupiah(p.spent)}</td>
                          {reportType === "detailed" && (
                            <>
                              <td className={`py-1.5 px-2 text-right font-mono-data font-bold ${cpi >= 1 ? "text-success" : "text-destructive"}`}>{cpi.toFixed(2)}</td>
                              <td className="py-1.5 px-2 font-mono-data text-muted-foreground">{new Date(p.end_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" })}</td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Risk Summary */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-1">3. Risk Summary</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {["critical", "high", "medium", "low"].map(sev => {
                  const count = alerts.filter(a => a.severity === sev).length;
                  return (
                    <div key={sev} className="bg-muted/20 rounded p-2 border border-border/50 text-center">
                      <p className="text-[10px] uppercase text-muted-foreground">{sev}</p>
                      <p className={`text-lg font-bold font-mono-data ${
                        sev === "critical" ? "text-destructive" : sev === "high" ? "text-warning" : "text-foreground"
                      }`}>{count}</p>
                    </div>
                  );
                })}
              </div>
              {reportType === "detailed" && alerts.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs border border-border">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left py-1.5 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Alert</th>
                        <th className="text-left py-1.5 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Severity</th>
                        <th className="text-left py-1.5 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Project</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alerts.map(a => (
                        <tr key={a.id} className="border-b border-border/30">
                          <td className="py-1 px-2 text-foreground">{a.title}</td>
                          <td className="py-1 px-2 text-muted-foreground capitalize">{a.severity}</td>
                          <td className="py-1 px-2 text-muted-foreground">{a.projects?.project_code}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Schedule Performance */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-1">4. Schedule Performance</h4>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-success/10 rounded-lg p-3 border border-success/20">
                  <p className="text-2xl font-bold font-mono-data text-success">{filteredProjects.filter(p => p.status === "on-track").length}</p>
                  <p className="text-[10px] text-muted-foreground">On Track</p>
                </div>
                <div className="bg-warning/10 rounded-lg p-3 border border-warning/20">
                  <p className="text-2xl font-bold font-mono-data text-warning">{filteredProjects.filter(p => p.status === "at-risk").length}</p>
                  <p className="text-[10px] text-muted-foreground">At Risk</p>
                </div>
                <div className="bg-destructive/10 rounded-lg p-3 border border-destructive/20">
                  <p className="text-2xl font-bold font-mono-data text-destructive">{filteredProjects.filter(p => p.status === "delayed").length}</p>
                  <p className="text-[10px] text-muted-foreground">Delayed</p>
                </div>
              </div>
            </div>

            {/* Footer */}
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
