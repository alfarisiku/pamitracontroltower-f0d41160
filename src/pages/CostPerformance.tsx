import { useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useProjects, useMonthlyBudgets, useWorkAreas, useMilestones } from "@/hooks/useProjects";
import { formatRupiah } from "@/lib/supabase";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from "recharts";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, ChevronDown, Share2, Percent } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CostPerformance = () => {
  const navigate = useNavigate();
  const { data: projects = [], isLoading } = useProjects();
  const { data: budgets = [] } = useMonthlyBudgets();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const { data: workAreas = [] } = useWorkAreas(selectedProjectId !== "all" ? selectedProjectId : undefined);
  const { data: milestones = [] } = useMilestones(selectedProjectId !== "all" ? selectedProjectId : undefined);

  const filteredProjects = selectedProjectId === "all" ? projects : projects.filter(p => p.id === selectedProjectId);

  if (isLoading) {
    return <div className="flex min-h-screen"><Sidebar /><div className="flex-1 flex items-center justify-center"><div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div></div>;
  }

  const totalBudget = filteredProjects.reduce((s, p) => s + p.budget, 0);
  const totalSpent = filteredProjects.reduce((s, p) => s + p.spent, 0);
  const remaining = totalBudget - totalSpent;
  const overBudget = filteredProjects.filter(p => (p.spent / p.budget) > 0.9);

  const barData = filteredProjects.map(p => ({
    name: p.project_code, fullName: p.name, budget: p.budget, spent: p.spent,
    margin: Math.round((p.budget - p.spent) / p.budget * 100),
  }));

  // Group budgets by year
  const years = [...new Set(budgets.map(b => b.year))].sort();
  const cashflowData = budgets.sort((a, b) => a.year - b.year || a.month.localeCompare(b.month)).map(b => ({
    ...b, label: `${b.month.slice(0, 3)}'${String(b.year).slice(-2)}`,
    variance: b.actual - b.planned,
  }));

  const chartTooltip = { backgroundColor: "hsl(0, 0%, 100%)", border: "1px solid hsl(215, 20%, 88%)", borderRadius: "6px", fontSize: "11px", color: "hsl(220, 25%, 15%)" };

  const handleShare = async () => {
    if (navigator.share) await navigator.share({ title: "Cost Performance", url: window.location.href });
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
              <h2 className="text-lg font-bold text-foreground">Cost Performance</h2>
              <p className="text-xs text-muted-foreground">Analisis anggaran, pengeluaran & profit margin</p>
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
              <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-2 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 border border-border"><Share2 className="h-3.5 w-3.5" /> Share</button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
            <div className="glass-card rounded-lg p-3 shadow-card">
              <div className="flex items-center gap-2 mb-1"><div className="p-1.5 rounded-lg bg-accent/15"><DollarSign className="h-4 w-4 text-accent" /></div><span className="text-[10px] uppercase text-muted-foreground">Total Budget</span></div>
              <p className="text-lg font-bold font-mono-data text-accent">{formatRupiah(totalBudget)}</p>
            </div>
            <div className="glass-card rounded-lg p-3 shadow-card">
              <div className="flex items-center gap-2 mb-1"><div className="p-1.5 rounded-lg bg-info/15"><TrendingUp className="h-4 w-4 text-info" /></div><span className="text-[10px] uppercase text-muted-foreground">Spent</span></div>
              <p className="text-lg font-bold font-mono-data text-foreground">{formatRupiah(totalSpent)}</p>
              <p className="text-[10px] text-muted-foreground">{totalBudget > 0 ? Math.round(totalSpent / totalBudget * 100) : 0}%</p>
            </div>
            <div className="glass-card rounded-lg p-3 shadow-card">
              <div className="flex items-center gap-2 mb-1"><div className="p-1.5 rounded-lg bg-success/15"><TrendingDown className="h-4 w-4 text-success" /></div><span className="text-[10px] uppercase text-muted-foreground">Remaining</span></div>
              <p className="text-lg font-bold font-mono-data text-success">{formatRupiah(remaining)}</p>
            </div>
            <div className="glass-card rounded-lg p-3 shadow-card">
              <div className="flex items-center gap-2 mb-1"><div className="p-1.5 rounded-lg bg-primary/15"><Percent className="h-4 w-4 text-primary" /></div><span className="text-[10px] uppercase text-muted-foreground">Avg Margin</span></div>
              <p className="text-lg font-bold font-mono-data text-primary">{totalBudget > 0 ? Math.round(remaining / totalBudget * 100) : 0}%</p>
            </div>
            <div className="glass-card rounded-lg p-3 shadow-card">
              <div className="flex items-center gap-2 mb-1"><div className="p-1.5 rounded-lg bg-destructive/15"><AlertTriangle className="h-4 w-4 text-destructive" /></div><span className="text-[10px] uppercase text-muted-foreground">Over Budget</span></div>
              <p className="text-lg font-bold font-mono-data text-destructive">{overBudget.length}</p>
              <p className="text-[10px] text-muted-foreground">&gt;90% used</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <div className="glass-card rounded-lg p-4 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-1">Budget vs Spent & Margin</h3>
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
                    <Bar dataKey="spent" fill="hsl(30, 85%, 50%)" radius={[0, 2, 2, 0]} name="Spent" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card rounded-lg p-4 shadow-card">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-foreground">Cashflow Multi-Year</h3>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  {years.map(y => <span key={y} className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono-data">{y}</span>)}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mb-3">Planned vs Actual</p>
              <div className="h-[280px]">
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

          {/* WBS Cost + Milestones when project selected */}
          {selectedProjectId !== "all" && workAreas.length > 0 && (
            <div className="glass-card rounded-lg shadow-card overflow-hidden mb-5">
              <div className="p-3 border-b border-border"><h3 className="text-sm font-semibold text-foreground">Cost by WBS Area</h3></div>
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {workAreas.map(wa => (
                  <div key={wa.id} className="bg-muted/30 rounded-lg p-3 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-mono-data text-primary">{wa.code}</span>
                      <span className="text-xs font-medium text-foreground">{wa.name}</span>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground">Weight: {wa.weight}%</span>
                      <span className="text-xs font-mono-data font-bold text-primary">{wa.progress}%</span>
                    </div>
                    <Progress value={wa.progress} className="h-1.5" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedProjectId !== "all" && milestones.length > 0 && (
            <div className="glass-card rounded-lg shadow-card overflow-hidden mb-5">
              <div className="p-3 border-b border-border"><h3 className="text-sm font-semibold text-foreground">Milestone Tracking</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="bg-muted/50 border-b border-border">
                    <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Milestone</th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Phase</th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Target</th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Status</th>
                    <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Weight</th>
                  </tr></thead>
                  <tbody>{milestones.map(ms => {
                    const isLate = ms.status !== "completed" && new Date(ms.target_date) < new Date();
                    return (
                      <tr key={ms.id} className="border-b border-border/30">
                        <td className="py-2 px-3 font-medium text-foreground">{ms.name}</td>
                        <td className="py-2 px-3 text-muted-foreground">{ms.phase}</td>
                        <td className="py-2 px-3 font-mono-data text-muted-foreground">{new Date(ms.target_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" })}</td>
                        <td className="py-2 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                          ms.status === "completed" ? "bg-success/15 text-success border-success/30" : isLate ? "bg-destructive/15 text-destructive border-destructive/30" : "bg-primary/15 text-primary border-primary/30"
                        }`}>{isLate ? "Overdue" : ms.status}</span></td>
                        <td className="py-2 px-3 font-mono-data text-foreground">{ms.weight}%</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cost Table with Margin */}
          <div className="glass-card rounded-lg shadow-card overflow-hidden">
            <div className="p-3 border-b border-border"><h3 className="text-sm font-semibold text-foreground">Detail Biaya & Profit Margin</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="bg-muted/50 border-b border-border">
                  <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Kode</th>
                  <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Proyek</th>
                  <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Budget</th>
                  <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Spent</th>
                  <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Remaining</th>
                  <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Used%</th>
                  <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">CPI</th>
                  <th className="text-left py-2 px-3 text-[10px] uppercase text-muted-foreground">Margin</th>
                </tr></thead>
                <tbody>
                  {filteredProjects.map(p => {
                    const pct = Math.round(p.spent / p.budget * 100);
                    const cpi = p.spent > 0 ? ((p.progress / 100) * p.budget) / p.spent : 1;
                    const margin = Math.round((p.budget - p.spent) / p.budget * 100);
                    return (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/project/${p.id}`)}>
                        <td className="py-2 px-3 font-mono-data text-primary">{p.project_code}</td>
                        <td className="py-2 px-3 font-medium text-foreground">{p.name}</td>
                        <td className="py-2 px-3 font-mono-data text-accent">{formatRupiah(p.budget)}</td>
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CostPerformance;
