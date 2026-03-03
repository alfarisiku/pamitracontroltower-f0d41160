import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { DbProject } from "@/lib/supabase";

const phaseColors: Record<string, string> = {
  Engineering: "hsl(210, 80%, 55%)",
  Procurement: "hsl(38, 92%, 55%)",
  Construction: "hsl(200, 75%, 50%)",
  Commissioning: "hsl(152, 55%, 45%)",
};

export function PhaseChart({ projects }: { projects: DbProject[] }) {
  const phaseCounts: Record<string, number> = {};
  projects.forEach((p) => {
    phaseCounts[p.phase] = (phaseCounts[p.phase] || 0) + 1;
  });
  const data = Object.entries(phaseCounts).map(([name, value]) => ({
    name,
    value,
    fill: phaseColors[name] || "hsl(210, 80%, 55%)",
  }));

  return (
    <div className="glass-card rounded-lg p-4 animate-slide-up shadow-card">
      <h3 className="text-sm font-semibold text-foreground mb-1">Distribusi Fase</h3>
      <p className="text-[11px] text-muted-foreground mb-3">Proyek per fase EPC</p>
      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value" stroke="none">
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(220, 28%, 14%)",
                border: "1px solid hsl(220, 25%, 22%)",
                borderRadius: "6px",
                fontSize: "11px",
                color: "hsl(210, 20%, 92%)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-1.5 mt-1">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
            <span className="text-[10px] text-muted-foreground">{d.name}</span>
            <span className="text-[10px] font-mono-data text-foreground ml-auto">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
