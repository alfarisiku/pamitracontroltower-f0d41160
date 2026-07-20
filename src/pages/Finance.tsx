import { useMemo, useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useProjects, useAllFinanceEntries } from "@/hooks/useProjects";
import { formatRupiah, FINANCE_CATEGORIES, FinanceCategory, FinanceEntryKind } from "@/lib/supabase";
import { Wallet, TrendingDown, TrendingUp, AlertCircle } from "lucide-react";
import { FinanceEntriesEditor } from "@/components/data-entry/FinanceEntriesEditor";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const inputCls = "px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

const CAT_COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899","#84cc16","#f97316","#6366f1","#94a3b8"];

const Finance = () => {
  const { data: projects = [] } = useProjects();
  const { data: allEntries = [] } = useAllFinanceEntries();
  const [projectId, setProjectId] = useState<string>("all");

  const entries = useMemo(() => projectId === "all" ? allEntries : allEntries.filter(e => e.project_id === projectId), [allEntries, projectId]);

  const totals = useMemo(() => {
    const t = { rap_out:0, po_out:0, actual_out:0, forecast_out:0, actual_in:0, forecast_in:0 };
    for (const e of entries) {
      const amt = Number(e.amount) || 0;
      if (e.direction === "out") {
        if (e.entry_kind === "rap") t.rap_out += amt;
        else if (e.entry_kind === "po") t.po_out += amt;
        else if (e.entry_kind === "actual") t.actual_out += amt;
        else if (e.entry_kind === "forecast") t.forecast_out += amt;
      } else {
        if (e.entry_kind === "actual") t.actual_in += amt;
        else if (e.entry_kind === "forecast") t.forecast_in += amt;
      }
    }
    return t;
  }, [entries]);

  const rapVsActualPct = totals.rap_out > 0 ? Math.round((totals.actual_out / totals.rap_out) * 100) : 0;
  const netActual = totals.actual_in - totals.actual_out;

  // Monthly chart: plan vs actual (out)
  const monthlyChart = useMemo(() => {
    const map: Record<string, { period: string; sortKey: number; rap: number; po: number; actual: number; forecast: number; in: number }> = {};
    for (const e of entries) {
      const d = new Date(e.period_date);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      if (!map[key]) map[key] = { period: label, sortKey: d.getFullYear()*12+d.getMonth(), rap:0, po:0, actual:0, forecast:0, in:0 };
      const amt = Number(e.amount) || 0;
      if (e.direction === "in" && e.entry_kind === "actual") map[key].in += amt;
      else if (e.direction === "out") {
        if (e.entry_kind === "rap") map[key].rap += amt;
        else if (e.entry_kind === "po") map[key].po += amt;
        else if (e.entry_kind === "actual") map[key].actual += amt;
        else if (e.entry_kind === "forecast") map[key].forecast += amt;
      }
    }
    return Object.values(map).sort((a,b) => a.sortKey - b.sortKey);
  }, [entries]);

  // Cumulative cashflow
  const cumulative = useMemo(() => {
    let cum = 0;
    return monthlyChart.map(m => { cum += (m.in - m.actual); return { period: m.period, net: m.in - m.actual, cumulative: cum }; });
  }, [monthlyChart]);

  // Category breakdown (Actual Out)
  const categoryBreakdown = useMemo(() => {
    const map: Partial<Record<FinanceCategory, number>> = {};
    for (const e of entries) {
      if (e.direction === "out" && e.entry_kind === "actual" && e.category) {
        map[e.category] = (map[e.category] || 0) + Number(e.amount || 0);
      }
    }
    return FINANCE_CATEGORIES.map(c => ({ name: c.label, value: map[c.value] || 0 })).filter(x => x.value > 0);
  }, [entries]);

  // Category comparison: RAP vs Actual per category
  const catCompare = useMemo(() => {
    const rap: Partial<Record<FinanceCategory, number>> = {};
    const actual: Partial<Record<FinanceCategory, number>> = {};
    const po: Partial<Record<FinanceCategory, number>> = {};
    for (const e of entries) {
      if (e.direction !== "out" || !e.category) continue;
      const amt = Number(e.amount) || 0;
      if (e.entry_kind === "rap") rap[e.category] = (rap[e.category] || 0) + amt;
      else if (e.entry_kind === "actual") actual[e.category] = (actual[e.category] || 0) + amt;
      else if (e.entry_kind === "po") po[e.category] = (po[e.category] || 0) + amt;
    }
    return FINANCE_CATEGORIES.filter(c => (rap[c.value]||0) + (actual[c.value]||0) + (po[c.value]||0) > 0)
      .map(c => ({ category: c.label, RAP: rap[c.value]||0, PO: po[c.value]||0, Actual: actual[c.value]||0 }));
  }, [entries]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-3 sm:p-5 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <DashboardHeader />

          <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /> Finance Module</h2>
              <p className="text-xs text-muted-foreground">Cash In / Cash Out — RAP • PO • Actual • Forecast (weekly / monthly)</p>
            </div>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className={inputCls}>
              <option value="all">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-5">
            <div className="glass-card rounded-lg p-3 border border-warning/30">
              <p className="text-[9px] text-muted-foreground uppercase">RAP (Plan Out)</p>
              <p className="text-sm font-bold font-mono-data text-warning">{formatRupiah(totals.rap_out)}</p>
            </div>
            <div className="glass-card rounded-lg p-3 border border-primary/30">
              <p className="text-[9px] text-muted-foreground uppercase">PO Committed</p>
              <p className="text-sm font-bold font-mono-data text-primary">{formatRupiah(totals.po_out)}</p>
            </div>
            <div className="glass-card rounded-lg p-3 border border-destructive/30">
              <p className="text-[9px] text-muted-foreground uppercase">Actual Out</p>
              <p className="text-sm font-bold font-mono-data text-destructive">{formatRupiah(totals.actual_out)}</p>
            </div>
            <div className="glass-card rounded-lg p-3 border border-info/30">
              <p className="text-[9px] text-muted-foreground uppercase">Forecast Out</p>
              <p className="text-sm font-bold font-mono-data text-info">{formatRupiah(totals.forecast_out)}</p>
            </div>
            <div className="glass-card rounded-lg p-3 border border-success/30">
              <p className="text-[9px] text-muted-foreground uppercase">Cash In (Actual)</p>
              <p className="text-sm font-bold font-mono-data text-success">{formatRupiah(totals.actual_in)}</p>
            </div>
            <div className={`glass-card rounded-lg p-3 border ${netActual >= 0 ? "border-success/30" : "border-destructive/30"}`}>
              <p className="text-[9px] text-muted-foreground uppercase flex items-center gap-1">Net Cashflow {netActual >= 0 ? <TrendingUp className="h-3 w-3 text-success" /> : <TrendingDown className="h-3 w-3 text-destructive" />}</p>
              <p className={`text-sm font-bold font-mono-data ${netActual >= 0 ? "text-success" : "text-destructive"}`}>{formatRupiah(netActual)}</p>
            </div>
          </div>

          {rapVsActualPct > 100 && (
            <div className="glass-card rounded-lg p-3 mb-5 border border-destructive/40 bg-destructive/5 flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="h-4 w-4" /> Actual Out sudah <strong>{rapVsActualPct}%</strong> dari RAP — over-budget!
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
            <div className="glass-card rounded-lg shadow-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Monthly Plan vs Actual (Cash Out)</h3>
              {monthlyChart.length === 0 ? <p className="text-xs text-muted-foreground">No data.</p> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthlyChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 15%, 88%)" />
                    <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}M`} />
                    <Tooltip formatter={(v: any) => formatRupiah(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="rap" fill="#f59e0b" name="RAP" />
                    <Bar dataKey="po" fill="#3b82f6" name="PO" />
                    <Bar dataKey="actual" fill="#ef4444" name="Actual" />
                    <Bar dataKey="forecast" fill="#06b6d4" name="Forecast" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="glass-card rounded-lg shadow-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Cumulative Net Cashflow</h3>
              {cumulative.length === 0 ? <p className="text-xs text-muted-foreground">No data.</p> : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={cumulative}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 15%, 88%)" />
                    <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}M`} />
                    <Tooltip formatter={(v: any) => formatRupiah(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="net" stroke="#3b82f6" name="Monthly Net" strokeWidth={2} />
                    <Line type="monotone" dataKey="cumulative" stroke="#10b981" name="Cumulative" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="glass-card rounded-lg shadow-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Actual Cash Out by Category</h3>
              {categoryBreakdown.length === 0 ? <p className="text-xs text-muted-foreground">No data.</p> : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={categoryBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e: any) => e.name}>
                      {categoryBreakdown.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatRupiah(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="glass-card rounded-lg shadow-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Category — RAP vs PO vs Actual</h3>
              {catCompare.length === 0 ? <p className="text-xs text-muted-foreground">No data.</p> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={catCompare} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 15%, 88%)" />
                    <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}M`} />
                    <YAxis type="category" dataKey="category" tick={{ fontSize: 9 }} width={140} />
                    <Tooltip formatter={(v: any) => formatRupiah(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="RAP" fill="#f59e0b" />
                    <Bar dataKey="PO" fill="#3b82f6" />
                    <Bar dataKey="Actual" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {projectId !== "all" && (
            <FinanceEntriesEditor projectId={projectId} />
          )}

          {projectId === "all" && (
            <div className="glass-card rounded-lg p-4 text-xs text-muted-foreground">
              Pilih proyek di atas untuk mengelola (Add / Edit / Delete) finance entries.
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Finance;
