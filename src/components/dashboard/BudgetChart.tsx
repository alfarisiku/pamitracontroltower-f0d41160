import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { monthlyBudget } from "@/data/projectData";

export function BudgetChart() {
  return (
    <div className="glass-card rounded-lg p-5 animate-slide-up shadow-card">
      <h3 className="text-sm font-semibold text-foreground mb-1">Tren Budget (Miliar Rp)</h3>
      <p className="text-xs text-muted-foreground mb-4">Planned vs Actual — 6 bulan terakhir</p>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={monthlyBudget}>
            <defs>
              <linearGradient id="gradPlanned" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(200, 75%, 45%)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(200, 75%, 45%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(210, 80%, 45%)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(210, 80%, 45%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 92%)" />
            <XAxis dataKey="month" tick={{ fill: "hsl(215, 12%, 50%)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(215, 12%, 50%)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(214, 20%, 90%)",
                borderRadius: "8px",
                fontSize: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            />
            <Area type="monotone" dataKey="planned" stroke="hsl(200, 75%, 45%)" fill="url(#gradPlanned)" strokeWidth={2} />
            <Area type="monotone" dataKey="actual" stroke="hsl(210, 80%, 45%)" fill="url(#gradActual)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded bg-info" />
          <span className="text-xs text-muted-foreground">Planned</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded bg-primary" />
          <span className="text-xs text-muted-foreground">Actual</span>
        </div>
      </div>
    </div>
  );
}
