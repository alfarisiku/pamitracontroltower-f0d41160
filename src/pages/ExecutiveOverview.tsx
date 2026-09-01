import { useMemo, useState, useEffect, useRef } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import {
  useProjects,
  useAllFinanceEntries,
  useAllSCurveData,
  useAllBillings,
  useAllHrPersonnel,
} from "@/hooks/useProjects";
import { DbProject, formatRupiah, STATUS_META } from "@/lib/supabase";
import { Filter, ChevronDown, Check, X } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  PieChart,
  Pie,
} from "recharts";

/* ---------------- Helpers ---------------- */

const formatNum = (n: number) => Math.round(n).toLocaleString("id-ID");
const pct = (n: number) => `${(Number(n) || 0).toFixed(2)}%`;

const CHART = {
  in: "hsl(var(--success))",
  out: "hsl(var(--destructive))",
  primary: "hsl(var(--primary))",
  warning: "hsl(var(--warning))",
  accent: "hsl(var(--accent))",
  info: "hsl(var(--info))",
  muted: "hsl(var(--muted-foreground))",
};

const PIE_COLORS = [CHART.primary, CHART.info, CHART.accent, CHART.warning, CHART.in, CHART.out];

const chartTooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  color: "hsl(var(--foreground))",
};

const ACCENTS: Record<string, string> = {
  warning: "hsl(var(--warning))",
  primary: "hsl(var(--primary))",
  success: "hsl(var(--success))",
  destructive: "hsl(var(--destructive))",
  accent: "hsl(var(--accent))",
};

