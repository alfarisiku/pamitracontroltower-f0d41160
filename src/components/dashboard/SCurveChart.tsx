import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface SCurveProps {
  startDate: string;
  endDate: string;
  progress: number;
  milestones?: { target_date: string; status: string; weight: number; name: string }[];
}

function generateSCurveData(startDate: string, endDate: string, progress: number) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();
  const totalMonths = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));

  const data: { month: string; planned: number; actual: number | null }[] = [];

  for (let i = 0; i <= totalMonths; i++) {
    const date = new Date(start);
    date.setMonth(date.getMonth() + i);
    const label = date.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });

    // S-curve formula: sigmoid approximation
    const t = i / totalMonths;
    const planned = Math.round(100 / (1 + Math.exp(-10 * (t - 0.5))));

    // Actual: only up to current date
    let actual: number | null = null;
    if (date <= now) {
      const elapsed = Math.min(1, (now.getTime() - start.getTime()) / (end.getTime() - start.getTime()));
      const actualT = i / totalMonths;
      if (actualT <= elapsed + 0.05) {
        // Scale actual based on real progress
        const expectedAtThis = 100 / (1 + Math.exp(-10 * (actualT - 0.5)));
        const ratio = progress / Math.max(1, 100 / (1 + Math.exp(-10 * (elapsed - 0.5))));
        actual = Math.min(100, Math.round(expectedAtThis * ratio));
      }
    }

    data.push({ month: label, planned, actual });
  }

  return data;
}

export function SCurveChart({ startDate, endDate, progress, milestones = [] }: SCurveProps) {
  const data = generateSCurveData(startDate, endDate, progress);

  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  const elapsed = Math.min(1, (now.getTime() - start.getTime()) / (end.getTime() - start.getTime()));
  const currentMonthIdx = Math.round(elapsed * (data.length - 1));
  const currentLabel = data[Math.min(currentMonthIdx, data.length - 1)]?.month;

  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="scPlanned" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(215, 80%, 55%)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(215, 80%, 55%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="scActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(152, 55%, 50%)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(152, 55%, 50%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
          <XAxis dataKey="month" tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(0, 0%, 100%)",
              border: "1px solid hsl(215, 20%, 88%)",
              borderRadius: "8px",
              fontSize: "11px",
            }}
            formatter={(value: number, name: string) => [`${value}%`, name === "planned" ? "Planned" : "Actual"]}
          />
          {currentLabel && (
            <ReferenceLine x={currentLabel} stroke="hsl(0, 72%, 50%)" strokeDasharray="5 5" strokeWidth={1.5} label={{ value: "Today", position: "top", fontSize: 10, fill: "hsl(0, 72%, 50%)" }} />
          )}
          <Area type="monotone" dataKey="planned" stroke="hsl(215, 80%, 55%)" fill="url(#scPlanned)" strokeWidth={2} name="planned" dot={false} />
          <Area type="monotone" dataKey="actual" stroke="hsl(152, 55%, 50%)" fill="url(#scActual)" strokeWidth={2.5} name="actual" dot={false} connectNulls={false} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-6 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded" style={{ background: "hsl(215, 80%, 55%)" }} />
          <span className="text-[10px] text-muted-foreground">Planned (S-Curve)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded" style={{ background: "hsl(152, 55%, 50%)" }} />
          <span className="text-[10px] text-muted-foreground">Actual Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded border-dashed border-t-2" style={{ borderColor: "hsl(0, 72%, 50%)" }} />
          <span className="text-[10px] text-muted-foreground">Today</span>
        </div>
      </div>
    </div>
  );
}
