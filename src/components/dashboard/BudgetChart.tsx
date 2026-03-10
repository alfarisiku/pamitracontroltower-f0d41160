import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useMonthlyBudgets } from "@/hooks/useProjects";
import { useState } from "react";

const tabs = ["Schedule", "Cost", "Cashflow", "Risk"];

export function BudgetChart() {
  const { data: budgets = [] } = useMonthlyBudgets();
  const [activeTab, setActiveTab] = useState("Cost");

  return (
    <div className="glass-card rounded-lg p-4 animate-slide-up shadow-card">
      <div className="flex items-center gap-1 mb-4">
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
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={budgets}>
            <defs>
              <linearGradient id="gradPlanned" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(200, 75%, 45%)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(200, 75%, 45%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(30, 85%, 50%)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(30, 85%, 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
            <XAxis dataKey="month" tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(215, 20%, 88%)",
                borderRadius: "6px",
                fontSize: "11px",
                color: "hsl(220, 25%, 15%)",
              }}
            />
            <Area type="monotone" dataKey="planned" stroke="hsl(200, 75%, 45%)" fill="url(#gradPlanned)" strokeWidth={2} />
            <Area type="monotone" dataKey="actual" stroke="hsl(30, 85%, 50%)" fill="url(#gradActual)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded bg-info" />
          <span className="text-[10px] text-muted-foreground">Planned</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded bg-accent" />
          <span className="text-[10px] text-muted-foreground">Actual</span>
        </div>
      </div>
    </div>
  );
}
