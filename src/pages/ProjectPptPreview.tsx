import { useMemo, useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  useProject, useWorkAreas, useWorkItems, useMilestones, useAllAlerts, useSCurveData,
  useProcurementItems, useFinanceEntries, useAddendums,
} from "@/hooks/useProjects";
import { useBillings } from "@/components/data-entry/BillingPanel";
import { useHrPersonnel } from "@/components/data-entry/HrPanel";
import { supabase, formatRupiah, formatIDR, getStatusMeta, DbWeeklyReport } from "@/lib/supabase";
import { Slide, SlideBlock, SlideTable, downloadPptx, paginateSlides, LAYOUT, imagesGrid } from "@/lib/pptSlides";
import { weekFullOf, weekShortOf } from "@/lib/weekLabel";
import { ChevronLeft, ChevronRight, Download, ArrowLeft, Presentation as PresentationIcon, CalendarRange } from "lucide-react";
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

const d = (s?: string | null) => (s ? new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const pct = (n?: number | null) => `${(Number(n) || 0).toFixed(1)}%`;
const ts = (s?: string | null) => (s ? new Date(s).getTime() : NaN);

const CURVE_COLORS = ["#1667C2", "#ED8113", "#2E9E6B", "#8B5CF6"];

export default function ProjectPptPreview() {
  const { id } = useParams<{ id: string }>();
  const { data: project } = useProject(id);
  const { data: workAreas = [] } = useWorkAreas(id);
  const workAreaIds = workAreas.map((w) => w.id);
  const { data: workItems = [] } = useWorkItems(workAreaIds);
  const { data: milestones = [] } = useMilestones(id);
  const { data: risks = [] } = useAllAlerts(id);
  const { data: scurve = [] } = useSCurveData(id);
  const { data: procurement = [] } = useProcurementItems(id);
  const { data: finance = [] } = useFinanceEntries(id);
  const { data: addendums = [] } = useAddendums(id);
  const { data: billings = [] } = useBillings(id);
  const { data: hrRows = [] } = useHrPersonnel(id);

  const { data: weeklyReports = [] } = useQuery<DbWeeklyReport[]>({
    queryKey: ["ppt_weekly_reports", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await (supabase as any).from("weekly_progress_reports").select("*").eq("project_id", id).order("week_start_date", { ascending: false });
      return (data ?? []) as DbWeeklyReport[];
    },
  });
  const { data: photos = [] } = useQuery<any[]>({
    queryKey: ["ppt_photos", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("project_photos").select("*").eq("project_id", id).order("uploaded_at", { ascending: false });
      return data ?? [];
    },
  });

  /* ---------- Periode pelaporan (dikunci ke baseline S-Curve mingguan) ---------- */
  const periods = useMemo(() => {
    return scurve
      .filter((s) => s.curve_type === "baseline")
      .slice()
      .sort((a, b) => a.period_order - b.period_order)
      .map((s: any) => ({
        order: s.period_order,
        label: s.period_label,
        start: s.period_start || s.period_date || null,
        end: s.period_end || s.period_date || null,
        hasActual: s.actual_progress != null,
      }));
  }, [scurve]);

  const [periodKey, setPeriodKey] = useState<string>("");
  useEffect(() => {
    if (periodKey || !periods.length) return;
    const lastActual = [...periods].filter((p) => p.hasActual).pop() ?? periods[periods.length - 1];
    setPeriodKey(String(lastActual.order));
  }, [periods, periodKey]);

  const selected = periods.find((p) => String(p.order) === periodKey) ?? periods[periods.length - 1];
  const cutoffTs = selected?.end ? ts(selected.end) : Infinity;
  const startTs = selected?.start ? ts(selected.start) : -Infinity;

  const slides = useMemo<Slide[]>(() => {
    if (!project) return [];
    const out: Slide[] = [];
    const meta = getStatusMeta(project.status);
    const periodTag = selected ? weekFullOf(selected) : "Seluruh periode";
    const periodShort = selected ? weekShortOf(selected) : "—";

    const inCutoff = (dt?: string | null) => {
      const t = ts(dt);
      return Number.isNaN(t) ? true : t <= cutoffTs;
    };

    /* ============ 1 — Cover ============ */
    out.push({
      key: "cover",
      cover: true,
      title: `${project.project_code} — ${project.name}`,
      subtitle: `${project.client || "—"} • ${project.location || "—"} • ${meta.label}`,
      blocks: [{ type: "text", value: `Periode Pelaporan: ${periodTag}   |   Project Manager: ${project.manager || "—"}   |   Progress: ${pct(project.progress)}` }],
    });

    /* ============ 2 — Project Health ============ */
    const finCut = finance.filter((f) => inCutoff(f.period_date));
    const actualOut = finCut.filter((f) => f.direction === "out" && f.entry_kind === "actual").reduce((a, f) => a + Number(f.amount || 0), 0);
    const actualIn = finCut.filter((f) => f.direction === "in" && f.entry_kind === "actual").reduce((a, f) => a + Number(f.amount || 0), 0);

    const baseRows = scurve.filter((s) => s.curve_type === "baseline");
    const cutRow = [...baseRows].filter((s: any) => inCutoff(s.period_end || s.period_date)).sort((a, b) => a.period_order - b.period_order).pop();
    const planAtCut = cutRow ? Number(cutRow.planned_progress || 0) : 0;
    const actAtCut = cutRow?.actual_progress != null ? Number(cutRow.actual_progress) : Number(project.progress) || 0;
    const dev = actAtCut - planAtCut;

    const staff = hrRows.filter((h: any) => h.category === "staff").reduce((a: number, h: any) => a + (Number(h.headcount) || 0), 0);
    const manpower = hrRows.filter((h: any) => h.category === "manpower").reduce((a: number, h: any) => a + (Number(h.headcount) || 0), 0);
    const endT = ts(project.end_date);
    const sisaHari = Number.isNaN(endT) ? null : Math.ceil((endT - (Number.isFinite(cutoffTs) ? cutoffTs : Date.now())) / 86400000);

    out.push({
      key: "health",
      title: "Project Health",
      subtitle: `Ringkasan kinerja jadwal & biaya — cut-off ${periodTag}`,
      blocks: [
        ...(project.description ? [{ type: "text" as const, value: project.description.slice(0, 420) }] : []),
        {
          type: "info",
          items: [
            { label: "Lokasi", value: project.location || "—" },
            { label: "Project Manager", value: project.manager || "—" },
            { label: "Klien", value: project.client || "—" },
            { label: "Status / Fase", value: `${meta.label} • ${project.phase || "—"}` },
            { label: "Mulai", value: d(project.start_date) },
            { label: "Target Selesai", value: d(project.end_date) },
            { label: "Staff / Manpower", value: `${staff} / ${manpower} org` },
            { label: "Sisa Waktu", value: sisaHari == null ? "—" : `${sisaHari} hari` },
          ],
        },
        {
          type: "kpi",
          items: [
            { label: "Contract Value", value: formatRupiah(project.contract_value), tone: "primary" },
            { label: "Progress Actual", value: pct(actAtCut), hint: `Plan ${pct(planAtCut)}`, tone: dev >= 0 ? "success" : "danger" },
            { label: "Deviasi Jadwal", value: `${dev >= 0 ? "+" : ""}${dev.toFixed(1)}%`, tone: dev >= 0 ? "success" : "danger" },
            { label: "Actual Cash Out", value: formatRupiah(actualOut), hint: `Cash In ${formatRupiah(actualIn)}`, tone: "warning" },
          ],
        },
        {
          type: "table",
          headers: ["Indikator", "Nilai", "Keterangan"],
          rows: [
            ["Contract Value", formatRupiah(project.contract_value), "Nilai kontrak berjalan"],
            ["RAP", formatRupiah(project.rap), `Sisa RAP ${formatRupiah(Number(project.rap || 0) - actualOut)}`],
            ["Actual Cash Out", formatRupiah(actualOut), "Realisasi pengeluaran s/d cut-off"],
            ["TKDN", pct(project.tkdn_percentage), "Tingkat komponen dalam negeri"],
            ["Risiko Aktif", String(risks.filter((r) => !r.is_resolved).length), "Belum closed"],
          ],
          align: ["left", "right", "left"],
        } as SlideBlock,
      ],
    });

    /* ============ 3 — S-Curve ============ */
    const curveTypes = Array.from(new Set(scurve.map((s) => s.curve_type)));
    if (!curveTypes.includes("baseline") && curveTypes.length) curveTypes.unshift("baseline");
    if (scurve.length) {
      const catRows = baseRows
        .slice()
        .sort((a, b) => a.period_order - b.period_order)
        .filter((s: any) => inCutoff(s.period_end || s.period_date));
      const catLabels = catRows.map((s) => s.period_label);
      const catDisplay = catRows.map((s: any) => weekShortOf(s));


      const series = curveTypes.flatMap((ct, i) => {
        const color = CURVE_COLORS[i % CURVE_COLORS.length];
        const rows = scurve.filter((s) => s.curve_type === ct);
        const pick = (label: string, key: "planned_progress" | "actual_progress") => {
          const r = rows.find((x) => x.period_label === label);
          const v = r?.[key];
          return v == null ? null : Number(v);
        };
        const name = ct === "baseline" ? "Baseline" : ct;
        return [
          { name: `${name} Plan`, color, dashed: true, values: catLabels.map((l) => pick(l, "planned_progress")) },
          { name: `${name} Actual`, color, values: catLabels.map((l) => pick(l, "actual_progress")) },
        ];
      });

      const tables: SlideTable[] = curveTypes.map((ct) => {
        const rows = scurve.filter((s) => s.curve_type === ct);
        const byLabel: Record<string, { label: string; order: number; plan: number | null; actual: number | null; t: number }> = {};
        rows.forEach((s: any) => {
          const t = ts(s.period_end || s.period_date);
          if (!byLabel[s.period_label]) byLabel[s.period_label] = { label: s.period_label, order: s.period_order, plan: null, actual: null, t };
          if (s.planned_progress != null) byLabel[s.period_label].plan = Number(s.planned_progress);
          if (s.actual_progress != null) byLabel[s.period_label].actual = Number(s.actual_progress);
        });
        const list = Object.values(byLabel)
          .filter((r) => (Number.isNaN(r.t) ? true : r.t <= cutoffTs))
          .sort((a, b) => (a.t || a.order) - (b.t || b.order))
          .slice(-3);
        return {
          title: ct === "baseline" ? "Baseline" : ct,
          headers: ["Periode", "Plan", "Actual", "Dev"],
          rows: list.map((r) => {
            const dv = (r.actual ?? 0) - (r.plan ?? 0);
            return [weekShortOf({ label: r.label, order: r.order }), r.plan != null ? pct(r.plan) : "—", r.actual != null ? pct(r.actual) : "—", r.actual == null || r.plan == null ? "—" : `${dv > 0 ? "+" : ""}${dv.toFixed(1)}%`];
          }),
          align: ["left", "right", "right", "right"] as ("left" | "right")[],
        };
      }).filter((t) => t.rows.length > 0);

      if (catLabels.length) {
        out.push({
          key: "scurve",
          title: "S-Curve — Plan vs Actual",
          subtitle: `${curveTypes.length} kurva • cut-off ${selected?.label ?? "—"} • tabel 3 periode terakhir`,
          blocks: [
            { type: "chart", kind: "line", categories: catLabels, series, height: 2.5 },
            ...(tables.length ? [{ type: "tables" as const, tables }] : []),
          ],
        });
      }
    }

    /* ============ 4 — Milestones ============ */
    if (milestones.length) {
      out.push({
        key: "milestones",
        title: "Milestones",
        subtitle: `${milestones.filter((m) => m.status === "completed").length} dari ${milestones.length} milestone selesai`,
        blocks: [
          {
            type: "table",
            headers: ["Milestone", "Fase", "Target", "Actual", "Status"],
            rows: milestones.slice(0, 10).map((m) => [m.name, m.phase || "—", d(m.target_date), d(m.actual_date), m.status]),
          },
        ],
      });
    }

    /* ============ 5 — WBS (mirip Project Detail) ============ */
    if (workAreas.length) {
      const rows: string[][] = [];
      workAreas.forEach((wa: any) => {
        const items = workItems.filter((wi) => wi.work_area_id === wa.id);
        rows.push([`▍ ${wa.code ? wa.code + " " : ""}${wa.name}`, `${items.length} item`, pct(wa.weight), pct(wa.progress), "—", "—"]);
        items.slice(0, 4).forEach((wi: any) => {
          rows.push([
            `    ${wi.name}`,
            `${Number(wi.qty_completed || 0)}/${Number(wi.qty_total || 0)} ${wi.unit || ""}`.trim(),
            pct(wi.weight),
            pct(wi.progress),
            d(wi.start_date),
            d(wi.end_date),
          ]);
        });
      });
      out.push({
        key: "wbs",
        title: "Work Breakdown Structure",
        subtitle: `${workAreas.length} area kerja • ${workItems.length} work item`,
        blocks: [
          {
            type: "table",
            headers: ["Area / Work Item", "Qty", "Bobot", "Progress", "Mulai", "Selesai"],
            rows: rows.slice(0, 16),
            align: ["left", "left", "right", "right", "left", "left"],
          },
        ],
      });
    }

    /* ============ 6 — Procurement (detail + tanggal) ============ */
    if (procurement.length) {
      const cnt = (s: string[]) => procurement.filter((p) => s.includes(p.status)).length;
      const total = procurement.reduce((a, p) => a + Number(p.amount || 0), 0);
      out.push({
        key: "procurement",
        title: "Procurement",
        subtitle: `${procurement.length} item pengadaan — lengkap dengan tanggal proses`,
        blocks: [
          {
            type: "kpi",
            items: [
              { label: "Total Item", value: String(procurement.length) },
              { label: "PO Terbit", value: String(cnt(["po", "po-issued", "delivery", "onsite", "installed", "fabrication"])), tone: "primary" },
              { label: "On Site / Installed", value: String(cnt(["onsite", "installed"])), tone: "success" },
              { label: "Total Nilai", value: formatIDR(total), tone: "primary" },
            ],
          },
          {
            type: "table",
            headers: ["Item", "Vendor", "Qty", "Nilai", "RFQ", "PO", "Delivery", "Onsite", "Status"],
            rows: procurement.slice(0, 9).map((p) => [
              (p.item_name || "—").slice(0, 28),
              (p.vendor || "—").slice(0, 16),
              `${p.qty || 0} ${p.unit || ""}`.trim(),
              formatIDR(p.amount),
              d(p.rfq_date),
              d(p.po_date),
              d(p.delivery_date),
              d(p.install_date),
              (p.status || "—").toUpperCase(),
            ]),
            align: ["left", "left", "right", "right", "left", "left", "left", "left", "left"],
          },
        ],
      });
    }

    /* ============ 7 — Finance (grafik + tabel detail) ============ */
    if (finCut.length) {
      const bucket: Record<string, { key: string; label: string; planIn: number; planOut: number; actIn: number; actOut: number }> = {};
      finCut.forEach((f) => {
        const dt = new Date(f.period_date);
        if (Number.isNaN(dt.getTime())) return;
        const k = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
        if (!bucket[k]) bucket[k] = { key: k, label: dt.toLocaleDateString("id-ID", { month: "short", year: "2-digit" }), planIn: 0, planOut: 0, actIn: 0, actOut: 0 };
        const amt = Number(f.amount) || 0;
        const isPlan = f.entry_kind === "rap" || f.entry_kind === "forecast";
        if (f.entry_kind === "actual") {
          if (f.direction === "in") bucket[k].actIn += amt; else bucket[k].actOut += amt;
        } else if (isPlan) {
          if (f.direction === "in") bucket[k].planIn += amt; else bucket[k].planOut += amt;
        }
      });
      const list = Object.values(bucket).sort((a, b) => a.key.localeCompare(b.key));
      const shown = list.slice(-8);
      out.push({
        key: "finance",
        title: "Finance — Cashflow Plan vs Actual",
        subtitle: `Realisasi kas s/d ${selected?.label ?? "cut-off"} (nilai dalam Juta Rupiah)`,
        blocks: [
          {
            type: "kpi",
            items: [
              { label: "Actual Cash In", value: formatRupiah(actualIn), tone: "success" },
              { label: "Actual Cash Out", value: formatRupiah(actualOut), tone: "warning" },
              { label: "Net Kumulatif", value: formatRupiah(actualIn - actualOut), tone: actualIn - actualOut >= 0 ? "success" : "danger" },
              { label: "Sisa RAP", value: formatRupiah(Number(project.rap || 0) - actualOut), tone: "primary" },
            ],
          },
          {
            type: "chart",
            kind: "bar",
            categories: shown.map((r) => r.label),
            series: [
              { name: "Plan Cash In", color: "#9CC3EA", values: shown.map((r) => Math.round(r.planIn)) },
              { name: "Actual Cash In", color: "#2E9E6B", values: shown.map((r) => Math.round(r.actIn)) },
              { name: "Plan Cash Out", color: "#F6C77A", values: shown.map((r) => Math.round(r.planOut)) },
              { name: "Actual Cash Out", color: "#DC2626", values: shown.map((r) => Math.round(r.actOut)) },
            ],
            height: 2.1,
          },
          {
            type: "table",
            headers: ["Periode", "Plan In", "Act In", "Plan Out", "Act Out", "Net Actual"],
            rows: shown.map((r) => [r.label, formatRupiah(r.planIn), formatRupiah(r.actIn), formatRupiah(r.planOut), formatRupiah(r.actOut), formatRupiah(r.actIn - r.actOut)]),
            align: ["left", "right", "right", "right", "right", "right"],
          },
        ],
      });
    }

    /* ============ 8 — Billing ============ */
    if (billings.length) {
      const planTot = billings.reduce((a: number, b: any) => a + Number(b.plan_amount || 0), 0);
      const paidTot = billings.reduce((a: number, b: any) => a + Number(b.paid_amount || 0), 0);
      out.push({
        key: "billing",
        title: "Billing / Termin",
        subtitle: `${billings.length} termin penagihan`,
        blocks: [
          {
            type: "kpi",
            items: [
              { label: "Total Plan", value: formatRupiah(planTot) },
              { label: "Total Terbayar", value: formatRupiah(paidTot), tone: "success" },
              { label: "Outstanding", value: formatRupiah(planTot - paidTot), tone: "warning" },
              { label: "Realisasi", value: `${planTot ? ((paidTot / planTot) * 100).toFixed(1) : "0.0"}%`, tone: "primary" },
            ],
          },
          {
            type: "table",
            headers: ["Termin", "Plan", "Paid", "Status"],
            rows: billings.slice(0, 8).map((b: any) => [b.termin_code, formatRupiah(b.plan_amount), formatRupiah(b.paid_amount), b.status || "—"]),
            align: ["left", "right", "right", "left"],
          },
        ],
      });
    }

    /* ============ 9 — Risks ============ */
    const openRisks = risks.filter((r) => !r.is_resolved);
    if (openRisks.length) {
      out.push({
        key: "risks",
        title: "Risk Monitoring",
        subtitle: `${openRisks.length} risiko aktif`,
        blocks: [
          {
            type: "table",
            headers: ["Risiko", "Kategori", "Severity", "PIC", "Mitigasi"],
            rows: openRisks.slice(0, 8).map((r) => [r.title, r.category || "—", (r.severity || "—").toUpperCase(), r.pic || "—", (r.mitigation_plan || "—").slice(0, 60)]),
          },
        ],
      });
    }

    /* ============ 10 — Weekly Report (periode terpilih) ============ */
    const wr =
      weeklyReports.find((w) => {
        const ws = ts(w.week_start_date), we = ts(w.week_end_date);
        return we >= startTs && ws <= cutoffTs;
      }) ?? weeklyReports.find((w) => ts(w.week_start_date) <= cutoffTs);
    if (wr) {
      out.push({
        key: "weekly",
        title: "Weekly Progress Report",
        subtitle: `${d(wr.week_start_date)} — ${d(wr.week_end_date)}${selected ? ` • ${selected.label}` : ""}`,
        blocks: [
          ...(wr.summary ? [{ type: "text" as const, value: wr.summary.slice(0, 260) }] : []),
          {
            type: "columns",
            columns: [
              { title: "Achievements", items: (wr.achievements || []).slice(0, 5).map((a) => `[${a.category}] ${a.description}`) },
              { title: "Outstanding", items: (wr.outstanding_items || []).slice(0, 5).map((o) => o.item) },
              { title: "Next Week", items: (wr.next_week_targets || []).slice(0, 5).map((t) => t.target) },
            ],
          },
        ],
      });
    }

    /* ============ 11 — Media (foto periode terpilih) ============ */
    const weekPhotos = photos.filter((p) => {
      if (selected && p.week_label && p.week_label === selected.label) return true;
      const t = ts(p.uploaded_at);
      return !Number.isNaN(t) && t >= startTs && t <= cutoffTs;
    });
    const mediaBlocks: SlideBlock[] = [];
    if (weekPhotos.length) mediaBlocks.push({ type: "images", items: weekPhotos.slice(0, 6).map((p) => ({ url: p.photo_url, caption: p.caption || p.week_label || "" })) });
    const links: string[] = [];
    if (project.video_url) links.push(`Video progress: ${project.video_url}`);
    if (project.cctv_url) links.push(`CCTV live: ${project.cctv_url}`);
    if (links.length) mediaBlocks.push({ type: "list", items: links });
    if (mediaBlocks.length) {
      out.push({
        key: "media",
        title: "Media & Dokumentasi",
        subtitle: `${weekPhotos.length} foto pada periode ${selected?.label ?? "—"}`,
        blocks: mediaBlocks,
      });
    }

    /* ============ 12 — Addendum ============ */
    if (addendums.length) {
      const costTot = addendums.reduce((a, x) => a + Number(x.cost_impact || 0), 0);
      const dayTot = addendums.reduce((a, x) => a + Number(x.schedule_impact_days || 0), 0);
      out.push({
        key: "addendum",
        title: "Addendum Kontrak",
        subtitle: `${addendums.length} addendum tercatat`,
        blocks: [
          {
            type: "kpi",
            items: [
              { label: "Jumlah Addendum", value: String(addendums.length) },
              { label: "Total Cost Impact", value: formatIDR(costTot), tone: costTot >= 0 ? "primary" : "danger" },
              { label: "Total Schedule Impact", value: `${dayTot} hari`, tone: dayTot > 0 ? "warning" : "default" },
            ],
          },
          {
            type: "table",
            headers: ["Kode", "Tanggal", "Deskripsi", "Cost Impact", "Hari", "Status"],
            rows: addendums.slice(0, 8).map((a) => [a.addendum_code, d(a.addendum_date), (a.description || "—").slice(0, 50), formatIDR(a.cost_impact), String(a.schedule_impact_days || 0), a.approval_status || "—"]),
            align: ["left", "left", "left", "right", "right", "left"],
          },
        ],
      });
    }

    return out;
  }, [project, workAreas, workItems, milestones, risks, scurve, procurement, finance, addendums, billings, weeklyReports, photos, hrRows, selected, cutoffTs, startTs]);

  const [idx, setIdx] = useState(0);
  useEffect(() => { if (idx > slides.length - 1) setIdx(0); }, [slides.length, idx]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIdx((i) => Math.min(i + 1, slides.length - 1));
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [slides.length]);

  const [busy, setBusy] = useState(false);
  const handleDownload = async () => {
    if (!project) return;
    setBusy(true);
    try {
      await downloadPptx(slides, `${project.project_code}-Laporan-${selected?.label || "Proyek"}.pptx`);
    } finally {
      setBusy(false);
    }
  };

  if (!project) return <div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">Memuat data proyek…</div>;

  const slide = slides[idx];

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link to={`/project/${id}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-foreground rounded-lg text-xs font-medium hover:bg-muted/80 border border-border transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Kembali
            </Link>
            <div>
              <h1 className="text-base font-bold text-foreground flex items-center gap-2"><PresentationIcon className="h-4 w-4 text-primary" /> Preview Laporan PPT</h1>
              <p className="text-[11px] text-muted-foreground">{project.project_code} — {project.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-border bg-card">
              <CalendarRange className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Periode</span>
              <select
                value={periodKey}
                onChange={(e) => setPeriodKey(e.target.value)}
                className="text-xs bg-transparent text-foreground font-medium outline-none max-w-[220px]"
              >
                {periods.length === 0 && <option value="">Tidak ada periode</option>}
                {periods.map((p) => (
                  <option key={p.order} value={String(p.order)}>
                    {p.label}{p.hasActual ? " • actual" : ""} — {d(p.end)}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={handleDownload} disabled={busy || !slides.length} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
              <Download className="h-3.5 w-3.5" /> {busy ? "Menyiapkan…" : "Download PPT"}
            </button>
          </div>
        </div>

        {!slides.length ? (
          <div className="glass-card rounded-lg shadow-card p-8 text-center text-xs text-muted-foreground">Belum ada data untuk dijadikan laporan.</div>
        ) : (
          <>
            <div className="glass-card rounded-lg shadow-card overflow-hidden">
              <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
                <SlideView slide={slide} index={idx} total={slides.length} project={project} />
              </div>
            </div>

            <div className="flex items-center justify-between mt-3 gap-3">
              <button onClick={() => setIdx((i) => Math.max(i - 1, 0))} disabled={idx === 0} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors">
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {slides.map((s, i) => (
                  <button key={s.key} onClick={() => setIdx(i)} title={s.title}
                    className={`px-2 py-1 rounded text-[10px] font-medium border transition-colors whitespace-nowrap ${i === idx ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"}`}>
                    {i + 1}. {s.title}
                  </button>
                ))}
              </div>
              <button onClick={() => setIdx((i) => Math.min(i + 1, slides.length - 1))} disabled={idx === slides.length - 1} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors">
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SlideView({ slide, index, total, project }: { slide: Slide; index: number; total: number; project: any }) {
  if (slide.cover) {
    return (
      <div className="absolute inset-0 bg-primary text-primary-foreground flex flex-col justify-center px-10">
        <p className="text-[11px] uppercase tracking-[0.2em] opacity-80 mb-3">Dashboard Control Tower — Laporan Proyek</p>
        <h2 className="text-3xl font-bold leading-tight">{slide.title}</h2>
        {slide.subtitle && <p className="text-sm mt-2 opacity-85">{slide.subtitle}</p>}
        <div className="mt-6 space-y-2">{slide.blocks.map((b, i) => <BlockView key={i} block={b} onCover />)}</div>
        <span className="absolute bottom-4 right-6 text-[10px] opacity-70">{index + 1} / {total}</span>
      </div>
    );
  }
  return (
    <div className="absolute inset-0 bg-background flex flex-col">
      <div className="bg-primary text-primary-foreground px-6 py-2.5">
        <h2 className="text-lg font-bold leading-tight">{slide.title}</h2>
        {slide.subtitle && <p className="text-[11px] opacity-85">{slide.subtitle}</p>}
      </div>
      <div className="flex-1 overflow-hidden p-4 space-y-2.5">
        {slide.blocks.map((b, i) => <BlockView key={i} block={b} />)}
      </div>
      <div className="px-6 py-1.5 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{project.project_code} — {project.name}</span>
        <span>{index + 1} / {total}</span>
      </div>
    </div>
  );
}

const toneClass = (t?: string) =>
  t === "success" ? "text-success" : t === "warning" ? "text-warning" : t === "danger" ? "text-destructive" : t === "primary" ? "text-primary" : "text-foreground";

function TableView({ t, dense }: { t: SlideTable; dense?: boolean }) {
  const fs = dense ? "text-[8px]" : "text-[10px]";
  return (
    <div className="glass-card rounded-lg shadow-card overflow-hidden">
      {t.title && <div className="px-2 py-1 bg-muted/40 border-b border-border text-[9px] font-bold uppercase text-primary">{t.title}</div>}
      <table className={`w-full ${fs}`}>
        <thead>
          <tr className="bg-primary text-primary-foreground">
            {t.headers.map((h, i) => <th key={i} className={`px-2 py-1 font-semibold ${t.align?.[i] === "right" ? "text-right" : "text-left"}`}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {t.rows.map((r, ri) => (
            <tr key={ri} className="border-t border-border">
              {r.map((c, ci) => <td key={ci} className={`px-2 py-1 text-foreground ${t.align?.[ci] === "right" ? "text-right font-mono-data" : "text-left"}`}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BlockView({ block, onCover }: { block: SlideBlock; onCover?: boolean }) {
  if (block.type === "kpi") {
    return (
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(block.items.length, 4)}, minmax(0,1fr))` }}>
        {block.items.slice(0, 4).map((k, i) => (
          <div key={i} className="glass-card rounded-lg shadow-card p-2.5">
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold">{k.label}</p>
            <p className={`text-base font-bold font-mono-data ${toneClass(k.tone)}`}>{k.value}</p>
            {k.hint && <p className="text-[9px] text-muted-foreground mt-0.5">{k.hint}</p>}
          </div>
        ))}
      </div>
    );
  }
  if (block.type === "info") {
    return (
      <div className="grid grid-cols-4 gap-2">
        {block.items.map((it, i) => (
          <div key={i} className="glass-card rounded-lg shadow-card px-2.5 py-1.5">
            <p className="text-[8px] uppercase tracking-wide text-muted-foreground font-semibold">{it.label}</p>
            <p className="text-[11px] font-bold text-foreground truncate" title={it.value}>{it.value}</p>
          </div>
        ))}
      </div>
    );
  }
  if (block.type === "table") return <TableView t={block} />;
  if (block.type === "tables") {
    return (
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${block.tables.length}, minmax(0,1fr))` }}>
        {block.tables.map((t, i) => <TableView key={i} t={t} dense={block.tables.length > 2} />)}
      </div>
    );
  }
  if (block.type === "chart") {
    const data = block.categories.map((c, i) => {
      const row: any = { name: c };
      block.series.forEach((s) => { row[s.name] = s.values[i]; });
      return row;
    });
    return (
      <div className="glass-card rounded-lg shadow-card p-2" style={{ height: `${(block.height ?? 2.5) * 62}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 8 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 8 }} />
            <Tooltip contentStyle={{ fontSize: 10 }} />
            <Legend wrapperStyle={{ fontSize: 9 }} />
            {block.series.map((s) =>
              block.kind === "bar" ? (
                <Bar key={s.name} dataKey={s.name} fill={s.color} radius={[2, 2, 0, 0]} />
              ) : (
                <Line key={s.name} type="monotone" dataKey={s.name} stroke={s.color} strokeWidth={1.6} strokeDasharray={s.dashed ? "4 3" : undefined} dot={false} connectNulls />
              ),
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }
  if (block.type === "images") {
    return (
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(3, Math.max(1, block.items.length))}, minmax(0,1fr))` }}>
        {block.items.slice(0, 6).map((im, i) => (
          <div key={i} className="rounded-lg overflow-hidden border border-border bg-muted">
            <img src={im.url} alt={im.caption || "Foto progress"} className="w-full h-24 object-cover" loading="lazy" />
            {im.caption && <p className="px-1.5 py-1 text-[9px] text-muted-foreground truncate">{im.caption}</p>}
          </div>
        ))}
      </div>
    );
  }
  if (block.type === "columns") {
    return (
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${block.columns.length}, minmax(0,1fr))` }}>
        {block.columns.map((c, i) => (
          <div key={i} className="glass-card rounded-lg shadow-card p-3">
            <p className="text-[9px] uppercase font-semibold text-primary mb-1.5">{c.title}</p>
            <ul className="list-disc list-inside space-y-1 text-[10px] text-foreground">
              {(c.items.length ? c.items : ["—"]).map((t, j) => <li key={j}>{t}</li>)}
            </ul>
          </div>
        ))}
      </div>
    );
  }
  if (block.type === "list") {
    return (
      <div className="glass-card rounded-lg shadow-card p-3">
        {block.title && <p className="text-[9px] uppercase font-semibold text-muted-foreground mb-1.5">{block.title}</p>}
        <ul className="list-disc list-inside space-y-1 text-[10px] text-foreground break-all">
          {block.items.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      </div>
    );
  }
  return <p className={`text-[11px] ${onCover ? "opacity-90" : "text-foreground"}`}>{block.value}</p>;
}
