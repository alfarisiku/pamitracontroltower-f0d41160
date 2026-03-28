import { useState } from "react";
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
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pW = pdf.internal.pageSize.getWidth();
      
      // Header
      pdf.setFillColor(26, 86, 219);
      pdf.rect(0, 0, pW, 35, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(18);
      pdf.text("PT Pamitra Jaya Konstruksi", 14, 16);
      pdf.setFontSize(10);
      pdf.text("Project Performance Report", 14, 24);
      pdf.setFontSize(8);
      pdf.text(`Generated: ${new Date().toLocaleString("id-ID")}`, 14, 31);
      pdf.setTextColor(0, 0, 0);
      
      let y = 45;

      // 1. Executive Summary with highlighted metrics
      pdf.setFontSize(13);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(26, 86, 219);
      pdf.text("1. Executive Summary", 14, y); y += 8;
      pdf.setTextColor(0, 0, 0);
      
      // KPI boxes
      const kpis = [
        { label: "Projects", value: String(filteredProjects.length) },
        { label: "Budget", value: formatRupiah(totalBudget) },
        { label: "Spent", value: formatRupiah(totalSpent) },
        { label: "Progress", value: `${avgProgress}%` },
        { label: "Alerts", value: String(filteredAlerts.length) },
        { label: "Margin", value: `${totalBudget > 0 ? Math.round((totalBudget - totalSpent) / totalBudget * 100) : 0}%` },
      ];
      const boxW = (pW - 28 - 10) / 3;
      kpis.forEach((k, i) => {
        const bx = 14 + (i % 3) * (boxW + 5);
        const by = y + Math.floor(i / 3) * 16;
        pdf.setFillColor(245, 247, 250);
        pdf.roundedRect(bx, by, boxW, 13, 2, 2, "F");
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(120, 120, 120);
        pdf.text(k.label, bx + 3, by + 5);
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(26, 86, 219);
        pdf.text(k.value, bx + 3, by + 11);
      });
      pdf.setTextColor(0, 0, 0);
      y += 38;

      // 2. S-Curve / Schedule Performance
      pdf.setFontSize(13);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(26, 86, 219);
      pdf.text("2. Schedule Performance", 14, y); y += 7;
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      const schedStats = [
        { l: "On Track", v: filteredProjects.filter(p => p.status === "on-track").length, c: [34, 197, 94] },
        { l: "At Risk", v: filteredProjects.filter(p => p.status === "at-risk").length, c: [234, 179, 8] },
        { l: "Delayed", v: filteredProjects.filter(p => p.status === "delayed").length, c: [239, 68, 68] },
        { l: "Completed", v: filteredProjects.filter(p => p.status === "completed").length, c: [59, 130, 246] },
      ];
      schedStats.forEach((s, i) => {
        const bx = 14 + i * 45;
        pdf.setFillColor(s.c[0], s.c[1], s.c[2]);
        pdf.circle(bx + 3, y + 2, 2, "F");
        pdf.text(`${s.l}: ${s.v}`, bx + 7, y + 3);
      });
      y += 10;

      // 3. Project Table
      pdf.setFontSize(13);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(26, 86, 219);
      pdf.text("3. Activity Progress", 14, y); y += 7;
      pdf.setTextColor(0, 0, 0);
      
      // Table header
      pdf.setFillColor(240, 242, 245);
      pdf.rect(14, y - 1, pW - 28, 6, "F");
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "bold");
      const headers = ["Code", "Project", "Status", "Phase", "Progress", "Budget", "CPI", "Margin"];
      const colX = [14, 30, 70, 88, 107, 122, 145, 162];
      headers.forEach((h, i) => pdf.text(h, colX[i], y + 3));
      y += 8;
      
      pdf.setFont("helvetica", "normal");
      filteredProjects.forEach(p => {
        if (y > 275) { pdf.addPage(); y = 20; }
        const cpi = p.spent > 0 ? ((p.progress / 100) * p.budget) / p.spent : 1;
        const margin = Math.round((p.budget - p.spent) / p.budget * 100);
        pdf.setFontSize(7);
        pdf.text(p.project_code, colX[0], y);
        pdf.text(p.name.slice(0, 22), colX[1], y);
        pdf.text(p.status, colX[2], y);
        pdf.text(p.phase, colX[3], y);
        // Progress bar
        pdf.setFillColor(230, 230, 230);
        pdf.rect(colX[4], y - 3, 12, 3, "F");
        pdf.setFillColor(26, 86, 219);
        pdf.rect(colX[4], y - 3, 12 * (p.progress / 100), 3, "F");
        pdf.text(`${p.progress}%`, colX[4] + 13, y);
        pdf.text(formatRupiah(p.budget), colX[5], y);
        pdf.setTextColor(cpi >= 1 ? 34 : 239, cpi >= 1 ? 197 : 68, cpi >= 1 ? 94 : 68);
        pdf.text(cpi.toFixed(2), colX[6], y);
        pdf.setTextColor(margin > 10 ? 34 : 239, margin > 10 ? 197 : 68, margin > 10 ? 94 : 68);
        pdf.text(`${margin}%`, colX[7], y);
        pdf.setTextColor(0, 0, 0);
        y += 5;
      });
      y += 5;

      // 4. WBS Breakdown (if project selected)
      if (selectedProjectId !== "all" && workAreas.length > 0) {
        if (y > 240) { pdf.addPage(); y = 20; }
        pdf.setFontSize(13); pdf.setFont("helvetica", "bold");
        pdf.setTextColor(26, 86, 219);
        pdf.text("4. WBS Breakdown", 14, y); y += 7;
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(7);
        workAreas.forEach(wa => {
          if (y > 270) { pdf.addPage(); y = 20; }
          pdf.setFillColor(240, 242, 245);
          pdf.rect(14, y - 2, pW - 28, 5, "F");
          pdf.setFont("helvetica", "bold");
          pdf.text(`${wa.code} — ${wa.name} (${wa.progress}%)`, 16, y + 1.5);
          y += 6;
          pdf.setFont("helvetica", "normal");
          const items = workItems.filter(wi => wi.work_area_id === wa.id);
          items.forEach(wi => {
            if (y > 275) { pdf.addPage(); y = 20; }
            pdf.text(`  ${wi.code}  ${wi.name}`, 18, y);
            const rem = Number(wi.qty_total) - Number(wi.qty_completed);
            pdf.text(`${Number(wi.qty_completed)}/${Number(wi.qty_total)} ${wi.unit} (rem: ${rem})`, 120, y);
            pdf.text(`${wi.progress}%`, 175, y);
            y += 4;
          });
          y += 2;
        });
        y += 5;
      }

      // 5. Cost Performance
      if (y > 250) { pdf.addPage(); y = 20; }
      const costSection = selectedProjectId !== "all" && workAreas.length > 0 ? "5" : "4";
      pdf.setFontSize(13); pdf.setFont("helvetica", "bold");
      pdf.setTextColor(26, 86, 219);
      pdf.text(`${costSection}. Cost Performance`, 14, y); y += 7;
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(9); pdf.setFont("helvetica", "normal");
      pdf.text(`Total Budget: ${formatRupiah(totalBudget)}`, 14, y);
      pdf.text(`Total Spent: ${formatRupiah(totalSpent)}`, 80, y);
      pdf.text(`Remaining: ${formatRupiah(totalBudget - totalSpent)}`, 145, y);
      y += 10;

      // 6. Milestones
      if (selectedProjectId !== "all" && milestones.length > 0) {
        if (y > 250) { pdf.addPage(); y = 20; }
        const msSection = parseInt(costSection) + 1;
        pdf.setFontSize(13); pdf.setFont("helvetica", "bold");
        pdf.setTextColor(26, 86, 219);
        pdf.text(`${msSection}. Milestone Tracking`, 14, y); y += 7;
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(7);
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
      if (y > 250) { pdf.addPage(); y = 20; }
      const riskSection = selectedProjectId !== "all" ? (workAreas.length > 0 ? (milestones.length > 0 ? "7" : "6") : "5") : "5";
      pdf.setFontSize(13); pdf.setFont("helvetica", "bold");
      pdf.setTextColor(26, 86, 219);
      pdf.text(`${riskSection}. Risk Summary`, 14, y); y += 7;
      pdf.setTextColor(0, 0, 0);
      
      const riskKpis = [
        { l: "Critical", v: filteredAlerts.filter(a => a.severity === "critical").length, c: [239, 68, 68] },
        { l: "High", v: filteredAlerts.filter(a => a.severity === "high").length, c: [234, 179, 8] },
        { l: "Medium", v: filteredAlerts.filter(a => a.severity === "medium").length, c: [59, 130, 246] },
        { l: "Low", v: filteredAlerts.filter(a => a.severity === "low").length, c: [120, 120, 120] },
      ];
      pdf.setFontSize(8);
      riskKpis.forEach((r, i) => {
        const bx = 14 + i * 45;
        pdf.setFillColor(r.c[0], r.c[1], r.c[2]);
        pdf.circle(bx + 3, y + 1.5, 2, "F");
        pdf.setFont("helvetica", "normal");
        pdf.text(`${r.l}: ${r.v}`, bx + 7, y + 2.5);
      });
      y += 8;

      if (filteredAlerts.length > 0) {
        pdf.setFontSize(7); pdf.setFont("helvetica", "bold");
        ["Risk", "Severity", "P/I", "Owner", "Mitigation"].forEach((h, i) => pdf.text(h, 14 + i * 35, y));
        y += 4;
        pdf.setFont("helvetica", "normal");
        filteredAlerts.forEach(a => {
          if (y > 275) { pdf.addPage(); y = 20; }
          [a.title.slice(0, 22), a.severity, `${a.probability || "—"}/${a.impact || "—"}`, (a.risk_owner || "—").slice(0, 15), (a.mitigation_plan || "—").slice(0, 20)].forEach((v, i) => pdf.text(v, 14 + i * 35, y));
          y += 4;
        });
      }

      // Footer
      pdf.setFontSize(7);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Report generated by Pamitra Control Tower · ${new Date().toLocaleString("id-ID")} · © 2026 PT Pamitra Jaya Konstruksi — Confidential`, 14, 290);

      pdf.save(`Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally { setGenerating(false); }
  };

  const handlePrint = () => {
    const printW = window.open("", "_blank");
    if (!printW) return;
    
    printW.document.write(`<html><head><title>Project Report</title><style>
      @page { size: portrait; margin: 15mm; }
      body{font-family:Arial,sans-serif;padding:10px;font-size:11px;color:#333}
      h1{font-size:18px;margin:0;color:#1a56db}h2{font-size:14px;margin:15px 0 5px;border-bottom:2px solid #1a56db;padding-bottom:3px;color:#1a56db}
      table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #ddd;padding:4px 6px;text-align:left;font-size:10px}th{background:#f0f2f5;text-transform:uppercase;font-size:9px}
      .kpi{display:inline-block;padding:8px 15px;margin:3px;background:#f8f8f8;border:1px solid #eee;border-radius:6px;text-align:center}
      .kpi .value{font-size:16px;font-weight:bold;color:#1a56db}.kpi .label{font-size:9px;color:#888;text-transform:uppercase}
      .footer{margin-top:30px;padding-top:10px;border-top:1px solid #ddd;font-size:8px;color:#999;text-align:center}
    </style></head><body>`);
    
    printW.document.write(`<h1>PT Pamitra Jaya Konstruksi</h1>`);
    printW.document.write(`<p style="font-size:12px;color:#666">Project Performance Report</p>`);
    printW.document.write(`<p style="font-size:10px;color:#999">${new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>`);

    printW.document.write(`<h2>1. Executive Summary</h2><div>`);
    [{ l: "Projects", v: filteredProjects.length }, { l: "Budget", v: formatRupiah(totalBudget) }, { l: "Progress", v: `${avgProgress}%` }, { l: "Alerts", v: filteredAlerts.length }].forEach(k => {
      printW.document.write(`<div class="kpi"><div class="value">${k.v}</div><div class="label">${k.l}</div></div>`);
    });
    printW.document.write(`</div>`);

    printW.document.write(`<h2>2. Activity Progress</h2><table><thead><tr><th>Code</th><th>Project</th><th>Status</th><th>Progress</th><th>Budget</th><th>Spent</th><th>CPI</th><th>Margin</th></tr></thead><tbody>`);
    filteredProjects.forEach(p => {
      const cpi = p.spent > 0 ? ((p.progress / 100) * p.budget) / p.spent : 1;
      const margin = Math.round((p.budget - p.spent) / p.budget * 100);
      printW.document.write(`<tr><td>${p.project_code}</td><td>${p.name}</td><td>${p.status}</td><td>${p.progress}%</td><td>${formatRupiah(p.budget)}</td><td>${formatRupiah(p.spent)}</td><td>${cpi.toFixed(2)}</td><td>${margin}%</td></tr>`);
    });
    printW.document.write(`</tbody></table>`);

    if (selectedProjectId !== "all" && workAreas.length > 0) {
      printW.document.write(`<h2>3. WBS Breakdown</h2><table><thead><tr><th>Code</th><th>Name</th><th>Qty</th><th>Done</th><th>Remaining</th><th>%</th></tr></thead><tbody>`);
      workAreas.forEach(wa => {
        printW.document.write(`<tr style="background:#f0f0f0;font-weight:bold"><td colspan="5">${wa.code} — ${wa.name}</td><td>${wa.progress}%</td></tr>`);
        workItems.filter(wi => wi.work_area_id === wa.id).forEach(wi => {
          printW.document.write(`<tr><td style="padding-left:20px">${wi.code}</td><td>${wi.name}</td><td>${Number(wi.qty_total).toLocaleString()} ${wi.unit}</td><td>${Number(wi.qty_completed).toLocaleString()}</td><td>${(Number(wi.qty_total) - Number(wi.qty_completed)).toLocaleString()}</td><td>${wi.progress}%</td></tr>`);
        });
      });
      printW.document.write(`</tbody></table>`);
    }

    printW.document.write(`<h2>Risk Summary</h2>`);
    if (filteredAlerts.length > 0) {
      printW.document.write(`<table><thead><tr><th>Risk</th><th>Severity</th><th>Probability</th><th>Impact</th><th>Owner</th><th>Mitigation</th></tr></thead><tbody>`);
      filteredAlerts.forEach(a => {
        printW.document.write(`<tr><td>${a.title}</td><td>${a.severity}</td><td>${a.probability || "—"}</td><td>${a.impact || "—"}</td><td>${a.risk_owner || "—"}</td><td>${a.mitigation_plan || "—"}</td></tr>`);
      });
      printW.document.write(`</tbody></table>`);
    } else {
      printW.document.write(`<p>Tidak ada alert aktif.</p>`);
    }

    printW.document.write(`<div class="footer">Report generated by Pamitra Control Tower · ${new Date().toLocaleString("id-ID")} · © 2026 PT Pamitra Jaya Konstruksi — Confidential</div></body></html>`);
    printW.document.close();
    printW.print();
  };

  const handleShare = async () => {
    if (navigator.share) await navigator.share({ title: "Project Report", text: `PMO Report - ${new Date().toLocaleDateString("id-ID")}`, url: window.location.href });
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
              <p className="text-xs text-muted-foreground">Generate & export laporan proyek — S Curve, Activity, Cost, Risk</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={generatePDF} disabled={generating} className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50"><Download className="h-3.5 w-3.5" /> {generating ? "..." : "Export PDF"}</button>
              <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 border border-border"><Printer className="h-3.5 w-3.5" /> Print</button>
              <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-2 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 border border-border"><Share2 className="h-3.5 w-3.5" /> Share</button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <div className="relative">
              <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
                <option value="all">Semua Proyek</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Report description */}
          <div className="glass-card rounded-lg p-4 shadow-card border-2 border-primary/20 mb-5">
            <h4 className="text-sm font-semibold text-foreground mb-1">📊 Project Performance Report</h4>
            <p className="text-[10px] text-muted-foreground">Laporan lengkap mencakup: Executive Summary, Schedule Performance (S-Curve), Activity Progress, Cost Performance, WBS Breakdown, Issue Tracking, dan Risk Summary. Pilih proyek untuk laporan detail per proyek.</p>
          </div>

          {/* Preview */}
          <div className="glass-card rounded-lg shadow-card p-6 space-y-5" style={{ backgroundColor: "white" }}>
            <div className="text-center border-b border-border pb-4">
              <h2 className="text-lg font-bold text-foreground">PT Pamitra Jaya Konstruksi</h2>
              <h3 className="text-sm text-muted-foreground">Project Performance Report</h3>
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

            {/* Schedule Performance */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-1">2. Schedule Performance</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                {[
                  { label: "On Track", count: filteredProjects.filter(p => p.status === "on-track").length, color: "bg-success/10 border-success/20", textColor: "text-success" },
                  { label: "At Risk", count: filteredProjects.filter(p => p.status === "at-risk").length, color: "bg-warning/10 border-warning/20", textColor: "text-warning" },
                  { label: "Delayed", count: filteredProjects.filter(p => p.status === "delayed").length, color: "bg-destructive/10 border-destructive/20", textColor: "text-destructive" },
                  { label: "Completed", count: filteredProjects.filter(p => p.status === "completed").length, color: "bg-primary/10 border-primary/20", textColor: "text-primary" },
                ].map(s => (
                  <div key={s.label} className={`rounded-lg p-3 border ${s.color}`}>
                    <p className={`text-2xl font-bold font-mono-data ${s.textColor}`}>{s.count}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Progress Table */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-1">3. Activity Progress</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-border">
                  <thead><tr className="bg-muted/50">
                    <th className="text-left py-2 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Code</th>
                    <th className="text-left py-2 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Project</th>
                    <th className="text-left py-2 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Status</th>
                    <th className="text-right py-2 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Progress</th>
                    <th className="text-right py-2 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Budget</th>
                    <th className="text-right py-2 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">CPI</th>
                    <th className="text-right py-2 px-2 border-b border-border text-[10px] uppercase text-muted-foreground">Margin</th>
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
                          <td className={`py-1.5 px-2 text-right font-mono-data font-bold ${cpi >= 1 ? "text-success" : "text-destructive"}`}>{cpi.toFixed(2)}</td>
                          <td className={`py-1.5 px-2 text-right font-mono-data font-bold ${margin > 10 ? "text-success" : "text-destructive"}`}>{margin}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* WBS */}
            {selectedProjectId !== "all" && workAreas.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-1">4. WBS Breakdown</h4>
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
              {filteredAlerts.length > 0 && (
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