function KpiCard({
  label,
  value,
  subtitle,
  accent,
  valueClass,
}: {
  label: string;
  value: string;
  subtitle: React.ReactNode;
  accent: keyof typeof ACCENTS;
  valueClass: string;
}) {
  return (
    <div
      className="bg-card border border-border rounded-lg shadow-card p-4 transition-all hover:shadow-card-hover"
      style={{ borderTop: `3px solid ${ACCENTS[accent]}` }}
    >
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1.5 text-2xl font-bold font-mono-data tracking-tight ${valueClass}`}>{value}</p>
      <div className="mt-1.5 text-xs text-muted-foreground">{subtitle}</div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-card border border-border rounded-lg shadow-card p-4 ${className}`}>
      <div className="mb-3">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/* ---------------- Page ---------------- */

const ExecutiveOverview = () => {
  const { data: projects = [], isLoading } = useProjects();
  const { data: finance = [] } = useAllFinanceEntries();
  const { data: curves = [] } = useAllSCurveData();
  const { data: billings = [] } = useAllBillings();
  const { data: hr = [] } = useAllHrPersonnel();

  const [selected, setSelected] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Default: semua proyek terpilih setelah data pertama datang
  useEffect(() => {
    if (!touched && projects.length) setSelected(projects.map((p) => p.id));
  }, [projects, touched]);

  const toggle = (id: string) => {
    setTouched(true);
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };
  const selectAll = () => {
    setTouched(true);
    setSelected(projects.map((p) => p.id));
  };
  const clearAll = () => {
    setTouched(true);
    setSelected([]);
  };

  const chosen: DbProject[] = useMemo(
    () => projects.filter((p) => selected.includes(p.id)),
    [projects, selected]
  );

  /* --- Perhitungan kumulatif berdasarkan proyek yang diceklis --- */
  const calc = useMemo(() => {
    const ids = new Set(chosen.map((p) => p.id));
    const fin = finance.filter((f) => ids.has(f.project_id));

    const sum = (dir: "in" | "out", kinds: string[]) =>
      fin
        .filter((f) => f.direction === dir && kinds.includes(f.entry_kind))
        .reduce((s, f) => s + (Number(f.amount) || 0), 0);

    const cashInActual = sum("in", ["actual"]);
    const cashOutActual = sum("out", ["actual"]);
    const cashInPlan = sum("in", ["rap", "forecast"]);
    const cashOutPlan = sum("out", ["rap", "po", "forecast"]);

    const totalContract = chosen.reduce((s, p) => s + (Number(p.contract_value) || 0), 0);
    const totalRap = chosen.reduce((s, p) => s + (Number(p.rap) || Number(p.budget) || 0), 0);
    const totalSpent = chosen.reduce((s, p) => s + (Number(p.spent) || 0), 0);
    const margin = totalContract - totalRap;

    // Plan progress per proyek (baseline s-curve pada cut-off = periode terakhir yang punya actual)
    const planOf = (pid: string) => {
      const rows = curves
        .filter((c) => c.project_id === pid && c.curve_type === "baseline")
        .sort((a, b) => a.period_order - b.period_order);
      if (!rows.length) return null;
      const lastActualIdx = rows.map((r) => r.actual_progress != null).lastIndexOf(true);
      const row = lastActualIdx >= 0 ? rows[lastActualIdx] : rows[rows.length - 1];
      return Number(row.planned_progress) || 0;
    };

    const rows = chosen.map((p) => {
      const rap = Number(p.rap) || Number(p.budget) || 0;
      const pin = fin
        .filter((f) => f.project_id === p.id && f.direction === "in" && f.entry_kind === "actual")
        .reduce((s, f) => s + (Number(f.amount) || 0), 0);
      const pout = fin
        .filter((f) => f.project_id === p.id && f.direction === "out" && f.entry_kind === "actual")
        .reduce((s, f) => s + (Number(f.amount) || 0), 0);
      const actual = Number(p.progress) || 0;
      const plan = planOf(p.id);
      const earned = ((Number(p.contract_value) || 0) * actual) / 100;
      return {
        id: p.id,
        code: p.project_code,
        name: p.name,
        location: p.location,
        status: p.status,
        rap,
        actual,
        plan: plan ?? actual,
        deviation: plan == null ? 0 : actual - plan,
        cashIn: pin,
        cashOut: pout,
        net: pin - pout,
        profit: earned - (Number(p.spent) || pout),
      };
    });

    // Bobot progress berdasarkan RAP
    const weight = rows.reduce((s, r) => s + r.rap, 0) || 1;
    const wActual = rows.reduce((s, r) => s + r.actual * r.rap, 0) / weight;
    const wPlan = rows.reduce((s, r) => s + r.plan * r.rap, 0) / weight;

    const bIds = billings.filter((b) => ids.has(b.project_id));
    const billPlan = bIds.reduce((s, b) => s + (Number(b.plan_amount) || 0), 0);
    const billPaid = bIds
      .filter((b) => b.status === "paid")
      .reduce((s, b) => s + (Number(b.paid_amount) || Number(b.plan_amount) || 0), 0);
    const billProgress = bIds
      .filter((b) => b.status === "progress")
      .reduce((s, b) => s + (Number(b.plan_amount) || 0), 0);

    const hrRows = hr.filter((h) => h.project_id == null || ids.has(h.project_id));
    const staff = hrRows
      .filter((h) => h.category === "staff")
      .reduce((s, h) => s + (Number(h.headcount) || 0), 0);
    const manpower = hrRows
      .filter((h) => h.category === "manpower")
      .reduce((s, h) => s + (Number(h.headcount) || 0), 0);

    const statusCount = chosen.reduce<Record<string, number>>((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});

    return {
      rows,
      totalContract,
      totalRap,
      totalSpent,
      margin,
      cashInActual,
      cashOutActual,
      cashInPlan,
      cashOutPlan,
      netCf: cashInActual - cashOutActual,
      wActual,
      wPlan,
      billPlan,
      billPaid,
      billProgress,
      staff,
      manpower,
      statusCount,
      totalProfit: rows.reduce((s, r) => s + r.profit, 0),
      active: chosen.filter((p) => p.status !== "completed" && p.status !== "closed").length,
      completed: chosen.filter((p) => p.status === "completed" || p.status === "closed").length,
    };
  }, [chosen, finance, curves, billings, hr]);

  const cashData = calc.rows.map((r) => ({ name: r.code, masuk: r.cashIn, keluar: r.cashOut }));
  const profitData = calc.rows.map((r) => ({ name: r.code, profit: r.profit }));
  const rapPie = calc.rows
    .filter((r) => r.rap > 0)
    .map((r) => ({ name: r.code, value: r.rap }));

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-5 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <DashboardHeader />

          <div className="mb-5">
            <h2 className="text-lg font-bold text-foreground">Overview Eksekutif</h2>
            <p className="text-xs text-muted-foreground">
              Kalkulasi kumulatif dari {chosen.length} proyek terpilih · Satuan nilai Juta Rupiah (Jt)
            </p>
          </div>

          {/* Filter kumulatif proyek — compact dropdown */}
          <div className="flex items-center gap-2 flex-wrap mb-5" ref={filterRef}>
            <div className="relative">
              <button
                onClick={() => setFilterOpen((o) => !o)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-card text-xs text-foreground hover:bg-muted transition-colors shadow-card"
              >
                <Filter className="h-3.5 w-3.5 text-primary" />
                Proyek
                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono-data text-[10px]">
                  {chosen.length}/{projects.length}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${filterOpen ? "rotate-180" : ""}`} />
              </button>
              {filterOpen && (
                <div className="absolute left-0 top-full mt-1.5 z-50 w-[320px] bg-card border border-border rounded-lg shadow-xl">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                    <span className="text-[11px] font-semibold text-foreground">Pilih proyek kumulatif</span>
                    <div className="flex items-center gap-2">
                      <button onClick={selectAll} className="text-[10px] text-primary hover:underline">Semua</button>
                      <button onClick={clearAll} className="text-[10px] text-muted-foreground hover:underline">Kosongkan</button>
                    </div>
                  </div>
                  <div className="max-h-[280px] overflow-y-auto py-1">
                    {projects.map((p) => {
                      const on = selected.includes(p.id);
                      const st = STATUS_META[p.status];
                      return (
                        <button
                          key={p.id}
                          onClick={() => toggle(p.id)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-muted/40 transition-colors"
                        >
                          <span className={`h-3.5 w-3.5 shrink-0 rounded-[3px] border flex items-center justify-center ${on ? "bg-primary border-primary" : "border-border"}`}>
                            {on && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[11px] font-medium text-foreground truncate">{p.name}</span>
                            <span className="block text-[9px] text-muted-foreground truncate">
                              {p.project_code} · {p.location} · {st?.label ?? p.status}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            {chosen.slice(0, 4).map((p) => (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                title="Klik untuk hapus dari kalkulasi"
                className="flex items-center gap-1 px-2 py-1 rounded-full border border-primary/30 bg-primary/5 text-[10px] font-mono-data text-primary hover:bg-primary/10 transition-colors"
              >
                {p.project_code}
                <X className="h-2.5 w-2.5" />
              </button>
            ))}
            {chosen.length > 4 && (
              <span className="text-[10px] text-muted-foreground">+{chosen.length - 4} lainnya</span>
            )}
          </div>


          {chosen.length === 0 ? (
            <div className="bg-card border border-border rounded-lg shadow-card p-12 text-center">
              <p className="text-sm font-medium text-foreground">Belum ada proyek dipilih</p>
              <p className="text-xs text-muted-foreground mt-1">
                Centang minimal satu proyek untuk melihat kalkulasi eksekutif.
              </p>
            </div>
          ) : (
            <>
              {/* KPI Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
                <KpiCard
                  label="Proyek Aktif"
                  value={`${calc.active}/${chosen.length}`}
                  subtitle={`${calc.completed} selesai · ${chosen.length} dipilih`}
                  accent="warning"
                  valueClass="text-warning"
                />
                <KpiCard
                  label="Total Kontrak"
                  value={formatRupiah(calc.totalContract)}
                  subtitle={
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium font-mono-data ${
                        calc.margin >= 0
                          ? "border-success/30 bg-success/15 text-success"
                          : "border-destructive/30 bg-destructive/15 text-destructive"
                      }`}
                    >
                      Margin RAP {formatRupiah(calc.margin)}
                    </span>
                  }
                  accent="accent"
                  valueClass="text-accent"
                />
                <KpiCard
                  label="Aktual vs Rencana"
                  value={`${calc.wActual.toFixed(1)}% / ${calc.wPlan.toFixed(1)}%`}
                  subtitle={`${calc.wActual - calc.wPlan >= 0 ? "+" : ""}${(calc.wActual - calc.wPlan).toFixed(
                    1
                  )}% deviasi (bobot RAP)`}
                  accent="primary"
                  valueClass="text-primary"
                />
                <KpiCard
                  label="Cash In Aktual"
                  value={formatRupiah(calc.cashInActual)}
                  subtitle={`Rencana ${formatRupiah(calc.cashInPlan)}`}
                  accent="success"
                  valueClass="text-success"
                />
                <KpiCard
                  label="Net Cashflow"
                  value={formatRupiah(calc.netCf)}
                  subtitle={
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium font-mono-data ${
                        calc.netCf < 0
                          ? "border-destructive/30 bg-destructive/15 text-destructive"
                          : "border-success/30 bg-success/15 text-success"
                      }`}
                    >
                      {calc.netCf < 0 ? "▼ Defisit" : "▲ Surplus"}
                    </span>
                  }
                  accent={calc.netCf < 0 ? "destructive" : "success"}
                  valueClass={calc.netCf < 0 ? "text-destructive" : "text-success"}
                />
              </div>

              {/* Grid 3 kolom */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr_1fr] gap-4 mb-4">
                <Card title="Daftar Proyek Terpilih" subtitle={`${calc.rows.length} proyek dihitung kumulatif`}>
                  <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
                    {calc.rows.map((p) => {
                      const st = STATUS_META[p.status];
                      return (
                        <div key={p.id} className="py-3 first:pt-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-foreground line-clamp-2">{p.name}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {p.code} · {p.location}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                                st?.className ?? "bg-muted text-muted-foreground border-border"
                              }`}
                            >
                              {st?.label ?? p.status}
                            </span>
                          </div>

                          <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${Math.min(p.actual, 100)}%` }}
                            />
                          </div>

                          <div className="mt-1.5 flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono-data text-muted-foreground">
                              {pct(p.actual)} / {pct(p.plan)}
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-mono-data font-medium border ${
                                  p.deviation >= 0
                                    ? "bg-success/15 text-success border-success/30"
                                    : "bg-destructive/15 text-destructive border-destructive/30"
                                }`}
                              >
                                {p.deviation >= 0 ? "+" : ""}
                                {p.deviation.toFixed(1)}%
                              </span>
                              <span
                                className={`text-[10px] font-mono-data font-semibold ${
                                  p.net < 0 ? "text-destructive" : "text-success"
                                }`}
                              >
                                {formatRupiah(p.net)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                <Card title="Cashflow" subtitle="Cash In vs Cash Out aktual per proyek">
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Total Masuk</p>
                      <p className="text-sm font-bold font-mono-data text-success">{formatRupiah(calc.cashInActual)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Total Keluar</p>
                      <p className="text-sm font-bold font-mono-data text-destructive">
                        {formatRupiah(calc.cashOutActual)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Net Cashflow</p>
                      <p
                        className={`text-sm font-bold font-mono-data ${
                          calc.netCf < 0 ? "text-destructive" : "text-success"
                        }`}
                      >
                        {formatRupiah(calc.netCf)}
                      </p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={cashData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                        formatter={(v: number, n: string) => [formatRupiah(v), n === "masuk" ? "Cash In" : "Cash Out"]}
                      />
                      <Legend wrapperStyle={{ fontSize: 10 }} formatter={(v) => (v === "masuk" ? "Cash In" : "Cash Out")} />
                      <Bar dataKey="masuk" fill={CHART.in} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="keluar" fill={CHART.out} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                <Card title="Profit Berjalan" subtitle="Earned value − actual cash out per proyek">
                  <div className="mb-3">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Total Profit Portfolio</p>
                    <p
                      className={`text-xl font-bold font-mono-data ${
                        calc.totalProfit < 0 ? "text-destructive" : "text-success"
                      }`}
                    >
                      {formatRupiah(calc.totalProfit)}
                    </p>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={profitData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                        formatter={(v: number) => [formatRupiah(v), "Profit"]}
                      />
                      <Bar dataKey="profit" radius={[3, 3, 0, 0]}>
                        {profitData.map((d) => (
                          <Cell key={d.name} fill={d.profit >= 0 ? CHART.in : CHART.warning} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              {/* Baris bawah */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr] gap-4">
                <Card title="Komposisi RAP" subtitle="Porsi RAP tiap proyek terpilih">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={rapPie}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={85}
                        paddingAngle={2}
                      >
                        {rapPie.map((d, i) => (
                          <Cell key={d.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => formatRupiah(v)} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 flex items-center justify-between text-xs border-t border-border pt-2">
                    <span className="text-muted-foreground">Total RAP</span>
                    <span className="font-mono-data font-semibold text-accent">{formatRupiah(calc.totalRap)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-muted-foreground">Actual Cash Out</span>
                    <span className="font-mono-data font-semibold text-foreground">{formatRupiah(calc.totalSpent)}</span>
                  </div>
                </Card>

                <Card title="Tagihan / Termyn" subtitle="Akumulasi termyn proyek terpilih">
                  <div className="space-y-3">
                    {[
                      { label: "Total Rencana Termyn", value: formatRupiah(calc.billPlan), cls: "text-foreground" },
                      { label: "Sudah Terbayar", value: formatRupiah(calc.billPaid), cls: "text-success" },
                      { label: "Sedang Proses", value: formatRupiah(calc.billProgress), cls: "text-primary" },
                      {
                        label: "Belum Ditagih",
                        value: formatRupiah(Math.max(calc.billPlan - calc.billPaid - calc.billProgress, 0)),
                        cls: "text-warning",
                      },
                    ].map((b) => (
                      <div key={b.label} className="rounded-md border border-border bg-muted/30 p-3">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{b.label}</p>
                        <p className={`mt-1 text-lg font-bold font-mono-data ${b.cls}`}>{b.value}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Ringkasan SDM" subtitle="Tenaga kerja & status portfolio">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Total Staff", value: formatNum(calc.staff), cls: "text-primary" },
                      { label: "Total Manpower", value: formatNum(calc.manpower), cls: "text-primary" },
                      { label: "Total Personil", value: formatNum(calc.staff + calc.manpower), cls: "text-accent" },
                      { label: "Proyek Dipantau", value: formatNum(chosen.length), cls: "text-foreground" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-md border border-border bg-muted/30 p-3">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                        <p className={`mt-1 text-lg font-bold font-mono-data ${s.cls}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 border-t border-border pt-3 space-y-1.5">
                    {Object.entries(calc.statusCount).map(([st, n]) => (
                      <div key={st} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{STATUS_META[st]?.label ?? st}</span>
                        <span className="font-mono-data font-medium text-foreground">{n}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ExecutiveOverview;
