import { useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
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
} from "recharts";

/* ---------------- Dummy data ---------------- */

const dummyProjects = [
  { code: "PMT-001", name: "Overhaul Tangki 5-T-18, 5-T-24 & 5-T-01 PT KPI RU VII Kasim", location: "Sorong, Papua Barat Daya", actual: 74.52, plan: 71.61, deviation: 3, profit: -4002, status: "Aktif", cashIn: 12000, cashOut: 14500 },
  { code: "PMT-002", name: "Emergency-Perbaikan Tangki 43, 47 & 53 di IT Surabaya", location: "Surabaya, Jawa Timur", actual: 70.63, plan: 87.89, deviation: -17, profit: 1036, status: "Aktif", cashIn: 41000, cashOut: 40500 },
  { code: "PMT-003", name: "Emergency-Perbaikan Tangki No. 63 di IT Surabaya", location: "Surabaya, Jawa Timur", actual: 76.88, plan: 76.65, deviation: 0, profit: 9156, status: "Aktif", cashIn: 22000, cashOut: 12000 },
  { code: "PMT-004", name: "Emergency-Perbaikan Tangki T-51, T-46, T01-FS, T-56, & T67", location: "Surabaya, Jawa Timur", actual: 36.85, plan: 34.17, deviation: 3, profit: -16521, status: "Aktif", cashIn: 14500, cashOut: 3000 },
  { code: "PMT-005", name: "Emergency-Penanggulangan & Perbaikan Manifold Barat di IT Surabaya", location: "Surabaya, Jawa Timur", actual: 6.1, plan: 5.95, deviation: 0, profit: -1707, status: "Aktif", cashIn: 500, cashOut: 900 },
  { code: "PMT-006", name: "Emergency-Perbaikan Tangki TH-02, TL-2 (Ethanol) & Cleaning T-72 di IT Surabaya", location: "Surabaya, Jawa Timur", actual: 90, plan: 60, deviation: 30, profit: -1500, status: "Aktif", cashIn: 1700, cashOut: 1800 },
];

const kpiSummary = {
  activeProjects: 7,
  totalProjects: 9,
  completedProjects: 2,
  pendingProjects: 0,
  totalContractRab: 290118,
  marginRab: 76141,
  actualVsPlanning: { actual: 61.7, plan: 59.6 },
  deviationPct: 2.1,
  cfMasuk: 85796,
  cfKeluar: 98018,
  netCf: -12222,
};

const tagihanTerkini = [
  { project: "Emergency-Perbaikan Tangki No. 63 di IT Surabaya", period: "Tagihan Juli 26 – 72,39%", date: "2026-07-24", status: "Proses", nominal: 3029 },
  { project: "Emergency-Perbaikan Tangki No. 63 di IT Surabaya", period: "Tagihan Juni 26 – 65,69%", date: "2026-06-25", status: "Terbayar", nominal: 3587 },
];

const ringkasanSdm = {
  totalStaffAktif: 75,
  totalManpower: 167,
  safetyManHours: 96200,
  totalIncident: 1,
  proyekDipantau: 9,
  tagihanAktif: 2,
};

/* ---------------- Helpers ---------------- */

/** Format angka dalam satuan juta rupiah: "Rp 290.118 Jt" */
const formatJt = (n: number) =>
  `${n < 0 ? "-" : ""}Rp ${Math.abs(Math.round(n)).toLocaleString("id-ID")} Jt`;

const formatNum = (n: number) => n.toLocaleString("id-ID");

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "keuangan", label: "Keuangan & RAP" },
  { id: "progress", label: "Progress" },
  { id: "tagihan", label: "Tagihan / Termyn" },
  { id: "sdm", label: "Sumber Daya" },
  { id: "safety", label: "Safety" },
];

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

function Card({ title, subtitle, children, className = "" }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
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

const chartTooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  color: "hsl(var(--foreground))",
};

