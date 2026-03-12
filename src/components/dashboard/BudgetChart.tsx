import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";
import { useMonthlyBudgets, useProjects, useAlerts } from "@/hooks/useProjects";
import { useState } from "react";
import { formatRupiah } from "@/lib/supabase";

const tabs = ["Schedule", "Cost", "Cashflow", "Risk"];

const COLORS = ["hsl(152, 55%, 40%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 50%)", "hsl(215, 80%, 48%)"];

export function BudgetChart() {
  const { data: budgets = [] } = useMonthlyBudgets();
  const { data: projects = [] } = useProjects();
  const { data: alerts = [] } = useAlerts();
  const [activeTab, setActiveTab] = useState("Cost");

  const chartTooltipStyle = {
    backgroundColor: "hsl(0, 0%, 100%)",
    border: "1px solid hsl(215, 20%, 88%)",
    borderRadius: "6px",
    fontSize: "11px",
    color: "hsl(220, 25%, 15%)",
  };

  // Schedule data - projects by phase
  const scheduleData = projects.map(p => {
    const end = new Date(p.end_date);
    const now = new Date();
    const remaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000*60*60*24)));
    return { name: p.project_code, progress: p.progress, remaining, phase: p.phase };
  });

  // Cashflow = monthly budgets
  const cashflowData = budgets.map(b => ({
    ...b,
    variance: b.actual - b.planned,
  }));

  // Risk data
  const riskData = [
    { name: "Critical", value: alerts.filter(a => a.severity === "critical").length },
    { name: "High", value: alerts.filter(a => a.severity === "high").length },
    { name: "Medium", value: alerts.filter(a => a.severity === "medium").length },
    { name: "Low", value: alerts.filter(a => a.severity === "low").length },
  ].filter(d => d.value > 0);

  // Cost data per project
  const costData = projects.slice(0, 8).map(p => ({
    name: p.project_code,
    budget: Math.round(p.budget / 1000),
    spent: Math.round(p.spent / 1000),
  }));

  return (
    <div className="glass-card rounded-lg p-4 animate-slide-up shadow-card">
      <div className="flex items-center gap-1 mb-4 flex-wrap">
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
      <div className="h-[200px]">
        {activeTab === "Cost" && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={costData} margin={{ left: 0, right: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
              <XAxis dataKey="name" tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => `${v}B`} />
              <Bar dataKey="budget" fill="hsl(215, 80%, 48%)" radius={[2, 2, 0, 0]} name="Budget" />
              <Bar dataKey="spent" fill="hsl(30, 85%, 50%)" radius={[2, 2, 0, 0]} name="Spent" />
            </BarChart>
          </ResponsiveContainer>
        )}

        {activeTab === "Schedule" && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scheduleData} layout="vertical" margin={{ left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" width={50} tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 8 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => `${v}%`} />
              <Bar dataKey="progress" fill="hsl(152, 55%, 40%)" radius={[0, 2, 2, 0]} name="Progress" />
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
              <XAxis dataKey="month" tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
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
              <div className="w-3 h-0.5 rounded bg-primary" />
              <span className="text-[10px] text-muted-foreground">Budget (Milyar)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded bg-accent" />
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
