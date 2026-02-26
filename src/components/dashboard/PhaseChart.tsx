import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { phaseDistribution } from "@/data/projectData";

export function PhaseChart() {
  return (
    <div className="glass-card rounded-lg p-5 animate-slide-up shadow-card">
      <h3 className="text-sm font-semibold text-foreground mb-1">Distribusi Fase</h3>
      <p className="text-xs text-muted-foreground mb-4">Proyek per fase EPC</p>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={phaseDistribution}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
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
                backgroundColor: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(214, 20%, 90%)",
                borderRadius: "8px",
                fontSize: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
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
