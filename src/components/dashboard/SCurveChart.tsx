import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";

interface SCurveDataPoint {
  period_label: string;
  period_order: number;
  planned_progress: number;
  actual_progress: number | null;
  curve_type: string;
}

interface SCurveProps {
  startDate: string;
  endDate: string;
  progress: number;
  milestones?: { target_date: string; status: string; weight: number; name: string }[];
  customData?: SCurveDataPoint[];
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
    const t = i / totalMonths;
    const planned = Math.round(100 / (1 + Math.exp(-10 * (t - 0.5))));

    let actual: number | null = null;
    if (date <= now) {
      const elapsed = Math.min(1, (now.getTime() - start.getTime()) / (end.getTime() - start.getTime()));
      const actualT = i / totalMonths;
      if (actualT <= elapsed + 0.05) {
        const expectedAtThis = 100 / (1 + Math.exp(-10 * (actualT - 0.5)));
        const ratio = progress / Math.max(1, 100 / (1 + Math.exp(-10 * (elapsed - 0.5))));
        actual = Math.min(100, Math.round(expectedAtThis * ratio));
      }
    }
    data.push({ month: label, planned, actual });
  }
  return data;
}

export function SCurveChart({ startDate, endDate, progress, milestones = [], customData }: SCurveProps) {
  // If custom data exists, use it
  const hasCustom = customData && customData.length > 0;

  let chartData: any[];
  let curveTypes: string[] = [];

  if (hasCustom) {
    // Group by curve_type
    const types = [...new Set(customData.map(d => d.curve_type))];
    curveTypes = types;
    // Merge into single array keyed by period_order
    const periodMap: Record<number, any> = {};
    customData.forEach(d => {
      if (!periodMap[d.period_order]) {
        periodMap[d.period_order] = { month: d.period_label };
      }
      if (d.curve_type === "baseline") {
        periodMap[d.period_order].planned = Number(d.planned_progress);
        periodMap[d.period_order].actual = d.actual_progress != null ? Number(d.actual_progress) : null;
      } else {
        // Additional curves (JO)
        periodMap[d.period_order][`planned_${d.curve_type}`] = Number(d.planned_progress);
        periodMap[d.period_order][`actual_${d.curve_type}`] = d.actual_progress != null ? Number(d.actual_progress) : null;
      }
    });
    chartData = Object.values(periodMap).sort((a: any, b: any) => {
      const aIdx = customData.find(d => d.period_label === a.month)?.period_order ?? 0;
      const bIdx = customData.find(d => d.period_label === b.month)?.period_order ?? 0;
      return aIdx - bIdx;
    });
  } else {
    chartData = generateSCurveData(startDate, endDate, progress);
  }

  // Cut-off = periode terakhir yang punya actual data (bukan calendar today)
  const lastActualIdx = (() => {
    for (let i = chartData.length - 1; i >= 0; i--) {
      const row = chartData[i];
      const hasActual = row.actual != null || Object.keys(row).some(k => k.startsWith("actual_") && row[k] != null);
      if (hasActual) return i;
    }
    // Fallback ke elapsed calendar time jika belum ada actual sama sekali
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    const elapsed = Math.min(1, (now.getTime() - start.getTime()) / (end.getTime() - start.getTime()));
    return Math.round(elapsed * (chartData.length - 1));
  })();
  const currentLabel = chartData[Math.min(Math.max(lastActualIdx, 0), chartData.length - 1)]?.month;

  const additionalTypes = curveTypes.filter(t => t !== "baseline");
  const joColors = ["hsl(280, 60%, 55%)", "hsl(30, 85%, 55%)", "hsl(340, 70%, 55%)"];

  return (
    <div className="w-full">
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
            <XAxis dataKey="month" tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(215, 15%, 50%)", fontSize: 9 }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(215, 20%, 88%)",
                borderRadius: "8px",
                fontSize: "11px",
              }}
              formatter={(value: number, name: string) => [`${value}%`, name === "planned" ? "Baseline Plan" : name === "actual" ? "Actual" : name]}
            />
            {currentLabel && (
              <ReferenceLine x={currentLabel} stroke="hsl(0, 72%, 50%)" strokeDasharray="5 5" strokeWidth={1.5} label={{ value: "Today", position: "top", fontSize: 9, fill: "hsl(0, 72%, 50%)" }} />
            )}
            <Area type="monotone" dataKey="planned" stroke="hsl(215, 80%, 55%)" fill="url(#scPlanned)" strokeWidth={2} name="Baseline Plan" dot={false} />
            <Area type="monotone" dataKey="actual" stroke="hsl(152, 55%, 50%)" fill="url(#scActual)" strokeWidth={2.5} name="Actual" dot={false} connectNulls={false} />
            {additionalTypes.map((type, i) => (
              <Area key={type} type="monotone" dataKey={`planned_${type}`} stroke={joColors[i % joColors.length]} fill="none" strokeWidth={1.5} strokeDasharray="5 5" name={`Plan (${type})`} dot={false} />
            ))}
            {additionalTypes.map((type, i) => (
              <Area key={`act_${type}`} type="monotone" dataKey={`actual_${type}`} stroke={joColors[i % joColors.length]} fill="none" strokeWidth={2} name={`Actual (${type})`} dot={false} connectNulls={false} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded" style={{ background: "hsl(215, 80%, 55%)" }} />
          <span className="text-[10px] text-muted-foreground">Baseline Plan</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded" style={{ background: "hsl(152, 55%, 50%)" }} />
          <span className="text-[10px] text-muted-foreground">Actual</span>
        </div>
        {additionalTypes.map((type, i) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 rounded border-dashed border-t-2" style={{ borderColor: joColors[i % joColors.length] }} />
            <span className="text-[10px] text-muted-foreground">{type} (JO)</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded border-dashed border-t-2" style={{ borderColor: "hsl(0, 72%, 50%)" }} />
          <span className="text-[10px] text-muted-foreground">Today</span>
        </div>
      </div>
    </div>
  );
}
