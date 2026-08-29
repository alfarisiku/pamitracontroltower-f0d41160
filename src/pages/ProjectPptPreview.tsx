import { useMemo, useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  useProject, useWorkAreas, useWorkItems, useMilestones, useAllAlerts, useSCurveData,
  useProcurementItems, useFinanceEntries, useAddendums,
} from "@/hooks/useProjects";
import { useBillings } from "@/components/data-entry/BillingPanel";
import { supabase, formatRupiah, formatIDR, getStatusMeta, DbWeeklyReport } from "@/lib/supabase";
import { Slide, SlideBlock, downloadPptx } from "@/lib/pptSlides";
import { ChevronLeft, ChevronRight, Download, ArrowLeft, Presentation } from "lucide-react";

const d = (s?: string | null) => (s ? new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const pct = (n?: number | null) => `${(Number(n) || 0).toFixed(1)}%`;

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

  const slides = useMemo<Slide[]>(() => {
    if (!project) return [];
    const out: Slide[] = [];
    const meta = getStatusMeta(project.status);

    // 1 — Cover
    out.push({
      key: "cover",
      cover: true,
      title: `${project.project_code} — ${project.name}`,
      subtitle: `${project.client || "—"} • ${project.location || "—"} • ${meta.label}`,
      blocks: [
        { type: "text", value: `Periode: ${d(project.start_date)} — ${d(project.end_date)}   |   Project Manager: ${project.manager || "—"}   |   Progress: ${pct(project.progress)}` },
      ],
    });

    // 2 — Health
    const actualOut = finance.filter((f) => f.direction === "out" && f.entry_kind === "actual").reduce((a, f) => a + Number(f.amount || 0), 0);
    const actualIn = finance.filter((f) => f.direction === "in" && f.entry_kind === "actual").reduce((a, f) => a + Number(f.amount || 0), 0);
    const base = scurve.filter((s) => s.curve_type === "baseline");
    const lastAct = [...base].filter((s) => s.actual_progress != null).sort((a, b) => a.period_order - b.period_order).pop();
    const planAtCut = lastAct ? Number(lastAct.planned_progress || 0) : 0;
    const dev = (Number(project.progress) || 0) - planAtCut;
    out.push({
      key: "health",
      title: "Project Health",
      subtitle: "Ringkasan kinerja jadwal, biaya, dan risiko",
      blocks: [
        {
          type: "kpi",
          items: [
            { label: "Progress Actual", value: pct(project.progress), hint: `Plan ${pct(planAtCut)}`, tone: dev >= 0 ? "success" : "danger" },
            { label: "Deviasi Jadwal", value: `${dev >= 0 ? "+" : ""}${dev.toFixed(1)}%`, tone: dev >= 0 ? "success" : "danger" },
            { label: "RAP", value: formatRupiah(project.rap), hint: `Contract ${formatRupiah(project.contract_value)}` },
            { label: "Actual Cash Out", value: formatRupiah(actualOut), hint: `Cash In ${formatRupiah(actualIn)}`, tone: "primary" },
          ],
        },
        {
          type: "table",
          headers: ["Indikator", "Nilai", "Keterangan"],
          rows: [
            ["Status Proyek", meta.label, project.phase || "—"],
            ["Contract Value", formatRupiah(project.contract_value), "Nilai kontrak berjalan"],
            ["RAP", formatRupiah(project.rap), `Target margin ${pct(project.profit_margin_target)}`],
            ["Actual Cash Out", formatRupiah(actualOut), `Sisa RAP ${formatRupiah(Number(project.rap || 0) - actualOut)}`],
            ["TKDN", pct(project.tkdn_percentage), "Tingkat komponen dalam negeri"],
            ["Risiko Aktif", String(risks.filter((r) => !r.is_resolved).length), "Belum closed"],
          ],
          align: ["left", "right", "left"],
        } as SlideBlock,
      ],
    });

    // 3 — S-Curve
    if (scurve.length) {
      const rows = base
        .slice()
        .sort((a, b) => a.period_order - b.period_order)
        .filter((s) => s.actual_progress != null)
        .slice(-8)
        .map((s) => {
          const dv = Number(s.actual_progress || 0) - Number(s.planned_progress || 0);
          return [s.period_label, pct(s.planned_progress), pct(s.actual_progress), `${dv >= 0 ? "+" : ""}${dv.toFixed(1)}%`];
        });
      if (rows.length) {
        out.push({
          key: "scurve",
          title: "S-Curve — Plan vs Actual",
          subtitle: `Baseline • ${base.length} periode • ditampilkan ${rows.length} periode terakhir`,
          blocks: [{ type: "table", headers: ["Periode", "Plan", "Actual", "Deviasi"], rows, align: ["left", "right", "right", "right"] }],
        });
      }
    }

    // 4 — Milestones
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

    // 5 — WBS
    if (workAreas.length) {
      out.push({
        key: "wbs",
        title: "Work Breakdown Structure",
        subtitle: `${workAreas.length} area kerja • ${workItems.length} work item`,
        blocks: [
          {
            type: "table",
            headers: ["Area Kerja", "Bobot", "Progress", "Jml Item"],
            rows: workAreas.slice(0, 10).map((wa: any) => [
              wa.name,
              pct(wa.weight),
              pct(wa.progress),
              String(workItems.filter((wi) => wi.work_area_id === wa.id).length),
            ]),
            align: ["left", "right", "right", "right"],
          },
        ],
      });
    }

    // 6 — Procurement
    if (procurement.length) {
      const cnt = (s: string[]) => procurement.filter((p) => s.includes(p.status)).length;
      const total = procurement.reduce((a, p) => a + Number(p.amount || 0), 0);
      out.push({
        key: "procurement",
        title: "Procurement",
        subtitle: `${procurement.length} item pengadaan`,
        blocks: [
          {
            type: "kpi",
            items: [
              { label: "Total Item", value: String(procurement.length) },
              { label: "PO Terbit", value: String(cnt(["po", "po-issued", "delivery", "onsite", "installed", "fabrication"])), tone: "primary" },
              { label: "On Site", value: String(cnt(["onsite", "installed"])), tone: "success" },
              { label: "Total Nilai", value: formatIDR(total), tone: "primary" },
            ],
          },
          {
            type: "table",
            headers: ["Item", "Vendor", "Qty", "Nilai", "Status"],
            rows: procurement.slice(0, 8).map((p) => [p.item_name, p.vendor || "—", `${p.qty || 0} ${p.unit || ""}`.trim(), formatIDR(p.amount), (p.status || "—").toUpperCase()]),
            align: ["left", "left", "right", "right", "left"],
          },
        ],
      });
    }

    // 7 — Finance
    if (finance.length) {
      const byCat: Record<string, number> = {};
      finance.filter((f) => f.direction === "out" && f.entry_kind === "actual").forEach((f) => {
        const k = f.category || "lainnya";
        byCat[k] = (byCat[k] || 0) + Number(f.amount || 0);
      });
      const catRows = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => [k, formatRupiah(v), `${((v / (actualOut || 1)) * 100).toFixed(1)}%`]);
      out.push({
        key: "finance",
        title: "Finance — Cashflow",
        subtitle: "Realisasi cash in / cash out proyek",
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
          ...(catRows.length ? [{ type: "table" as const, headers: ["Kategori Biaya", "Actual", "Porsi"], rows: catRows, align: ["left", "right", "right"] as ("left" | "right")[] }] : []),
        ],
      });
    }

    // 8 — Billing
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

    // 9 — Risks
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

    // 10 — Weekly Report
    const wr = weeklyReports[0];
    if (wr) {
      out.push({
        key: "weekly",
        title: "Weekly Progress Report",
        subtitle: `${d(wr.week_start_date)} — ${d(wr.week_end_date)}`,
        blocks: [
          ...(wr.summary ? [{ type: "text" as const, value: wr.summary.slice(0, 240) }] : []),
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

    // 11 — Media
    const mediaItems: string[] = [];
    if (photos.length) mediaItems.push(`${photos.length} foto progress terunggah`);
    const weeks = Array.from(new Set(photos.map((p) => p.week_label).filter(Boolean)));
    if (weeks.length) mediaItems.push(`Periode foto: ${weeks.slice(0, 6).join(", ")}`);
    if (project.video_url) mediaItems.push(`Video progress: ${project.video_url}`);
    if (project.cctv_url) mediaItems.push(`CCTV live: ${project.cctv_url}`);
    if (mediaItems.length) {
      out.push({ key: "media", title: "Media & Dokumentasi", subtitle: "Dokumentasi visual proyek", blocks: [{ type: "list", items: mediaItems }] });
    }

    // 12 — Addendum
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
  }, [project, workAreas, workItems, milestones, risks, scurve, procurement, finance, addendums, billings, weeklyReports, photos]);

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
      await downloadPptx(slides, `${project.project_code}-Laporan-Proyek.pptx`);
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
              <h1 className="text-base font-bold text-foreground flex items-center gap-2"><Presentation className="h-4 w-4 text-primary" /> Preview Laporan PPT</h1>
              <p className="text-[11px] text-muted-foreground">{project.project_code} — {project.name}</p>
            </div>
          </div>
          <button onClick={handleDownload} disabled={busy || !slides.length} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
            <Download className="h-3.5 w-3.5" /> {busy ? "Menyiapkan…" : "Download PPT"}
          </button>
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
      <div className="bg-primary text-primary-foreground px-6 py-3">
        <h2 className="text-lg font-bold leading-tight">{slide.title}</h2>
        {slide.subtitle && <p className="text-[11px] opacity-85">{slide.subtitle}</p>}
      </div>
      <div className="flex-1 overflow-hidden p-5 space-y-3">
        {slide.blocks.map((b, i) => <BlockView key={i} block={b} />)}
      </div>
      <div className="px-6 py-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{project.project_code} — {project.name}</span>
        <span>{index + 1} / {total}</span>
      </div>
    </div>
  );
}

const toneClass = (t?: string) =>
  t === "success" ? "text-success" : t === "warning" ? "text-warning" : t === "danger" ? "text-destructive" : t === "primary" ? "text-primary" : "text-foreground";

function BlockView({ block, onCover }: { block: SlideBlock; onCover?: boolean }) {
  if (block.type === "kpi") {
    return (
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(block.items.length, 4)}, minmax(0,1fr))` }}>
        {block.items.slice(0, 4).map((k, i) => (
          <div key={i} className="glass-card rounded-lg shadow-card p-3">
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold">{k.label}</p>
            <p className={`text-lg font-bold font-mono-data ${toneClass(k.tone)}`}>{k.value}</p>
            {k.hint && <p className="text-[9px] text-muted-foreground mt-0.5">{k.hint}</p>}
          </div>
        ))}
      </div>
    );
  }
  if (block.type === "table") {
    return (
      <div className="glass-card rounded-lg shadow-card overflow-hidden">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="bg-primary text-primary-foreground">
              {block.headers.map((h, i) => <th key={i} className={`px-2.5 py-1.5 font-semibold ${block.align?.[i] === "right" ? "text-right" : "text-left"}`}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((r, ri) => (
              <tr key={ri} className="border-t border-border">
                {r.map((c, ci) => <td key={ci} className={`px-2.5 py-1.5 text-foreground ${block.align?.[ci] === "right" ? "text-right font-mono-data" : "text-left"}`}>{c}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
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
      <div className="glass-card rounded-lg shadow-card p-4">
        {block.title && <p className="text-[9px] uppercase font-semibold text-muted-foreground mb-1.5">{block.title}</p>}
        <ul className="list-disc list-inside space-y-1 text-[11px] text-foreground break-all">
          {block.items.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      </div>
    );
  }
  return <p className={`text-[11px] ${onCover ? "opacity-90" : "text-foreground"}`}>{block.value}</p>;
}