const ExecutiveOverview = () => {
  const [tab, setTab] = useState("overview");

  const totalProfit = dummyProjects.reduce((s, p) => s + p.profit, 0);
  const totalIn = dummyProjects.reduce((s, p) => s + p.cashIn, 0);
  const totalOut = dummyProjects.reduce((s, p) => s + p.cashOut, 0);
  const netCf = totalIn - totalOut;

  const cashData = dummyProjects.map((p) => ({ name: p.code, masuk: p.cashIn, keluar: p.cashOut }));
  const profitData = dummyProjects.map((p) => ({ name: p.code, profit: p.profit }));

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-5 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto">
          <DashboardHeader />

          <div className="mb-5">
            <h2 className="text-lg font-bold text-foreground">Overview Eksekutif</h2>
            <p className="text-xs text-muted-foreground">
              Ringkasan portfolio seluruh proyek · Satuan nilai dalam Juta Rupiah (Jt)
            </p>
          </div>

          {/* 1. KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
            <KpiCard
              label="Proyek Aktif"
              value={`${kpiSummary.activeProjects}/${kpiSummary.totalProjects}`}
              subtitle={`${kpiSummary.completedProjects} selesai · ${kpiSummary.pendingProjects} tertunda`}
              accent="warning"
              valueClass="text-warning"
            />
            <KpiCard
              label="Total Kontrak (RAB)"
              value={formatJt(kpiSummary.totalContractRab)}
              subtitle={
                <span className="inline-flex items-center rounded-full border border-success/30 bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success font-mono-data">
                  Margin {formatJt(kpiSummary.marginRab)}
                </span>
              }
              accent="accent"
              valueClass="text-accent"
            />
            <KpiCard
              label="Aktual vs Planning"
              value={`${kpiSummary.actualVsPlanning.actual}% / ${kpiSummary.actualVsPlanning.plan}%`}
              subtitle={`+${kpiSummary.deviationPct}% deviasi`}
              accent="primary"
              valueClass="text-primary"
            />
            <KpiCard
              label="CF Masuk"
              value={formatJt(kpiSummary.cfMasuk)}
              subtitle="juta diterima"
              accent="success"
              valueClass="text-success"
            />
            <KpiCard
              label="Net CF / Profit Berjalan"
              value={formatJt(kpiSummary.netCf)}
              subtitle={
                <span className="inline-flex items-center rounded-full border border-destructive/30 bg-destructive/15 px-2 py-0.5 text-[10px] font-medium text-destructive font-mono-data">
                  ▼ Defisit
                </span>
              }
              accent="destructive"
              valueClass="text-destructive"
            />
          </div>

          {/* 2. Tabs */}
          <div className="flex flex-wrap gap-2 mb-5">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  tab === t.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab !== "overview" ? (
            <div className="bg-card border border-border rounded-lg shadow-card p-12 text-center">
              <p className="text-sm font-medium text-foreground">Segera hadir</p>
              <p className="text-xs text-muted-foreground mt-1">
                Modul {TABS.find((t) => t.id === tab)?.label} sedang disiapkan.
              </p>
            </div>
          ) : (
            <>
              {/* 3. Grid 3 kolom */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr_1fr] gap-4 mb-4">
                {/* Daftar Proyek */}
                <Card title="Daftar Proyek" subtitle={`${dummyProjects.length} proyek berjalan`}>
                  <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
                    {dummyProjects.map((p) => (
                      <div key={p.code} className="py-3 first:pt-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-foreground line-clamp-2">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {p.code} · {p.location}
                            </p>
                          </div>
                          <span className="shrink-0 inline-flex items-center rounded-full border border-success/30 bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">
                            {p.status}
                          </span>
                        </div>

                        <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(p.actual, 100)}%` }} />
                        </div>

                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono-data text-muted-foreground">
                            {p.actual.toFixed(2)}% / {p.plan.toFixed(2)}%
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
                              {p.deviation}%
                            </span>
                            <span
                              className={`text-[10px] font-mono-data font-semibold ${
                                p.profit < 0 ? "text-destructive" : "text-success"
                              }`}
                            >
                              {formatJt(p.profit)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Cashflow */}
                <Card title="Cashflow" subtitle="Cash In vs Cash Out per proyek">
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Total Masuk</p>
                      <p className="text-sm font-bold font-mono-data text-success">{formatJt(totalIn)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Total Keluar</p>
                      <p className="text-sm font-bold font-mono-data text-destructive">{formatJt(totalOut)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Net Cashflow</p>
                      <p className={`text-sm font-bold font-mono-data ${netCf < 0 ? "text-destructive" : "text-success"}`}>
                        {formatJt(netCf)}
                      </p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={cashData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                        formatter={(v: number, n: string) => [formatJt(v), n === "masuk" ? "Cash In" : "Cash Out"]}
                      />
                      <Legend wrapperStyle={{ fontSize: 10 }} formatter={(v) => (v === "masuk" ? "Cash In" : "Cash Out")} />
                      <Bar dataKey="masuk" fill="hsl(var(--success))" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="keluar" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                {/* Profit Berjalan */}
                <Card title="Profit Berjalan" subtitle="Profit / rugi berjalan per proyek">
                  <div className="mb-3">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Total Profit Portfolio</p>
                    <p className={`text-xl font-bold font-mono-data ${totalProfit < 0 ? "text-destructive" : "text-success"}`}>
                      {formatJt(totalProfit)}
                    </p>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={profitData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                        formatter={(v: number) => [formatJt(v), "Profit"]}
                      />
                      <Bar dataKey="profit" radius={[3, 3, 0, 0]}>
                        {profitData.map((d) => (
                          <Cell key={d.name} fill={d.profit >= 0 ? "hsl(var(--success))" : "hsl(var(--warning))"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              {/* 4. Baris bawah */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card title="Tagihan Terkini" subtitle="Termyn terbaru lintas proyek">
                  <div className="space-y-3">
                    {tagihanTerkini.map((t, i) => {
                      const paid = t.status === "Terbayar";
                      return (
                        <div
                          key={i}
                          className="rounded-md bg-muted/40 p-3"
                          style={{ borderLeft: `3px solid ${paid ? "hsl(var(--success))" : "hsl(var(--primary))"}` }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground line-clamp-1">{t.project}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {t.period} · {new Date(t.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                                paid
                                  ? "bg-success/15 text-success border-success/30"
                                  : "bg-primary/15 text-primary border-primary/30"
                              }`}
                            >
                              {t.status}
                            </span>
                          </div>
                          <p className="mt-2 text-lg font-bold font-mono-data text-foreground">{formatJt(t.nominal)}</p>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                <Card title="Ringkasan SDM" subtitle="Tenaga kerja, safety & tagihan aktif">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: "Total Staff Aktif", value: formatNum(ringkasanSdm.totalStaffAktif), cls: "text-primary" },
                      { label: "Total Manpower", value: formatNum(ringkasanSdm.totalManpower), cls: "text-primary" },
                      { label: "Safety Man Hours", value: formatNum(ringkasanSdm.safetyManHours), cls: "text-success" },
                      { label: "Total Incident", value: formatNum(ringkasanSdm.totalIncident), cls: "text-destructive" },
                      { label: "Proyek Dipantau", value: formatNum(ringkasanSdm.proyekDipantau), cls: "text-foreground" },
                      { label: "Tagihan Aktif", value: formatNum(ringkasanSdm.tagihanAktif), cls: "text-warning" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-md border border-border bg-muted/30 p-3">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                        <p className={`mt-1 text-lg font-bold font-mono-data ${s.cls}`}>{s.value}</p>
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
