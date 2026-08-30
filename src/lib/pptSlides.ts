/**
 * Model slide laporan proyek — dipakai BERSAMA oleh halaman preview (React)
 * dan generator .pptx, sehingga isi file identik dengan yang tampil di preview.
 *
 * Semua ukuran dalam INCH pada kanvas 16:9 (10 x 5.625 in).
 */

export type SlideKpi = { label: string; value: string; hint?: string; tone?: "default" | "success" | "warning" | "danger" | "primary" };
export type SlideTable = { title?: string; headers: string[]; rows: string[][]; align?: ("left" | "right")[] };
export type SlideSeries = {
  name: string;
  values: (number | null)[];
  color: string;
  dashed?: boolean;
  /** Override tipe render per-series (untuk kombinasi bar + kurva). */
  type?: "bar" | "line";
  /** Gambar pada sumbu Y kanan. */
  secondary?: boolean;
};
export type SlideBlock =
  | { type: "kpi"; items: SlideKpi[] }
  | { type: "table"; headers: string[]; rows: string[][]; align?: ("left" | "right")[]; title?: string }
  | { type: "tables"; tables: SlideTable[] }
  | { type: "list"; title?: string; items: string[] }
  | { type: "text"; value: string }
  | { type: "info"; items: { label: string; value: string }[] }
  | { type: "chart"; kind: "line" | "bar"; title?: string; categories: string[]; series: SlideSeries[]; height?: number }
  | { type: "images"; items: { url: string; caption?: string }[]; fill?: boolean }
  | { type: "columns"; columns: { title: string; items: string[] }[] };

export type Slide = {
  key: string;
  title: string;
  subtitle?: string;
  cover?: boolean;
  blocks: SlideBlock[];
};

/** Palet warna deck — diselaraskan dengan token tema dashboard (light theme). */
export const DECK = {
  bg: "F7F9FB",
  card: "FFFFFF",
  border: "DCE2EA",
  fg: "1F2937",
  muted: "6B7686",
  primary: "1667C2",
  accent: "ED8113",
  success: "2E9E6B",
  warning: "F0A413",
  danger: "DC2626",
};

/** Konstanta layout — dipakai preview & generator agar identik. */
export const LAYOUT = {
  W: 10,
  H: 5.625,
  M: 0.45,          // margin kiri/kanan
  HEADER_H: 0.85,
  BODY_TOP: 1.02,
  BODY_BOTTOM: 5.2, // batas bawah konten (di atas footer)
  GAP: 0.14,
  ROW_H: 0.26,
  FONT: "Arial",
};

const CONTENT_W = LAYOUT.W - LAYOUT.M * 2;
const AVAIL_H = LAYOUT.BODY_BOTTOM - LAYOUT.BODY_TOP;

const toneHex = (t?: SlideKpi["tone"]) =>
  t === "success" ? DECK.success : t === "warning" ? DECK.warning : t === "danger" ? DECK.danger : t === "primary" ? DECK.primary : DECK.fg;

