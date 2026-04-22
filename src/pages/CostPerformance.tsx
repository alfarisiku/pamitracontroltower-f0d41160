import { useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useProjects, useMonthlyBudgets, useProcurementItems, useAllPurchaseOrders, usePurchaseOrders } from "@/hooks/useProjects";
import { formatRupiah } from "@/lib/supabase";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from "recharts";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, ChevronDown, Share2, Percent, Download, Printer, Wallet, Receipt, FileWarning, Layers, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import { FormulaTooltip } from "@/components/dashboard/FormulaTooltip";

const CostPerformance = () => {
  const navigate = useNavigate();
  const { data: projects = [], isLoading } = useProjects();
  const { data: budgets = [] } = useMonthlyBudgets();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"project" | "category" | "wbs">("project");
  const { data: procItems = [] } = useProcurementItems(selectedProjectId !== "all" ? selectedProjectId : undefined);
  const { data: allPOs = [] } = useAllPurchaseOrders();
  const { data: projectPOs = [] } = usePurchaseOrders(selectedProjectId !== "all" ? selectedProjectId : undefined);

  const filteredProjects = selectedProjectId === "all" ? projects : projects.filter(p => p.id === selectedProjectId);

  if (isLoading) {
    return <div className="flex min-h-screen"><Sidebar /><div className="flex-1 flex items-center justify-center"><div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div></div>;
  }

  const relevantPOs = selectedProjectId === "all" ? allPOs : projectPOs;
  const totalBudget = filteredProjects.reduce((s, p) => s + p.budget, 0);
  const totalSpent = filteredProjects.reduce((s, p) => s + p.spent, 0);
  const totalRap = filteredProjects.reduce((s, p) => s + p.rap, 0);
  const totalContractValue = filteredProjects.reduce((s, p) => s + (p.contract_value || p.budget), 0);
  const totalCommitted = relevantPOs.reduce((s, po) => s + (po.amount || 0), 0);
  const totalPenalty = relevantPOs.reduce((s, po) => s + (po.penalty_amount || 0), 0);
  const remaining = totalBudget - totalSpent;
  const overBudget = filteredProjects.filter(p => (p.spent / p.budget) > 0.9);

  // Per-project committed cost map
  const committedByProject = allPOs.reduce((acc: Record<string, number>, po) => {
    acc[po.project_id] = (acc[po.project_id] || 0) + (po.amount || 0);
    return acc;
  }, {});
  const penaltyByProject = allPOs.reduce((acc: Record<string, number>, po) => {
    acc[po.project_id] = (acc[po.project_id] || 0) + (po.penalty_amount || 0);
    return acc;
  }, {});

  // PO breakdown by category (across filteredProjects)
  const filteredPOs = selectedProjectId === "all" ? allPOs : projectPOs;
  const poBreakdownByCategory = filteredPOs.reduce((acc: Record<string, { committed: number; penalty: number; count: number }>, po) => {
    const cat = po.category || "other";
    if (!acc[cat]) acc[cat] = { committed: 0, penalty: 0, count: 0 };
    acc[cat].committed += po.amount || 0;
    acc[cat].penalty += po.penalty_amount || 0;
    acc[cat].count += 1;
    return acc;
  }, {});

  // Breakdown by WBS via related_activity field
  const poBreakdownByWBS = filteredPOs.reduce((acc: Record<string, number>, po) => {
    const wbs = po.related_activity || "Unassigned";
    acc[wbs] = (acc[wbs] || 0) + (po.amount || 0);
    return acc;
  }, {});

  const barData = filteredProjects.map(p => ({
    name: p.project_code, fullName: p.name, budget: p.budget, spent: p.spent, rap: p.rap,
    committed: committedByProject[p.id] || 0,
    margin: Math.round((p.budget - p.spent) / p.budget * 100),
  }));

  const cashflowData = budgets.sort((a, b) => a.year - b.year || a.month.localeCompare(b.month)).map(b => ({
    ...b, label: `${b.month.slice(0, 3)}'${String(b.year).slice(-2)}`,
    variance: b.actual - b.planned,
  }));

  const chartTooltip = { backgroundColor: "hsl(0, 0%, 100%)", border: "1px solid hsl(215, 20%, 88%)", borderRadius: "6px", fontSize: "11px", color: "hsl(220, 25%, 15%)" };

  const handleShare = async () => {
    if (navigator.share) await navigator.share({ title: "Cost Performance", url: window.location.href });
    else { await navigator.clipboard.writeText(window.location.href); alert("Link copied!"); }
  };

  const handleExportPDF = () => {
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    pdf.setFontSize(16);
    pdf.text("Cost Performance Report", 14, 20);
    pdf.setFontSize(9);
    pdf.text(`Generated: ${new Date().toLocaleString("id-ID")}`, 14, 27);
    pdf.text(`Total Budget: ${formatRupiah(totalBudget)} | RAP: ${formatRupiah(totalRap)} | Spent: ${formatRupiah(totalSpent)} | Remaining: ${formatRupiah(remaining)}`, 14, 33);

    let y = 42;
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    ["Code", "Project", "Contract", "RAP", "Spent", "Remaining", "CPI", "Margin"].forEach((h, i) => {
      pdf.text(h, 14 + i * 33, y);
    });
    y += 5;
    pdf.setFont("helvetica", "normal");
    filteredProjects.forEach(p => {
      if (y > 190) { pdf.addPage(); y = 20; }
      const cpi = p.spent > 0 ? ((p.progress / 100) * p.budget) / p.spent : 1;
      const margin = Math.round((p.budget - p.spent) / p.budget * 100);
      pdf.text(p.project_code, 14, y);
      pdf.text(p.name.slice(0, 18), 47, y);
      pdf.text(formatRupiah(p.contract_value || p.budget), 80, y);
      pdf.text(formatRupiah(p.rap), 113, y);
      pdf.text(formatRupiah(p.spent), 146, y);
      pdf.text(formatRupiah(p.budget - p.spent), 179, y);
      pdf.text(cpi.toFixed(2), 212, y);
      pdf.text(`${margin}%`, 245, y);
      y += 5;
    });
    pdf.save(`Cost_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handlePrint = () => {
    const printW = window.open("", "_blank");
    if (!printW) return;
    printW.document.write(`<html><head><title>Cost Report</title><style>body{font-family:Arial,sans-serif;padding:20px;font-size:11px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:4px 8px;text-align:left}th{background:#f5f5f5;font-size:10px;text-transform:uppercase}</style></head><body>`);
    printW.document.write(`<h2>Cost Performance Report</h2><p>Total Budget: ${formatRupiah(totalBudget)} | RAP: ${formatRupiah(totalRap)} | Spent: ${formatRupiah(totalSpent)}</p>`);
    printW.document.write(`<table><thead><tr><th>Code</th><th>Project</th><th>Contract</th><th>RAP</th><th>Spent</th><th>Remaining</th><th>CPI</th><th>Margin</th></tr></thead><tbody>`);
    filteredProjects.forEach(p => {
      const cpi = p.spent > 0 ? ((p.progress / 100) * p.budget) / p.spent : 1;
      const margin = Math.round((p.budget - p.spent) / p.budget * 100);
      printW.document.write(`<tr><td>${p.project_code}</td><td>${p.name}</td><td>${formatRupiah(p.contract_value || p.budget)}</td><td>${formatRupiah(p.rap)}</td><td>${formatRupiah(p.spent)}</td><td>${formatRupiah(p.budget - p.spent)}</td><td>${cpi.toFixed(2)}</td><td>${margin}%</td></tr>`);
    });
    printW.document.write(`</tbody></table></body></html>`);
    printW.document.close();
    printW.print();
  };

  const cashflowPxWidth = Math.max(600, cashflowData.length * 60);

  // Category breakdown for selected project
  const categoryBreakdown = procItems.reduce((acc: Record<string, number>, item) => {
    const cat = item.status || "other";
    acc[cat] = (acc[cat] || 0) + item.amount;
    return acc;
  }, {});

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-3 sm:p-5 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <DashboardHeader />

          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-foreground">Cost Performance</h2>
              <p className="text-xs text-muted-foreground">Analisis anggaran, RAP, PO committed, actual cost & profit margin</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
                  <option value="all">Semua Proyek ({projects.length})</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
              <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90"><Download className="h-3.5 w-3.5" /> Export PDF</button>
              <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 border border-border"><Printer className="h-3.5 w-3.5" /> Print</button>
              <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-2 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 border border-border"><Share2 className="h-3.5 w-3.5" /> Share</button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-8 gap-3 mb-5">
            <div className="glass-card rounded-lg p-3 shadow-card">
              <div className="flex items-center gap-2 mb-1"><div className="p-1.5 rounded-lg bg-primary/15"><Wallet className="h-4 w-4 text-primary" /></div><span className="text-[10px] uppercase text-muted-foreground flex items-center">Contract<FormulaTooltip title="Contract Value" formula="Σ contract_value" description="Total nilai kontrak semua proyek terpilih (Nilai Kontrak resmi dengan client)." /></span></div>
              <p className="text-base font-bold font-mono-data text-primary">{formatRupiah(totalContractValue)}</p>
            </div>
            <div className="glass-card rounded-lg p-3 shadow-card">
              <div className="flex items-center gap-2 mb-1"><div className="p-1.5 rounded-lg bg-info/15"><Receipt className="h-4 w-4 text-info" /></div><span className="text-[10px] uppercase text-muted-foreground flex items-center">RAP<FormulaTooltip title="RAP (Rencana Anggaran Pelaksanaan)" formula="Σ rap" description="Estimasi internal biaya pelaksanaan proyek. Selisih dengan Contract Value = target margin." interpretation="RAP < Contract Value = ada margin perencanaan" /></span></div>
              <p className="text-base font-bold font-mono-data text-info">{formatRupiah(totalRap)}</p>
            </div>
            <div className="glass-card rounded-lg p-3 shadow-card">
              <div className="flex items-center gap-2 mb-1"><div className="p-1.5 rounded-lg bg-accent/15"><DollarSign className="h-4 w-4 text-accent" /></div><span className="text-[10px] uppercase text-muted-foreground flex items-center">Budget<FormulaTooltip title="Approved Budget" formula="Σ budget" description="Anggaran resmi yang sudah disetujui untuk eksekusi proyek (termasuk addendum jika ada)." /></span></div>
              <p className="text-base font-bold font-mono-data text-accent">{formatRupiah(totalBudget)}</p>
            </div>
            <div className="glass-card rounded-lg p-3 shadow-card">
              <div className="flex items-center gap-2 mb-1"><div className="p-1.5 rounded-lg bg-info/15"><Layers className="h-4 w-4 text-info" /></div><span className="text-[10px] uppercase text-muted-foreground flex items-center">PO Committed<FormulaTooltip title="Committed Cost (PO)" formula="Σ purchase_orders.amount" description="Total nilai Purchase Order yang sudah diterbitkan ke vendor — biaya yang sudah committed walaupun belum tentu dibayar." interpretation="Committed mendekati Budget = ruang fleksibilitas menyusut" /></span></div>
              <p className="text-base font-bold font-mono-data text-info">{formatRupiah(totalCommitted)}</p>
              <p className="text-[10px] text-muted-foreground">{filteredPOs.length} PO</p>
            </div>
            <div className="glass-card rounded-lg p-3 shadow-card">
              <div className="flex items-center gap-2 mb-1"><div className="p-1.5 rounded-lg bg-warning/15"><TrendingUp className="h-4 w-4 text-warning" /></div><span className="text-[10px] uppercase text-muted-foreground flex items-center">Actual Cost<FormulaTooltip title="Actual Cost (Cash Out)" formula="Σ spent" description="Realisasi biaya yang sudah dikeluarkan (terbayar). Termasuk pembayaran PO + operasional." interpretation="Actual / Budget < 90% = sehat, > 95% = kritis" /></span></div>
              <p className="text-base font-bold font-mono-data text-foreground">{formatRupiah(totalSpent)}</p>
              <p className="text-[10px] text-muted-foreground">{totalBudget > 0 ? Math.round(totalSpent / totalBudget * 100) : 0}%</p>
            </div>
            <div className="glass-card rounded-lg p-3 shadow-card">
              <div className="flex items-center gap-2 mb-1"><div className="p-1.5 rounded-lg bg-success/15"><TrendingDown className="h-4 w-4 text-success" /></div><span className="text-[10px] uppercase text-muted-foreground flex items-center">Remaining<FormulaTooltip title="Remaining Budget" formula="Budget − Actual Cost" description="Sisa anggaran yang masih tersedia untuk dipakai sampai akhir proyek." interpretation="Bandingkan dengan sisa scope work untuk antisipasi over-budget" /></span></div>
              <p className="text-base font-bold font-mono-data text-success">{formatRupiah(remaining)}</p>
            </div>
            <div className="glass-card rounded-lg p-3 shadow-card">
              <div className="flex items-center gap-2 mb-1"><div className="p-1.5 rounded-lg bg-destructive/15"><FileWarning className="h-4 w-4 text-destructive" /></div><span className="text-[10px] uppercase text-muted-foreground flex items-center">Penalty/Claim<FormulaTooltip title="Penalty / Claim" formula="Σ purchase_orders.penalty_amount" description="Akumulasi denda keterlambatan / klaim dari vendor atau client yang berdampak pada arus kas." /></span></div>
              <p className="text-base font-bold font-mono-data text-destructive">{formatRupiah(totalPenalty)}</p>
            </div>
            <div className="glass-card rounded-lg p-3 shadow-card">
              <div className="flex items-center gap-2 mb-1"><div className="p-1.5 rounded-lg bg-destructive/15"><AlertTriangle className="h-4 w-4 text-destructive" /></div><span className="text-[10px] uppercase text-muted-foreground flex items-center">Over Budget<FormulaTooltip title="Project Over Budget" formula="Count(Spent / Budget > 90%)" description="Jumlah proyek yang sudah mengkonsumsi >90% anggarannya — perlu monitoring intensif." /></span></div>
              <p className="text-base font-bold font-mono-data text-destructive">{overBudget.length}</p>
              <p className="text-[10px] text-muted-foreground">&gt;90% used</p>
            </div>
          </div>

          {/* View Mode toggle */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-[11px] text-muted-foreground uppercase">Breakdown:</span>
            {(["project", "category", "wbs"] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${viewMode === m ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:bg-muted/50"}`}>
                {m === "project" ? "Per Proyek" : m === "category" ? "Per Kategori PO" : "Per WBS / Aktivitas"}
              </button>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <div className="glass-card rounded-lg p-4 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-1">Budget vs RAP vs Actual</h3>
              <p className="text-[11px] text-muted-foreground mb-3">Per proyek</p>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                    <XAxis type="number" tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" width={55} tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={chartTooltip} formatter={(v: number, name: string) => [formatRupiah(v), name]} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: "10px" }} />
                    <Bar dataKey="budget" fill="hsl(215, 80%, 48%)" radius={[0, 2, 2, 0]} name="Budget" />
                    <Bar dataKey="rap" fill="hsl(200, 75%, 45%)" radius={[0, 2, 2, 0]} name="RAP" />
                    <Bar dataKey="spent" fill="hsl(30, 85%, 50%)" radius={[0, 2, 2, 0]} name="Actual" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card rounded-lg p-4 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-1">Cashflow Multi-Year</h3>
              <p className="text-[11px] text-muted-foreground mb-3">Planned vs Actual</p>
              <div className="h-[280px] overflow-x-auto">
                <div style={{ width: `${cashflowPxWidth}px`, height: "100%" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cashflowData}>
                      <defs>
                        <linearGradient id="cGP" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(200, 75%, 45%)" stopOpacity={0.2} /><stop offset="100%" stopColor="hsl(200, 75%, 45%)" stopOpacity={0} /></linearGradient>
                        <linearGradient id="cGA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(30, 85%, 50%)" stopOpacity={0.2} /><stop offset="100%" stopColor="hsl(30, 85%, 50%)" stopOpacity={0} /></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                      <XAxis dataKey="label" tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={chartTooltip} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: "10px" }} />
                      <Area type="monotone" dataKey="planned" stroke="hsl(200, 75%, 45%)" fill="url(#cGP)" strokeWidth={2} name="Planned" />
                      <Area type="monotone" dataKey="actual" stroke="hsl(30, 85%, 50%)" fill="url(#cGA)" strokeWidth={2} name="Actual" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Procurement Cost Summary for selected project */}
          {selectedProjectId !== "all" && procItems.length > 0 && (
            <div className="glass-card rounded-lg shadow-card overflow-hidden mb-5">
              <div className="p-3 border-b border-border"><h3 className="text-sm font-semibold text-foreground">Procurement Cost Breakdown</h3></div>
              <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(categoryBreakdown).map(([cat, amt]) => (
                  <div key={cat} className="bg-muted/30 rounded-lg p-3 border border-border/50">
                    <p className="text-[10px] text-muted-foreground uppercase">{cat}</p>
                    <p className="text-sm font-bold font-mono-data text-foreground">{formatRupiah(amt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Breakdown Views */}
          {viewMode === "project" && (
            <div className="glass-card rounded-lg shadow-card overflow-hidden">
              <div className="p-3 border-b border-border"><h3 className="text-sm font-semibold text-foreground">Detail Biaya per Proyek — Contract, RAP, Committed (PO), Actual & Margin</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="bg-muted/50 border-b border-border">
                    <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Kode</th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Proyek</th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Contract</th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">RAP</th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Committed (PO)</th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Actual</th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Remaining</th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Used%</th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">CPI</th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Margin</th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Penalty</th>
                  </tr></thead>
                  <tbody>
                    {filteredProjects.map(p => {
                      const pct = Math.round(p.spent / p.budget * 100);
                      const cpi = p.spent > 0 ? ((p.progress / 100) * p.budget) / p.spent : 1;
                      const cv = p.contract_value || p.budget;
                      const margin = cv > 0 ? Math.round((cv - p.spent) / cv * 100) : 0;
                      const committed = committedByProject[p.id] || 0;
                      const penalty = penaltyByProject[p.id] || 0;
                      return (
                        <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/project/${p.id}`)}>
                          <td className="py-2 px-3 font-mono-data text-primary">{p.project_code}</td>
                          <td className="py-2 px-3 font-medium text-foreground">{p.name}</td>
                          <td className="py-2 px-3 font-mono-data text-primary">{formatRupiah(cv)}</td>
                          <td className="py-2 px-3 font-mono-data text-info">{formatRupiah(p.rap)}</td>
                          <td className="py-2 px-3 font-mono-data text-info">{formatRupiah(committed)}</td>
                          <td className="py-2 px-3 font-mono-data text-foreground">{formatRupiah(p.spent)}</td>
                          <td className="py-2 px-3 font-mono-data text-success">{formatRupiah(p.budget - p.spent)}</td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1.5">
                              <Progress value={pct} className="h-1 flex-1 max-w-[50px]" />
                              <span className={`font-mono-data ${pct > 90 ? "text-destructive" : "text-foreground"}`}>{pct}%</span>
                            </div>
                          </td>
                          <td className={`py-2 px-3 font-mono-data font-bold ${cpi >= 1 ? "text-success" : "text-destructive"}`}>{cpi.toFixed(2)}</td>
                          <td className={`py-2 px-3 font-mono-data font-bold ${margin > 10 ? "text-success" : margin > 0 ? "text-warning" : "text-destructive"}`}>{margin}%</td>
                          <td className={`py-2 px-3 font-mono-data ${penalty > 0 ? "text-destructive font-bold" : "text-muted-foreground"}`}>{penalty > 0 ? formatRupiah(penalty) : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {viewMode === "category" && (
            <div className="glass-card rounded-lg shadow-card overflow-hidden">
              <div className="p-3 border-b border-border"><h3 className="text-sm font-semibold text-foreground">Breakdown PO per Kategori</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="bg-muted/50 border-b border-border">
                    <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Kategori</th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Jumlah PO</th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Committed</th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">% dari Total</th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Penalty</th>
                  </tr></thead>
                  <tbody>
                    {Object.entries(poBreakdownByCategory).sort((a, b) => b[1].committed - a[1].committed).map(([cat, v]) => {
                      const pct = totalCommitted > 0 ? (v.committed / totalCommitted) * 100 : 0;
                      return (
                        <tr key={cat} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-2 px-3 font-medium text-foreground capitalize">{cat}</td>
                          <td className="py-2 px-3 font-mono-data text-foreground">{v.count}</td>
                          <td className="py-2 px-3 font-mono-data text-info">{formatRupiah(v.committed)}</td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1.5">
                              <Progress value={pct} className="h-1 flex-1 max-w-[80px]" />
                              <span className="font-mono-data text-foreground">{pct.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className={`py-2 px-3 font-mono-data ${v.penalty > 0 ? "text-destructive font-bold" : "text-muted-foreground"}`}>{v.penalty > 0 ? formatRupiah(v.penalty) : "—"}</td>
                        </tr>
                      );
                    })}
                    {Object.keys(poBreakdownByCategory).length === 0 && (
                      <tr><td colSpan={5} className="py-8 text-center text-muted-foreground text-xs">Tidak ada data PO untuk filter ini.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {viewMode === "wbs" && (
            <div className="glass-card rounded-lg shadow-card overflow-hidden">
              <div className="p-3 border-b border-border"><h3 className="text-sm font-semibold text-foreground">Breakdown PO per WBS / Aktivitas Terkait</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="bg-muted/50 border-b border-border">
                    <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">WBS / Aktivitas</th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Committed</th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">% dari Total</th>
                  </tr></thead>
                  <tbody>
                    {Object.entries(poBreakdownByWBS).sort((a, b) => b[1] - a[1]).map(([wbs, amt]) => {
                      const pct = totalCommitted > 0 ? (amt / totalCommitted) * 100 : 0;
                      return (
                        <tr key={wbs} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-2 px-3 font-medium text-foreground">{wbs}</td>
                          <td className="py-2 px-3 font-mono-data text-info">{formatRupiah(amt)}</td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1.5">
                              <Progress value={pct} className="h-1 flex-1 max-w-[120px]" />
                              <span className="font-mono-data text-foreground">{pct.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {Object.keys(poBreakdownByWBS).length === 0 && (
                      <tr><td colSpan={3} className="py-8 text-center text-muted-foreground text-xs">Tidak ada data PO untuk filter ini.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CostPerformance;
