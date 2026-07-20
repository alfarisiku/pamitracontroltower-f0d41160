import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { DbProject } from "@/lib/supabase";

const phaseColors: Record<string, string> = {
  "Production I":   "hsl(215, 80%, 48%)",
  "Production II":  "hsl(30, 85%, 50%)",
  "Production III": "hsl(200, 75%, 45%)",
  "Production IV":  "hsl(152, 55%, 40%)",
  // legacy fallbacks
  Engineering: "hsl(215, 80%, 48%)",
  Procurement: "hsl(30, 85%, 50%)",
  Construction: "hsl(200, 75%, 45%)",
  Commissioning: "hsl(152, 55%, 40%)",
};

export function PhaseChart({ projects }: { projects: DbProject[] }) {
  const phaseCounts: Record<string, number> = {};
  projects.forEach((p) => {
    phaseCounts[p.phase] = (phaseCounts[p.phase] || 0) + 1;
  });
  const data = Object.entries(phaseCounts).map(([name, value]) => ({
    name,
    value,
    fill: phaseColors[name] || "hsl(215, 80%, 48%)",
  }));

  return (
    <div className="glass-card rounded-lg p-4 animate-slide-up shadow-card">
      <h3 className="text-sm font-semibold text-foreground mb-1">Distribusi Fase</h3>
      <p className="text-[11px] text-muted-foreground mb-3">Proyek per Production Phase</p>
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
                backgroundColor: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(215, 20%, 88%)",
                borderRadius: "6px",
                fontSize: "11px",
                color: "hsl(220, 25%, 15%)",
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
