import { useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useProjects, useMonthlyBudgets } from "@/hooks/useProjects";
import { DbProject, formatRupiah } from "@/lib/supabase";
import { ProjectOverviewModal } from "@/components/dashboard/ProjectOverviewModal";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

const CostPerformance = () => {
  const { data: projects = [], isLoading } = useProjects();
  const { data: budgets = [] } = useMonthlyBudgets();
  const [selectedProject, setSelectedProject] = useState<DbProject | null>(null);

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalSpent = projects.reduce((s, p) => s + p.spent, 0);
  const remaining = totalBudget - totalSpent;
  const overBudget = projects.filter((p) => (p.spent / p.budget) > 0.9);

  const barData = projects.map((p) => ({
    name: p.project_code,
    fullName: p.name,
    budget: p.budget,
    spent: p.spent,
    remaining: p.budget - p.spent,
  }));

  const chartTooltipStyle = {
    backgroundColor: "hsl(0, 0%, 100%)",
    border: "1px solid hsl(215, 20%, 88%)",
    borderRadius: "6px",
    fontSize: "11px",
    color: "hsl(220, 25%, 15%)",
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-5 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <DashboardHeader />

          <div className="mb-5">
            <h2 className="text-lg font-bold text-foreground">Cost Performance</h2>
            <p className="text-xs text-muted-foreground">Analisis anggaran dan pengeluaran seluruh proyek EPC</p>
          </div>

          {/* KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <div className="glass-card rounded-lg p-4 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-accent/15"><DollarSign className="h-4 w-4 text-accent" /></div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Anggaran</span>
              </div>
              <p className="text-xl font-bold font-mono-data text-accent">{formatRupiah(totalBudget)}</p>
            </div>
            <div className="glass-card rounded-lg p-4 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-info/15"><TrendingUp className="h-4 w-4 text-info" /></div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Terpakai</span>
              </div>
              <p className="text-xl font-bold font-mono-data text-foreground">{formatRupiah(totalSpent)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{Math.round((totalSpent / totalBudget) * 100)}% dari total anggaran</p>
            </div>
            <div className="glass-card rounded-lg p-4 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-success/15"><TrendingDown className="h-4 w-4 text-success" /></div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Sisa Anggaran</span>
              </div>
              <p className="text-xl font-bold font-mono-data text-success">{formatRupiah(remaining)}</p>
            </div>
            <div className="glass-card rounded-lg p-4 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-destructive/15"><AlertTriangle className="h-4 w-4 text-destructive" /></div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Over Budget Risk</span>
              </div>
              <p className="text-xl font-bold font-mono-data text-destructive">{overBudget.length}</p>
              <p className="text-[10px] text-muted-foreground mt-1">proyek &gt;90% terpakai</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <div className="glass-card rounded-lg p-4 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-1">Anggaran vs Pengeluaran per Proyek</h3>
              <p className="text-[11px] text-muted-foreground mb-3">Perbandingan budget dan actual spending (Juta Rupiah)</p>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                    <XAxis type="number" tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" width={55} tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => formatRupiah(value)} />
                    <Bar dataKey="budget" fill="hsl(215, 80%, 48%)" radius={[0, 2, 2, 0]} name="Anggaran" />
                    <Bar dataKey="spent" fill="hsl(30, 85%, 50%)" radius={[0, 2, 2, 0]} name="Terpakai" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card rounded-lg p-4 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-1">Arus Kas Bulanan</h3>
              <p className="text-[11px] text-muted-foreground mb-3">Planned vs Actual (Juta Rupiah)</p>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={budgets}>
                    <defs>
                      <linearGradient id="costGradPlanned" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(200, 75%, 45%)" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="hsl(200, 75%, 45%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="costGradActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(30, 85%, 50%)" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="hsl(30, 85%, 50%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                    <XAxis dataKey="month" tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Area type="monotone" dataKey="planned" stroke="hsl(200, 75%, 45%)" fill="url(#costGradPlanned)" strokeWidth={2} name="Planned" />
                    <Area type="monotone" dataKey="actual" stroke="hsl(30, 85%, 50%)" fill="url(#costGradActual)" strokeWidth={2} name="Actual" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Detailed Cost Table */}
          <div className="glass-card rounded-lg shadow-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Detail Biaya per Proyek</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Kode</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Proyek</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Anggaran</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Terpakai</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">Sisa</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">% Terpakai</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">CPI</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => {
                    const pct = Math.round((p.spent / p.budget) * 100);
                    const cpi = p.spent > 0 ? ((p.progress / 100) * p.budget) / p.spent : 1;
                    return (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedProject(p)}>
                        <td className="py-2 px-3 font-mono-data text-primary">{p.project_code}</td>
                        <td className="py-2 px-3 font-medium text-foreground">{p.name}</td>
                        <td className="py-2 px-3 font-mono-data text-accent">{formatRupiah(p.budget)}</td>
                        <td className="py-2 px-3 font-mono-data text-foreground">{formatRupiah(p.spent)}</td>
                        <td className="py-2 px-3 font-mono-data text-success">{formatRupiah(p.budget - p.spent)}</td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <Progress value={pct} className="h-1 flex-1 max-w-[60px]" />
                            <span className={`font-mono-data ${pct > 90 ? "text-destructive" : pct > 70 ? "text-warning" : "text-foreground"}`}>{pct}%</span>
                          </div>
                        </td>
                        <td className={`py-2 px-3 font-mono-data font-bold ${cpi >= 1 ? "text-success" : "text-destructive"}`}>
                          {cpi.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {selectedProject && (
        <ProjectOverviewModal project={selectedProject} onClose={() => setSelectedProject(null)} />
      )}
    </div>
  );
};

export default CostPerformance;
