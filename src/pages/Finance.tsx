import { useMemo, useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useProjects, useAllFinanceEntries } from "@/hooks/useProjects";
import { formatRupiah, FINANCE_CATEGORIES, FinanceCategory } from "@/lib/supabase";
import { Wallet, TrendingDown, TrendingUp, AlertCircle } from "lucide-react";
import { FinanceEntriesEditor } from "@/components/data-entry/FinanceEntriesEditor";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const inputCls = "px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const CAT_COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899","#84cc16","#f97316","#6366f1","#94a3b8"];

type Bucket = "weekly" | "monthly";

function bucketKey(dateStr: string, mode: Bucket): { key: string; label: string; sort: number } {
  const d = new Date(dateStr);
  if (mode === "monthly") {
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    return { key, label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), sort: d.getFullYear()*12+d.getMonth() };
  }
  const day = d.getDay();
  const monday = new Date(d); monday.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  const key = monday.toISOString().slice(0,10);
  return { key, label: `Wk ${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, sort: monday.getTime() };
}

const Finance = () => {
  const { data: projects = [] } = useProjects();
  const { data: allEntriesRaw = [] } = useAllFinanceEntries();
  const [projectId, setProjectId] = useState<string>("all");
  const [bucket, setBucket] = useState<Bucket>("monthly");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dirFilter, setDirFilter] = useState<"all"|"in"|"out">("all");
  const [kindFilter, setKindFilter] = useState<"all"|"rap"|"actual">("all");
  const [catFilter, setCatFilter] = useState<"all"|FinanceCategory>("all");

  // Only plan (rap) & actual entries
  const allEntries = useMemo(() => allEntriesRaw.filter(e => e.entry_kind === "rap" || e.entry_kind === "actual"), [allEntriesRaw]);

  const entries = useMemo(() => allEntries.filter(e =>
    (projectId === "all" || e.project_id === projectId) &&
    (dirFilter === "all" || e.direction === dirFilter) &&
    (kindFilter === "all" || e.entry_kind === kindFilter) &&
    (catFilter === "all" || e.category === catFilter) &&
    (!dateFrom || e.period_date >= dateFrom) &&
    (!dateTo || e.period_date <= dateTo)
  ), [allEntries, projectId, dirFilter, kindFilter, catFilter, dateFrom, dateTo]);

  const totals = useMemo(() => {
    const t = { plan_in:0, actual_in:0, plan_out:0, actual_out:0 };
    for (const e of entries) {
      const amt = Number(e.amount) || 0;
      if (e.direction === "in") { if (e.entry_kind === "rap") t.plan_in += amt; else t.actual_in += amt; }
      else { if (e.entry_kind === "rap") t.plan_out += amt; else t.actual_out += amt; }
    }
    return t;
  }, [entries]);

  const planVsActualPct = totals.plan_out > 0 ? Math.round((totals.actual_out / totals.plan_out) * 100) : 0;
  const netActual = totals.actual_in - totals.actual_out;

  const timeChart = useMemo(() => {
    const map: Record<string, { key:string; period: string; sort: number; plan_in:number; plan_out:number; actual_in:number; actual_out:number }> = {};
    for (const e of entries) {
      const b = bucketKey(e.period_date, bucket);
      if (!map[b.key]) map[b.key] = { key: b.key, period: b.label, sort: b.sort, plan_in:0, plan_out:0, actual_in:0, actual_out:0 };
      const amt = Number(e.amount) || 0;
      if (e.direction === "in") map[b.key][e.entry_kind === "rap" ? "plan_in" : "actual_in"] += amt;
      else map[b.key][e.entry_kind === "rap" ? "plan_out" : "actual_out"] += amt;
    }
    return Object.values(map).sort((a,b) => a.sort - b.sort);
  }, [entries, bucket]);

  const cumulative = useMemo(() => {
    let cum = 0;
    return timeChart.map(m => { const net = m.actual_in - m.actual_out; cum += net; return { period: m.period, monthly_net: net, cumulative: cum }; });
  }, [timeChart]);

  const categoryBreakdown = useMemo(() => {
    const map: Partial<Record<FinanceCategory, number>> = {};
    for (const e of entries) {
      if (e.direction === "out" && e.entry_kind === "actual" && e.category) {
        map[e.category] = (map[e.category] || 0) + Number(e.amount || 0);
      }
    }
    return FINANCE_CATEGORIES.map(c => ({ name: c.label, value: map[c.value] || 0 })).filter(x => x.value > 0);
  }, [entries]);

  const catCompare = useMemo(() => {
    const plan: Partial<Record<FinanceCategory, number>> = {};
    const actual: Partial<Record<FinanceCategory, number>> = {};
    for (const e of entries) {
      if (e.direction !== "out" || !e.category) continue;
      const amt = Number(e.amount) || 0;
      if (e.entry_kind === "rap") plan[e.category] = (plan[e.category] || 0) + amt;
      else actual[e.category] = (actual[e.category] || 0) + amt;
    }
    return FINANCE_CATEGORIES.filter(c => (plan[c.value]||0) + (actual[c.value]||0) > 0)
      .map(c => ({ category: c.label, Planning: plan[c.value]||0, Actual: actual[c.value]||0 }));
  }, [entries]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-3 sm:p-5 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <DashboardHeader />

          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" /> Finance — Cash Flow</h2>
              <p className="text-xs text-muted-foreground">Cash In / Cash Out • Planning vs Actual • Auto-aggregated Weekly / Monthly</p>
            </div>
          </div>

          <div className="glass-card rounded-lg p-3 mb-4 flex items-center gap-2 flex-wrap text-xs">
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className={inputCls}>
              <option value="all">All Projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.project_code} — {p.name}</option>)}
            </select>
            <select value={bucket} onChange={e => setBucket(e.target.value as Bucket)} className={inputCls}>
              <option value="monthly">Monthly View</option><option value="weekly">Weekly View</option>
            </select>
            <select value={dirFilter} onChange={e => setDirFilter(e.target.value as any)} className={inputCls}>
              <option value="all">All Type</option><option value="in">Cash In</option><option value="out">Cash Out</option>
            </select>
            <select value={kindFilter} onChange={e => setKindFilter(e.target.value as any)} className={inputCls}>
              <option value="all">Plan + Actual</option><option value="rap">Planning</option><option value="actual">Actual</option>
            </select>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value as any)} className={inputCls}>
              <option value="all">All Category</option>
              {FINANCE_CATEGORIES.filter(c => c.value !== "other").map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputCls} title="From" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputCls} title="To" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
            <div className="glass-card rounded-lg p-3 border border-primary/30"><p className="text-[9px] text-muted-foreground uppercase">Plan Cash In</p><p className="text-sm font-bold font-mono-data text-primary">{formatRupiah(totals.plan_in)}</p></div>
            <div className="glass-card rounded-lg p-3 border border-success/30"><p className="text-[9px] text-muted-foreground uppercase">Actual Cash In</p><p className="text-sm font-bold font-mono-data text-success">{formatRupiah(totals.actual_in)}</p></div>
            <div className="glass-card rounded-lg p-3 border border-warning/30"><p className="text-[9px] text-muted-foreground uppercase">Plan Cash Out</p><p className="text-sm font-bold font-mono-data text-warning">{formatRupiah(totals.plan_out)}</p></div>
            <div className="glass-card rounded-lg p-3 border border-destructive/30"><p className="text-[9px] text-muted-foreground uppercase">Actual Cash Out</p><p className="text-sm font-bold font-mono-data text-destructive">{formatRupiah(totals.actual_out)}</p></div>
            <div className={`glass-card rounded-lg p-3 border ${netActual >= 0 ? "border-success/30" : "border-destructive/30"}`}>
              <p className="text-[9px] text-muted-foreground uppercase flex items-center gap-1">Net Cashflow {netActual >= 0 ? <TrendingUp className="h-3 w-3 text-success" /> : <TrendingDown className="h-3 w-3 text-destructive" />}</p>
              <p className={`text-sm font-bold font-mono-data ${netActual >= 0 ? "text-success" : "text-destructive"}`}>{formatRupiah(netActual)}</p>
            </div>
          </div>

          {planVsActualPct > 100 && (
            <div className="glass-card rounded-lg p-3 mb-5 border border-destructive/40 bg-destructive/5 flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="h-4 w-4" /> Actual Out sudah <strong>{planVsActualPct}%</strong> dari Planning Out — over-budget!
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
            <div className="glass-card rounded-lg shadow-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">{bucket === "monthly" ? "Monthly" : "Weekly"} — Cash In vs Cash Out</h3>
              {timeChart.length === 0 ? <p className="text-xs text-muted-foreground">No data.</p> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={timeChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 15%, 88%)" />
                    <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}M`} />
                    <Tooltip formatter={(v: any) => formatRupiah(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="actual_in" fill="#10b981" name="Cash In (Actual)" />
                    <Bar dataKey="actual_out" fill="#ef4444" name="Cash Out (Actual)" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="glass-card rounded-lg shadow-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Planning vs Actual (Cash Out)</h3>
              {timeChart.length === 0 ? <p className="text-xs text-muted-foreground">No data.</p> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={timeChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 15%, 88%)" />
                    <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}M`} />
                    <Tooltip formatter={(v: any) => formatRupiah(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="plan_out" fill="#f59e0b" name="Planning Out" />
                    <Bar dataKey="actual_out" fill="#ef4444" name="Actual Out" />
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
                    <Line type="monotone" dataKey="monthly_net" stroke="#3b82f6" name="Period Net" strokeWidth={2} />
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

            <div className="glass-card rounded-lg shadow-card p-4 lg:col-span-2">
              <h3 className="text-sm font-semibold text-foreground mb-3">Category — Planning vs Actual</h3>
              {catCompare.length === 0 ? <p className="text-xs text-muted-foreground">No data.</p> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={catCompare} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 15%, 88%)" />
                    <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}M`} />
                    <YAxis type="category" dataKey="category" tick={{ fontSize: 9 }} width={160} />
                    <Tooltip formatter={(v: any) => formatRupiah(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="Planning" fill="#f59e0b" />
                    <Bar dataKey="Actual" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {projectId !== "all" ? <FinanceEntriesEditor projectId={projectId} /> : (
            <div className="glass-card rounded-lg p-4 text-xs text-muted-foreground">
              Pilih proyek di atas untuk mengelola (Add / Edit / Delete) transaksi cashflow.
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Finance;
