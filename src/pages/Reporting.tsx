import { useState, useRef } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useProjects, useAlerts, useMonthlyBudgets, useWorkAreas, useWorkItems, useMilestones } from "@/hooks/useProjects";
import { formatRupiah } from "@/lib/supabase";
import { FileText, Download, Printer, Share2, ChevronDown } from "lucide-react";
import jsPDF from "jspdf";

const Reporting = () => {
  const { data: projects = [] } = useProjects();
  const { data: alerts = [] } = useAlerts();
  const { data: budgets = [] } = useMonthlyBudgets();
  const [reportType, setReportType] = useState<"general" | "detailed">("general");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [generating, setGenerating] = useState(false);

  const filteredProjects = selectedProjectId === "all" ? projects : projects.filter(p => p.id === selectedProjectId);
  const { data: workAreas = [] } = useWorkAreas(selectedProjectId !== "all" ? selectedProjectId : undefined);
  const waIds = workAreas.map(wa => wa.id);
  const { data: workItems = [] } = useWorkItems(waIds);
  const { data: milestones = [] } = useMilestones(selectedProjectId !== "all" ? selectedProjectId : undefined);

  const totalBudget = filteredProjects.reduce((s, p) => s + p.budget, 0);
  const totalSpent = filteredProjects.reduce((s, p) => s + p.spent, 0);
  const avgProgress = filteredProjects.length > 0 ? Math.round(filteredProjects.reduce((s, p) => s + p.progress, 0) / filteredProjects.length) : 0;
  const filteredAlerts = selectedProjectId === "all" ? alerts : alerts.filter(a => a.project_id === selectedProjectId);

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const isLandscape = reportType === "general";
      const pdf = new jsPDF({ orientation: isLandscape ? "landscape" : "portrait", unit: "mm", format: "a4" });
      const pW = pdf.internal.pageSize.getWidth();
      
      // Header
      pdf.setFontSize(18);
      pdf.text("PT Pamitra Jaya Konstruksi", 14, 18);
      pdf.setFontSize(11);
      pdf.text(reportType === "general" ? "General Project Report — Executive Summary" : "Detailed Project Report — Full Breakdown", 14, 26);
      pdf.setFontSize(8);
      pdf.text(`Generated: ${new Date().toLocaleString("id-ID")}`, 14, 32);
      pdf.line(14, 34, pW - 14, 34);
      
      let y = 40;

      // Executive Summary
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("1. Executive Summary", 14, y); y += 7;
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Total Projects: ${filteredProjects.length}`, 14, y);
      pdf.text(`Total Budget: ${formatRupiah(totalBudget)}`, 80, y);
      pdf.text(`Total Spent: ${formatRupiah(totalSpent)}`, 150, y);
      y += 5;
      pdf.text(`Avg Progress: ${avgProgress}%`, 14, y);
      pdf.text(`Active Alerts: ${filteredAlerts.length}`, 80, y);
      pdf.text(`Margin: ${totalBudget > 0 ? Math.round((totalBudget - totalSpent) / totalBudget * 100) : 0}%`, 150, y);
      y += 10;

      // Project Table
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("2. Project Summary", 14, y); y += 7;
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      const headers = reportType === "detailed" ? ["Code", "Project", "Status", "Phase", "Progress", "Budget", "Spent", "CPI", "Margin", "End Date"] : ["Code", "Project", "Status", "Progress", "Budget", "Spent", "Margin"];
      const colW = reportType === "detailed" ? 25 : 35;
      headers.forEach((h, i) => pdf.text(h, 14 + i * colW, y));
      y += 1; pdf.line(14, y, pW - 14, y); y += 4;
      
      pdf.setFont("helvetica", "normal");
      filteredProjects.forEach(p => {
        if (y > (isLandscape ? 190 : 280)) { pdf.addPage(); y = 20; }
        const cpi = p.spent > 0 ? ((p.progress / 100) * p.budget) / p.spent : 1;
        const margin = Math.round((p.budget - p.spent) / p.budget * 100);
        if (reportType === "detailed") {
          [p.project_code, p.name.slice(0, 16), p.status, p.phase, `${p.progress}%`, formatRupiah(p.budget), formatRupiah(p.spent), cpi.toFixed(2), `${margin}%`, new Date(p.end_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" })].forEach((v, i) => pdf.text(v, 14 + i * colW, y));
        } else {
          [p.project_code, p.name.slice(0, 20), p.status, `${p.progress}%`, formatRupiah(p.budget), formatRupiah(p.spent), `${margin}%`].forEach((v, i) => pdf.text(v, 14 + i * colW, y));
        }
        y += 5;
      });
      y += 5;

      // Detailed: WBS Breakdown
      if (reportType === "detailed" && selectedProjectId !== "all" && workAreas.length > 0) {
        if (y > 240) { pdf.addPage(); y = 20; }
        pdf.setFontSize(12); pdf.setFont("helvetica", "bold");
        pdf.text("3. WBS Breakdown", 14, y); y += 7;
        pdf.setFontSize(8); pdf.setFont("helvetica", "normal");
        workAreas.forEach(wa => {
          if (y > 270) { pdf.addPage(); y = 20; }
          pdf.setFont("helvetica", "bold");
          pdf.text(`${wa.code} — ${wa.name} (${wa.progress}%)`, 14, y); y += 4;
          pdf.setFont("helvetica", "normal");
          const items = workItems.filter(wi => wi.work_area_id === wa.id);
          items.forEach(wi => {
            if (y > 275) { pdf.addPage(); y = 20; }
            pdf.text(`  ${wi.code}  ${wi.name}`, 18, y);
            pdf.text(`${Number(wi.qty_completed)}/${Number(wi.qty_total)} ${wi.unit}  (${wi.progress}%)`, 120, y);
            y += 4;
          });
          y += 2;
        });
        y += 5;
      }

      // Detailed: Milestones
      if (reportType === "detailed" && selectedProjectId !== "all" && milestones.length > 0) {
        if (y > 250) { pdf.addPage(); y = 20; }
        pdf.setFontSize(12); pdf.setFont("helvetica", "bold");
        pdf.text("4. Milestone Tracking", 14, y); y += 7;
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "bold");
        ["Milestone", "Phase", "Target", "Status", "Weight"].forEach((h, i) => pdf.text(h, 14 + i * 35, y));
        y += 4;
        pdf.setFont("helvetica", "normal");
        milestones.forEach(ms => {
          if (y > 275) { pdf.addPage(); y = 20; }
          const isLate = ms.status !== "completed" && new Date(ms.target_date) < new Date();
          [ms.name.slice(0, 22), ms.phase, new Date(ms.target_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" }), isLate ? "OVERDUE" : ms.status, `${ms.weight}%`].forEach((v, i) => pdf.text(v, 14 + i * 35, y));
          y += 4;
        });
        y += 5;
      }

      // Risk Summary
      const riskSectionNum = reportType === "detailed" && selectedProjectId !== "all" ? (workAreas.length > 0 ? "5" : "3") : "3";
      if (y > 250) { pdf.addPage(); y = 20; }
      pdf.setFontSize(12); pdf.setFont("helvetica", "bold");
      pdf.text(`${riskSectionNum}. Risk Summary`, 14, y); y += 7;
      pdf.setFontSize(9); pdf.setFont("helvetica", "normal");
      ["critical", "high", "medium", "low"].forEach(sev => {
        const cnt = filteredAlerts.filter(a => a.severity === sev).length;
        pdf.text(`${sev.charAt(0).toUpperCase() + sev.slice(1)}: ${cnt}`, 14, y);
        y += 4;
      });

      if (reportType === "detailed" && filteredAlerts.length > 0) {
        y += 3;
        pdf.setFontSize(8); pdf.setFont("helvetica", "bold");
        ["Risk", "Severity", "P/I", "Owner", "Mitigation"].forEach((h, i) => pdf.text(h, 14 + i * 35, y));
        y += 4;
        pdf.setFont("helvetica", "normal");
        filteredAlerts.forEach(a => {
          if (y > 275) { pdf.addPage(); y = 20; }
          [a.title.slice(0, 22), a.severity, `${a.probability || "—"}/${a.impact || "—"}`, (a.risk_owner || "—").slice(0, 15), (a.mitigation_plan || "—").slice(0, 20)].forEach((v, i) => pdf.text(v, 14 + i * 35, y));
          y += 4;
        });
      }

      // Schedule Performance
      y += 5;
      if (y > 260) { pdf.addPage(); y = 20; }
      const schedNum = parseInt(riskSectionNum) + 1;
      pdf.setFontSize(12); pdf.setFont("helvetica", "bold");
      pdf.text(`${schedNum}. Schedule Performance`, 14, y); y += 7;
      pdf.setFontSize(9); pdf.setFont("helvetica", "normal");
      pdf.text(`On Track: ${filteredProjects.filter(p => p.status === "on-track").length}`, 14, y);
      pdf.text(`At Risk: ${filteredProjects.filter(p => p.status === "at-risk").length}`, 60, y);
      pdf.text(`Delayed: ${filteredProjects.filter(p => p.status === "delayed").length}`, 100, y);
      y += 10;

      // Footer
      pdf.setFontSize(7);
      pdf.text(`Report generated by Pamitra Control Tower · ${new Date().toLocaleString("id-ID")} · © 2026 PT Pamitra Jaya Konstruksi — Confidential`, 14, isLandscape ? 200 : 290);

      pdf.save(`Report_${reportType}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally { setGenerating(false); }
  };

  const handlePrint = () => {
    const printW = window.open("", "_blank");
    if (!printW) return;
    const isDetailed = reportType === "detailed";
    
    printW.document.write(`<html><head><title>${isDetailed ? "Detailed" : "General"} Report</title><style>
      @page { size: ${isDetailed ? "portrait" : "landscape"}; margin: 15mm; }
      body{font-family:Arial,sans-serif;padding:10px;font-size:11px;color:#333}
      h1{font-size:18px;margin:0}h2{font-size:14px;margin:15px 0 5px;border-bottom:1px solid #ccc;padding-bottom:3px}
      table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #ddd;padding:4px 6px;text-align:left;font-size:10px}th{background:#f5f5f5;text-transform:uppercase;font-size:9px}
      .kpi{display:inline-block;padding:8px 15px;margin:3px;background:#f8f8f8;border:1px solid #eee;border-radius:4px;text-align:center}
      .kpi .value{font-size:16px;font-weight:bold;color:#1a56db}.kpi .label{font-size:9px;color:#888;text-transform:uppercase}
      .badge{padding:2px 8px;border-radius:4px;font-size:9px;display:inline-block}
      .footer{margin-top:30px;padding-top:10px;border-top:1px solid #ddd;font-size:8px;color:#999;text-align:center}
    </style></head><body>`);
    
    printW.document.write(`<h1>PT Pamitra Jaya Konstruksi</h1>`);
    printW.document.write(`<p style="font-size:12px;color:#666">${isDetailed ? "Detailed Project Report — Full Breakdown" : "General Project Report — Executive Summary"}</p>`);
    printW.document.write(`<p style="font-size:10px;color:#999">${new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>`);

    printW.document.write(`<h2>1. Executive Summary</h2><div>`);
    [{ l: "Projects", v: filteredProjects.length }, { l: "Budget", v: formatRupiah(totalBudget) }, { l: "Progress", v: `${avgProgress}%` }, { l: "Alerts", v: filteredAlerts.length }].forEach(k => {
      printW.document.write(`<div class="kpi"><div class="value">${k.v}</div><div class="label">${k.l}</div></div>`);
    });
    printW.document.write(`</div>`);

    printW.document.write(`<h2>2. Project Summary</h2><table><thead><tr><th>Code</th><th>Project</th><th>Status</th><th>Progress</th><th>Budget</th><th>Spent</th><th>Margin</th>${isDetailed ? "<th>CPI</th><th>Phase</th><th>End</th>" : ""}</tr></thead><tbody>`);
    filteredProjects.forEach(p => {
      const cpi = p.spent > 0 ? ((p.progress / 100) * p.budget) / p.spent : 1;
      const margin = Math.round((p.budget - p.spent) / p.budget * 100);
      printW.document.write(`<tr><td>${p.project_code}</td><td>${p.name}</td><td>${p.status}</td><td>${p.progress}%</td><td>${formatRupiah(p.budget)}</td><td>${formatRupiah(p.spent)}</td><td>${margin}%</td>${isDetailed ? `<td>${cpi.toFixed(2)}</td><td>${p.phase}</td><td>${new Date(p.end_date).toLocaleDateString("id-ID")}</td>` : ""}</tr>`);
    });
    printW.document.write(`</tbody></table>`);

    if (isDetailed && selectedProjectId !== "all" && workAreas.length > 0) {
      printW.document.write(`<h2>3. WBS Breakdown</h2><table><thead><tr><th>Code</th><th>Name</th><th>Qty</th><th>Done</th><th>Remaining</th><th>%</th></tr></thead><tbody>`);
      workAreas.forEach(wa => {
        printW.document.write(`<tr style="background:#f0f0f0;font-weight:bold"><td colspan="5">${wa.code} — ${wa.name}</td><td>${wa.progress}%</td></tr>`);
        workItems.filter(wi => wi.work_area_id === wa.id).forEach(wi => {
          printW.document.write(`<tr><td style="padding-left:20px">${wi.code}</td><td>${wi.name}</td><td>${Number(wi.qty_total).toLocaleString()} ${wi.unit}</td><td>${Number(wi.qty_completed).toLocaleString()}</td><td>${(Number(wi.qty_total) - Number(wi.qty_completed)).toLocaleString()}</td><td>${wi.progress}%</td></tr>`);
        });
      });
      printW.document.write(`</tbody></table>`);
    }

    if (isDetailed && selectedProjectId !== "all" && milestones.length > 0) {
      printW.document.write(`<h2>4. Milestone Tracking</h2><table><thead><tr><th>Milestone</th><th>Phase</th><th>Target</th><th>Status</th><th>Weight</th></tr></thead><tbody>`);
      milestones.forEach(ms => {
        const isLate = ms.status !== "completed" && new Date(ms.target_date) < new Date();
        printW.document.write(`<tr><td>${ms.name}</td><td>${ms.phase}</td><td>${new Date(ms.target_date).toLocaleDateString("id-ID")}</td><td>${isLate ? "OVERDUE" : ms.status}</td><td>${ms.weight}%</td></tr>`);
      });
      printW.document.write(`</tbody></table>`);
    }

    printW.document.write(`<h2>Risk Summary</h2>`);
    if (isDetailed && filteredAlerts.length > 0) {
      printW.document.write(`<table><thead><tr><th>Risk</th><th>Severity</th><th>Probability</th><th>Impact</th><th>Owner</th><th>Mitigation</th></tr></thead><tbody>`);
      filteredAlerts.forEach(a => {
        printW.document.write(`<tr><td>${a.title}</td><td>${a.severity}</td><td>${a.probability || "—"}</td><td>${a.impact || "—"}</td><td>${a.risk_owner || "—"}</td><td>${a.mitigation_plan || "—"}</td></tr>`);
      });
      printW.document.write(`</tbody></table>`);
    } else {
      ["critical", "high", "medium", "low"].forEach(sev => {
        printW.document.write(`<p>${sev}: ${filteredAlerts.filter(a => a.severity === sev).length}</p>`);
      });
    }

    printW.document.write(`<div class="footer">Report generated by Pamitra Control Tower · ${new Date().toLocaleString("id-ID")} · © 2026 PT Pamitra Jaya Konstruksi — Confidential</div></body></html>`);
    printW.document.close();
    printW.print();
  };

  const handleShare = async () => {
    if (navigator.share) await navigator.share({ title: "EPC Project Report", text: `PMO Report - ${new Date().toLocaleDateString("id-ID")}`, url: window.location.href });
    else { await navigator.clipboard.writeText(window.location.href); alert("Link copied!"); }
  };

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

          {/* Report type description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <div className={`glass-card rounded-lg p-4 shadow-card border-2 transition-all ${reportType === "general" ? "border-primary" : "border-transparent"}`}>
              <h4 className="text-sm font-semibold text-foreground mb-1">📊 General Report</h4>
              <p className="text-[10px] text-muted-foreground">Landscape format — Executive summary, high-level metrics, project health overview, schedule status, cost summary. Ideal untuk management review.</p>
            </div>
            <div className={`glass-card rounded-lg p-4 shadow-card border-2 transition-all ${reportType === "detailed" ? "border-primary" : "border-transparent"}`}>
              <h4 className="text-sm font-semibold text-foreground mb-1">📋 Detailed Report</h4>
              <p className="text-[10px] text-muted-foreground">Portrait format — Full WBS breakdown, detailed schedule, complete cost analysis, full risk register with mitigation plans. Ideal untuk project team review.</p>
            </div>
          </div>

          {/* Preview */}
          <div className="glass-card rounded-lg shadow-card p-6 space-y-5" style={{ backgroundColor: "white" }}>
            <div className="text-center border-b border-border pb-4">
              <h2 className="text-lg font-bold text-foreground">PT Pamitra Jaya Konstruksi</h2>
              <h3 className="text-sm text-muted-foreground">{reportType === "general" ? "General Project Report — Executive Summary" : "Detailed Project Report — Full Breakdown"}</h3>
              <p className="text-xs text-muted-foreground mt-1">{new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
            </div>

            {/* Executive Summary */}
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

            {/* Project Table */}
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
                      <th className="text-left py-2 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Phase</th>
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
                            <td className="py-1.5 px-2 text-muted-foreground">{p.phase}</td>
                            <td className="py-1.5 px-2 font-mono-data text-muted-foreground">{new Date(p.end_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" })}</td>
                          </>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detailed WBS */}
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
              <h4 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-1">Risk Summary</h4>
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
              <h4 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-1">Schedule Performance</h4>
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
