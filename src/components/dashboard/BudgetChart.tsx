import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";
import { useMonthlyBudgets, useProjects, useAlerts } from "@/hooks/useProjects";
import { useState } from "react";
import { formatRupiah } from "@/lib/supabase";
import { ChevronDown } from "lucide-react";

const tabs = ["Cost", "Cashflow", "Risk"];

const COLORS = ["hsl(152, 55%, 40%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 50%)", "hsl(215, 80%, 48%)"];

const PROJECT_COLORS = [
  "hsl(215, 80%, 55%)", "hsl(30, 85%, 55%)", "hsl(152, 55%, 45%)", "hsl(0, 72%, 55%)",
  "hsl(270, 55%, 60%)", "hsl(195, 70%, 50%)", "hsl(340, 70%, 55%)", "hsl(45, 90%, 50%)",
  "hsl(120, 40%, 50%)", "hsl(210, 60%, 65%)", "hsl(15, 75%, 55%)", "hsl(180, 50%, 45%)",
  "hsl(300, 40%, 55%)", "hsl(60, 70%, 45%)", "hsl(240, 50%, 60%)"
];

export function BudgetChart() {
  const { data: budgets = [] } = useMonthlyBudgets();
  const { data: projects = [] } = useProjects();
  const { data: alerts = [] } = useAlerts();
  const [activeTab, setActiveTab] = useState("Cost");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");

  const filteredProjects = selectedProjectId === "all" ? projects : projects.filter(p => p.id === selectedProjectId);

  const chartTooltipStyle = {
    backgroundColor: "hsl(0, 0%, 100%)",
    border: "1px solid hsl(215, 20%, 88%)",
    borderRadius: "6px",
    fontSize: "11px",
    color: "hsl(220, 25%, 15%)",
  };

  // Cashflow = monthly budgets
  const cashflowData = budgets.sort((a, b) => a.year - b.year || a.month.localeCompare(b.month)).map(b => ({
    ...b, label: `${b.month.slice(0, 3)}'${String(b.year).slice(-2)}`,
    variance: b.actual - b.planned,
  }));

  // Risk data
  const riskData = [
    { name: "Critical", value: alerts.filter(a => a.severity === "critical").length },
    { name: "High", value: alerts.filter(a => a.severity === "high").length },
    { name: "Medium", value: alerts.filter(a => a.severity === "medium").length },
    { name: "Low", value: alerts.filter(a => a.severity === "low").length },
  ].filter(d => d.value > 0);

  // Cost data per project with lighter distinct colors
  const costData = filteredProjects.slice(0, 15).map(p => ({
    name: p.project_code,
    budget: Math.round(p.budget / 1000),
    spent: Math.round(p.spent / 1000),
  }));

  return (
    <div className="glass-card rounded-lg p-4 animate-slide-up shadow-card">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        {activeTab === "Cost" && (
          <div className="relative">
            <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}
              className="appearance-none pl-2 pr-7 py-1 text-[10px] bg-card border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
              <option value="all">All ({projects.length})</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.project_code}</option>)}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
          </div>
        )}
      </div>
      <div className="h-[200px]">
        {activeTab === "Cost" && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={costData} margin={{ left: 0, right: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
              <XAxis dataKey="name" tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => `${v}B`} />
              <Bar dataKey="budget" fill="hsl(215, 80%, 65%)" radius={[2, 2, 0, 0]} name="Budget" />
              <Bar dataKey="spent" fill="hsl(30, 85%, 60%)" radius={[2, 2, 0, 0]} name="Spent" />
            </BarChart>
          </ResponsiveContainer>
        )}

        {activeTab === "Cashflow" && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cashflowData}>
              <defs>
                <linearGradient id="gradP2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(200, 75%, 45%)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(200, 75%, 45%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradA2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(30, 85%, 50%)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(30, 85%, 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
              <XAxis dataKey="label" tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: "10px" }} />
              <Area type="monotone" dataKey="planned" stroke="hsl(200, 75%, 45%)" fill="url(#gradP2)" strokeWidth={2} name="Planned" />
              <Area type="monotone" dataKey="actual" stroke="hsl(30, 85%, 50%)" fill="url(#gradA2)" strokeWidth={2} name="Actual" />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {activeTab === "Risk" && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={riskData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {riskData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: "10px" }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="flex items-center gap-4 mt-2">
        {activeTab === "Cost" && (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded" style={{ background: "hsl(215, 80%, 65%)" }} />
              <span className="text-[10px] text-muted-foreground">Budget (Milyar)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded" style={{ background: "hsl(30, 85%, 60%)" }} />
              <span className="text-[10px] text-muted-foreground">Spent (Milyar)</span>
            </div>
          </>
        )}
        {activeTab === "Cashflow" && (
          <>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded bg-info" />
              <span className="text-[10px] text-muted-foreground">Planned</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded bg-accent" />
              <span className="text-[10px] text-muted-foreground">Actual</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