/** Bersihkan warna css (hsl/hex) menjadi hex 6 digit untuk pptxgenjs. */
export function toPptHex(c: string, fallback = DECK.primary): string {
  if (!c) return fallback;
  const s = c.trim();
  if (s.startsWith("#")) return s.slice(1).toUpperCase().padEnd(6, "0").slice(0, 6);
  if (/^[0-9a-fA-F]{6}$/.test(s)) return s.toUpperCase();
  const m = s.match(/hsla?\(\s*([\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%/);
  if (m) {
    const h = Number(m[1]) / 360, sa = Number(m[2]) / 100, l = Number(m[3]) / 100;
    const k = (n: number) => (n + h * 12) % 12;
    const a = sa * Math.min(l, 1 - l);
    const f = (n: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
    return [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  return fallback;
}

/* ------------------------------------------------------------------ */
/* Estimasi tinggi & paginasi (dipakai preview + generator)            */
/* ------------------------------------------------------------------ */

export function tableHeight(t: SlideTable): number {
  return (t.title ? 0.24 : 0) + LAYOUT.ROW_H * (t.rows.length + 1) + 0.06;
}

export function imagesGrid(count: number, fill?: boolean) {
  const n = count <= 1 ? 1 : count <= 2 ? 2 : count <= 4 ? 2 : 3;
  const rows = Math.ceil(count / n);
  const gap = 0.15;
  const cw = (CONTENT_W - gap * (n - 1)) / n;
  const ch = fill ? Math.min(cw * 0.62, (AVAIL_H - 0.3 - rows * 0.26) / rows) : cw * 0.62;
  return { cols: n, rows, gap, cw, ch };
}

export function blockHeight(b: SlideBlock): number {
  switch (b.type) {
    case "kpi": return 1.15;
    case "info": return Math.ceil(b.items.length / 4) * 0.62 + 0.1;
    case "table": return tableHeight(b) + LAYOUT.GAP;
    case "tables": return Math.max(...b.tables.map(tableHeight), 0.3) + LAYOUT.GAP;
    case "chart": return (b.height ?? 2.5) + LAYOUT.GAP;
    case "images": {
      const g = imagesGrid(b.items.length, b.fill);
      return g.rows * (g.ch + 0.3) + LAYOUT.GAP;
    }
    case "list": return (b.title ? 0.26 : 0) + Math.max(0.3, b.items.length * 0.26) + LAYOUT.GAP;
    case "columns": return Math.max(0.5, 0.4 + Math.max(...b.columns.map((c) => c.items.length || 1)) * 0.26) + LAYOUT.GAP;
    case "text": return Math.max(0.34, Math.ceil(b.value.length / 150) * 0.24) + LAYOUT.GAP;
    default: return 0.4;
  }
}

/** Berapa baris tabel yang muat pada ruang tersisa. */
function fitRows(t: SlideTable, avail: number): number {
  const head = (t.title ? 0.24 : 0) + LAYOUT.ROW_H + 0.06 + LAYOUT.GAP;
  return Math.max(0, Math.floor((avail - head) / LAYOUT.ROW_H));
}

/**
 * Pecah slide yang terlalu panjang menjadi beberapa slide (lanjutan),
 * memotong tabel per-baris. Hasilnya dipakai SAMA PERSIS oleh preview & .pptx.
 */
export function paginateSlides(slides: Slide[]): Slide[] {
  const out: Slide[] = [];
  for (const s of slides) {
    if (s.cover) { out.push(s); continue; }
    let pending = [...s.blocks];
    let page = 0;
    while (pending.length) {
      const blocks: SlideBlock[] = [];
      let avail = AVAIL_H;
      while (pending.length) {
        const b = pending[0];
        const h = blockHeight(b);
        if (h <= avail) { blocks.push(b); pending.shift(); avail -= h; continue; }
        if (b.type === "table") {
          const n = fitRows(b, avail);
          if (n >= 3) {
            blocks.push({ ...b, rows: b.rows.slice(0, n) });
            pending[0] = { ...b, rows: b.rows.slice(n), title: b.title ? `${b.title} (lanjutan)` : undefined };
          }
        }
        break;
      }
      if (!blocks.length) { // blok tunggal terlalu besar — paksa masuk
        blocks.push(pending.shift()!);
      }
      out.push({
        key: page === 0 ? s.key : `${s.key}-${page + 1}`,
        title: page === 0 ? s.title : `${s.title} (lanjutan ${page + 1})`,
        subtitle: s.subtitle,
        blocks,
      });
      page++;
      if (page > 12) break;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Generator .pptx                                                     */
/* ------------------------------------------------------------------ */

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function downloadPptx(slidesIn: Slide[], fileName: string, footer?: string) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  const { W, M, FONT } = LAYOUT;
  const slides = paginateSlides(slidesIn);
  const logo = await urlToDataUrl(`${window.location.origin}/images/pamitra-logo.png`);
  const total = slides.length;

  for (let si = 0; si < slides.length; si++) {
    const s = slides[si];
    const slide = pptx.addSlide();
    slide.background = { color: s.cover ? DECK.primary : DECK.bg };

    if (s.cover) {
      if (logo) slide.addImage({ data: logo, x: M, y: 0.5, w: 1.9, h: 0.55, sizing: { type: "contain", w: 1.9, h: 0.55 } } as any);
      slide.addText("DASHBOARD CONTROL TOWER — LAPORAN PROYEK", { x: M, y: 1.55, w: W - M * 2, h: 0.3, fontSize: 11, color: "BFD6F2", charSpacing: 2, fontFace: FONT });
      slide.addText(s.title, { x: M, y: 1.95, w: W - M * 2, h: 1.1, fontSize: 32, bold: true, color: "FFFFFF", fontFace: FONT });
      if (s.subtitle) slide.addText(s.subtitle, { x: M, y: 3.0, w: W - M * 2, h: 0.4, fontSize: 14, color: "DCE9F8", fontFace: FONT });
      let cy = 3.55;
      for (const b of s.blocks) {
        if (b.type === "text") { slide.addText(b.value, { x: M, y: cy, w: W - M * 2, h: 0.4, fontSize: 12, color: "EAF2FC", fontFace: FONT }); cy += 0.42; }
      }
      slide.addText(`${si + 1} / ${total}`, { x: W - 1.2, y: 5.1, w: 0.8, h: 0.25, fontSize: 9, color: "BFD6F2", align: "right", fontFace: FONT });
      continue;
    }

    /* header */
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: LAYOUT.HEADER_H, fill: { color: DECK.primary } });
    slide.addText(s.title, { x: M, y: 0.12, w: W - M * 2 - 1.7, h: 0.38, fontSize: 20, bold: true, color: "FFFFFF", fontFace: FONT });
    if (s.subtitle) slide.addText(s.subtitle, { x: M, y: 0.49, w: W - M * 2 - 1.7, h: 0.26, fontSize: 11, color: "D6E4F7", fontFace: FONT });
    if (logo) {
      slide.addShape(pptx.ShapeType.roundRect, { x: W - M - 1.45, y: 0.15, w: 1.45, h: 0.55, fill: { color: "FFFFFF" }, line: { color: "FFFFFF", width: 0 }, rectRadius: 0.08 });
      slide.addImage({ data: logo, x: W - M - 1.36, y: 0.2, w: 1.27, h: 0.45, sizing: { type: "contain", w: 1.27, h: 0.45 } } as any);
    }
    /* footer */
    slide.addText(footer || "", { x: M, y: 5.28, w: W - M * 2 - 1, h: 0.24, fontSize: 8.5, color: DECK.muted, fontFace: FONT });
    slide.addText(`${si + 1} / ${total}`, { x: W - M - 1, y: 5.28, w: 1, h: 0.24, fontSize: 8.5, color: DECK.muted, align: "right", fontFace: FONT });

    let y = LAYOUT.BODY_TOP;

    const drawTable = (t: SlideTable, x: number, w: number, yy: number, fs = 9) => {
      let cy = yy;
      if (t.title) {
        slide.addText(t.title.toUpperCase(), { x, y: cy, w, h: 0.2, fontSize: 8, bold: true, color: DECK.primary, fontFace: FONT, margin: 0 });
        cy += 0.24;
      }
      const h = LAYOUT.ROW_H * (t.rows.length + 1) + 0.06;
      // kartu membulat sebagai latar tabel (menyerupai card di preview)
      slide.addShape(pptx.ShapeType.roundRect, { x: x - 0.03, y: cy - 0.03, w: w + 0.06, h: h + 0.06, fill: { color: DECK.card }, line: { color: DECK.border, width: 1 }, rectRadius: 0.05 });
      const rows: any[] = [
        t.headers.map((hd, i) => ({ text: hd, options: { bold: true, color: "FFFFFF", fill: { color: DECK.primary }, fontSize: fs - 0.5, align: t.align?.[i] === "right" ? "right" : "left" } })),
        ...t.rows.map((r) =>
          r.map((c, i) => ({ text: c, options: { fontSize: fs, color: DECK.fg, align: t.align?.[i] === "right" ? "right" : "left" } })),
        ),
      ];
      slide.addTable(rows, {
        x, y: cy, w, rowH: LAYOUT.ROW_H - 0.03,
        border: { type: "solid", color: DECK.border, pt: 0.5 },
        fill: { color: DECK.card }, fontFace: FONT, valign: "middle", margin: 2, autoPage: false,
      });
      return cy + h;
    };

    for (const b of s.blocks) {
      if (b.type === "kpi") {
        const n = Math.min(b.items.length, 4);
        const gap = 0.18;
        const cw = (CONTENT_W - gap * (n - 1)) / n;
        b.items.slice(0, 4).forEach((k, i) => {
          const x = M + i * (cw + gap);
          slide.addShape(pptx.ShapeType.roundRect, { x, y, w: cw, h: 1.0, fill: { color: DECK.card }, line: { color: DECK.border, width: 1 }, rectRadius: 0.06 });
          slide.addText(k.label.toUpperCase(), { x: x + 0.12, y: y + 0.1, w: cw - 0.24, h: 0.2, fontSize: 8, color: DECK.muted, fontFace: FONT, bold: true, margin: 0 });
          slide.addText(k.value, { x: x + 0.12, y: y + 0.33, w: cw - 0.24, h: 0.35, fontSize: 15, bold: true, color: toneHex(k.tone), fontFace: FONT, margin: 0 });
          if (k.hint) slide.addText(k.hint, { x: x + 0.12, y: y + 0.7, w: cw - 0.24, h: 0.22, fontSize: 8, color: DECK.muted, fontFace: FONT, margin: 0 });
        });
        y += 1.15;
      } else if (b.type === "info") {
        const cols = 4;
        const gap = 0.14;
        const cw = (CONTENT_W - gap * (cols - 1)) / cols;
        b.items.forEach((it, i) => {
          const r = Math.floor(i / cols);
          const x = M + (i % cols) * (cw + gap);
          const yy = y + r * 0.62;
          slide.addShape(pptx.ShapeType.roundRect, { x, y: yy, w: cw, h: 0.56, fill: { color: DECK.card }, line: { color: DECK.border, width: 1 }, rectRadius: 0.05 });
          slide.addText(it.label.toUpperCase(), { x: x + 0.1, y: yy + 0.05, w: cw - 0.2, h: 0.18, fontSize: 7, bold: true, color: DECK.muted, fontFace: FONT, margin: 0 });
          slide.addText(it.value, { x: x + 0.1, y: yy + 0.24, w: cw - 0.2, h: 0.26, fontSize: 10, bold: true, color: DECK.fg, fontFace: FONT, margin: 0 });
        });
        y += Math.ceil(b.items.length / cols) * 0.62 + 0.1;
      } else if (b.type === "table") {
        y = drawTable(b, M, CONTENT_W, y) + LAYOUT.GAP;
      } else if (b.type === "tables") {
        const n = Math.max(1, b.tables.length);
        const gap = 0.18;
        const cw = (CONTENT_W - gap * (n - 1)) / n;
        let maxY = y;
        b.tables.forEach((t, i) => {
          const endY = drawTable(t, M + i * (cw + gap), cw, y, n > 2 ? 7.5 : 8.5);
          maxY = Math.max(maxY, endY);
        });
        y = maxY + LAYOUT.GAP;
      } else if (b.type === "chart") {
        const h = b.height ?? 2.5;
        const mk = (list: SlideSeries[]) => list.map((se) => ({ name: se.name, labels: b.categories, values: se.values as any }));
        const resolved = b.series.map((se) => ({ ...se, _type: se.type ?? b.kind }));
        const groups: any[] = [];
        const bars = resolved.filter((se) => se._type === "bar");
        if (bars.length) {
          groups.push({
            type: pptx.ChartType.bar,
            data: mk(bars),
            options: { chartColors: bars.map((se) => toPptHex(se.color)), barGrouping: "clustered", barGapWidthPct: 60 },
          });
        }
        const lineGroups = [
          resolved.filter((se) => se._type === "line" && !se.dashed && !se.secondary),
          resolved.filter((se) => se._type === "line" && se.dashed && !se.secondary),
          resolved.filter((se) => se._type === "line" && !se.dashed && se.secondary),
          resolved.filter((se) => se._type === "line" && se.dashed && se.secondary),
        ];
        lineGroups.forEach((g) => {
          if (!g.length) return;
          groups.push({
            type: pptx.ChartType.line,
            data: mk(g),
            options: {
              chartColors: g.map((se) => toPptHex(se.color)),
              lineDash: g[0].dashed ? "dash" : "solid",
              lineSize: g[0].dashed ? 1.75 : 2.25,
              lineSmooth: true,
              lineDataSymbol: "none",
              ...(g[0].secondary && bars.length ? { secondaryValAxis: true, secondaryCatAxis: true } : {}),
            },
          });
        });
        slide.addChart(groups as any, {
          x: M, y, w: CONTENT_W, h,
          showLegend: true, legendPos: "b", legendFontSize: 8, legendFontFace: FONT,
          catAxisLabelFontSize: 7.5, valAxisLabelFontSize: 7.5,
          catAxisLabelFontFace: FONT, valAxisLabelFontFace: FONT,
          valGridLine: { style: "dash", size: 0.5, color: DECK.border },
          catGridLine: { style: "none" },
          ...(groups.some((g) => g.options?.secondaryValAxis) ? { valAxes: [{ valAxisLabelFontSize: 7.5 }, { valAxisLabelFontSize: 7.5 }], catAxes: [{ catAxisLabelFontSize: 7.5 }, { catAxisHidden: true }] } : {}),
        } as any);
        y += h + LAYOUT.GAP;
      } else if (b.type === "images") {
        const items = b.items.slice(0, 6);
        const g = imagesGrid(items.length, b.fill);
        for (let i = 0; i < items.length; i++) {
          const r = Math.floor(i / g.cols);
          const x = M + (i % g.cols) * (g.cw + g.gap);
          const yy = y + r * (g.ch + 0.3);
          const dataUrl = await urlToDataUrl(items[i].url);
          slide.addShape(pptx.ShapeType.roundRect, { x, y: yy, w: g.cw, h: g.ch, fill: { color: DECK.border }, line: { color: DECK.border, width: 1 }, rectRadius: 0.05 });
          if (dataUrl) slide.addImage({ data: dataUrl, x, y: yy, w: g.cw, h: g.ch, sizing: { type: "cover", w: g.cw, h: g.ch } } as any);
          if (items[i].caption) slide.addText(items[i].caption!, { x, y: yy + g.ch + 0.02, w: g.cw, h: 0.24, fontSize: 8, color: DECK.muted, fontFace: FONT, margin: 0 });
        }
        y += g.rows * (g.ch + 0.3) + LAYOUT.GAP;
      } else if (b.type === "list") {
        if (b.title) { slide.addText(b.title.toUpperCase(), { x: M, y, w: CONTENT_W, h: 0.24, fontSize: 9, bold: true, color: DECK.muted, fontFace: FONT, margin: 0 }); y += 0.26; }
        const h = Math.max(0.3, b.items.length * 0.26);
        slide.addText(b.items.map((t) => ({ text: t, options: { bullet: true, fontSize: 11, color: DECK.fg } })), { x: M + 0.1, y, w: CONTENT_W - 0.2, h, fontFace: FONT });
        y += h + LAYOUT.GAP;
      } else if (b.type === "columns") {
        const n = b.columns.length || 1;
        const gap = 0.18;
        const cw = (CONTENT_W - gap * (n - 1)) / n;
        const h = Math.max(0.5, 0.4 + Math.max(...b.columns.map((c) => c.items.length || 1)) * 0.26);
        b.columns.forEach((c, i) => {
          const x = M + i * (cw + gap);
          slide.addShape(pptx.ShapeType.roundRect, { x, y, w: cw, h, fill: { color: DECK.card }, line: { color: DECK.border, width: 1 }, rectRadius: 0.06 });
          slide.addText(c.title.toUpperCase(), { x: x + 0.12, y: y + 0.08, w: cw - 0.24, h: 0.22, fontSize: 9, bold: true, color: DECK.primary, fontFace: FONT, margin: 0 });
          slide.addText(
            (c.items.length ? c.items : ["—"]).map((t) => ({ text: t, options: { bullet: true, fontSize: 9.5, color: DECK.fg } })),
            { x: x + 0.2, y: y + 0.34, w: cw - 0.34, h: h - 0.42, fontFace: FONT },
          );
        });
        y += h + LAYOUT.GAP;
      } else if (b.type === "text") {
        const h = Math.max(0.34, Math.ceil(b.value.length / 150) * 0.24);
        slide.addText(b.value, { x: M, y, w: CONTENT_W, h, fontSize: 11, color: DECK.fg, fontFace: FONT, margin: 0, valign: "top" });
        y += h + LAYOUT.GAP;
      }
    }
  }

  await pptx.writeFile({ fileName });
}
