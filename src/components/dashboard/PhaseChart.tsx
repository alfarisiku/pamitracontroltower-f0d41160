import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { phaseDistribution } from "@/data/projectData";

export function PhaseChart() {
  const total = phaseDistribution.reduce((s, d) => s + d.value, 0);

  return (
    <div className="glass-card rounded-lg p-5 animate-slide-up">
      <h3 className="text-sm font-semibold text-foreground mb-1">Distribusi Fase</h3>
      <p className="text-xs text-muted-foreground mb-4">Proyek per fase EPC</p>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={phaseDistribution}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
            >
              {phaseDistribution.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(220, 18%, 13%)",
                border: "1px solid hsl(220, 14%, 20%)",
                borderRadius: "8px",
                color: "hsl(210, 20%, 92%)",
                fontSize: "12px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {phaseDistribution.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
            <span className="text-xs text-muted-foreground">{d.name}</span>
            <span className="text-xs font-mono-data text-foreground ml-auto">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
