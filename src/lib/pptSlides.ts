/**
 * Model slide laporan proyek — dipakai BERSAMA oleh halaman preview (React)
 * dan generator .pptx, sehingga isi file identik dengan yang tampil di preview.
 */

export type SlideKpi = { label: string; value: string; hint?: string; tone?: "default" | "success" | "warning" | "danger" | "primary" };
export type SlideTable = { title?: string; headers: string[]; rows: string[][]; align?: ("left" | "right")[] };
export type SlideSeries = { name: string; values: (number | null)[]; color: string; dashed?: boolean };
export type SlideBlock =
  | { type: "kpi"; items: SlideKpi[] }
  | { type: "table"; headers: string[]; rows: string[][]; align?: ("left" | "right")[]; title?: string }
  | { type: "tables"; tables: SlideTable[] }
  | { type: "list"; title?: string; items: string[] }
  | { type: "text"; value: string }
  | { type: "info"; items: { label: string; value: string }[] }
  | { type: "chart"; kind: "line" | "bar"; title?: string; categories: string[]; series: SlideSeries[]; height?: number }
  | { type: "images"; items: { url: string; caption?: string }[] }
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

export async function downloadPptx(slides: Slide[], fileName: string) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9"; // 10 x 5.625 in
  const W = 10;

  for (const s of slides) {
    const slide = pptx.addSlide();
    slide.background = { color: s.cover ? DECK.primary : DECK.bg };

    if (s.cover) {
      slide.addText(s.title, { x: 0.7, y: 1.9, w: W - 1.4, h: 1.0, fontSize: 34, bold: true, color: "FFFFFF", fontFace: "Arial" });
      if (s.subtitle) slide.addText(s.subtitle, { x: 0.7, y: 2.9, w: W - 1.4, h: 0.5, fontSize: 16, color: "DCE9F8", fontFace: "Arial" });
    } else {
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 0.85, fill: { color: DECK.primary } });
      slide.addText(s.title, { x: 0.45, y: 0.12, w: W - 0.9, h: 0.36, fontSize: 20, bold: true, color: "FFFFFF", fontFace: "Arial" });
      if (s.subtitle) slide.addText(s.subtitle, { x: 0.45, y: 0.48, w: W - 0.9, h: 0.28, fontSize: 11, color: "D6E4F7", fontFace: "Arial" });
    }

    let y = s.cover ? 3.6 : 1.0;

    const drawTable = (t: SlideTable, x: number, w: number, yy: number, fs = 9) => {
      let cy = yy;
      if (t.title) {
        slide.addText(t.title.toUpperCase(), { x, y: cy, w, h: 0.2, fontSize: 8, bold: true, color: DECK.primary, fontFace: "Arial" });
        cy += 0.22;
      }
      const rows: any[] = [
        t.headers.map((h) => ({ text: h, options: { bold: true, color: "FFFFFF", fill: { color: DECK.primary }, fontSize: fs - 0.5 } })),
        ...t.rows.map((r) =>
          r.map((c, i) => ({ text: c, options: { fontSize: fs, color: DECK.fg, align: t.align?.[i] === "right" ? "right" : "left" } })),
        ),
      ];
      slide.addTable(rows, { x, y: cy, w, border: { type: "solid", color: DECK.border, pt: 1 }, fill: { color: DECK.card }, fontFace: "Arial", autoPage: false });
      return cy + 0.26 + t.rows.length * (fs >= 9 ? 0.24 : 0.2);
    };

    for (const b of s.blocks) {
      if (b.type === "kpi") {
        const n = Math.min(b.items.length, 4);
        const gap = 0.18;
        const cw = (W - 0.9 - gap * (n - 1)) / n;
        b.items.slice(0, 4).forEach((k, i) => {
          const x = 0.45 + i * (cw + gap);
          slide.addShape(pptx.ShapeType.roundRect, { x, y, w: cw, h: 1.0, fill: { color: DECK.card }, line: { color: DECK.border, width: 1 }, rectRadius: 0.06 });
          slide.addText(k.label.toUpperCase(), { x: x + 0.12, y: y + 0.1, w: cw - 0.24, h: 0.2, fontSize: 8, color: DECK.muted, fontFace: "Arial", bold: true });
          slide.addText(k.value, { x: x + 0.12, y: y + 0.33, w: cw - 0.24, h: 0.35, fontSize: 15, bold: true, color: toneHex(k.tone), fontFace: "Arial" });
          if (k.hint) slide.addText(k.hint, { x: x + 0.12, y: y + 0.7, w: cw - 0.24, h: 0.22, fontSize: 8, color: DECK.muted, fontFace: "Arial" });
        });
        y += 1.15;
      } else if (b.type === "info") {
        const cols = 4;
        const gap = 0.14;
        const cw = (W - 0.9 - gap * (cols - 1)) / cols;
        b.items.forEach((it, i) => {
          const r = Math.floor(i / cols);
          const x = 0.45 + (i % cols) * (cw + gap);
          const yy = y + r * 0.62;
          slide.addShape(pptx.ShapeType.roundRect, { x, y: yy, w: cw, h: 0.56, fill: { color: DECK.card }, line: { color: DECK.border, width: 1 }, rectRadius: 0.05 });
          slide.addText(it.label.toUpperCase(), { x: x + 0.1, y: yy + 0.05, w: cw - 0.2, h: 0.18, fontSize: 7, bold: true, color: DECK.muted, fontFace: "Arial" });
          slide.addText(it.value, { x: x + 0.1, y: yy + 0.24, w: cw - 0.2, h: 0.26, fontSize: 10, bold: true, color: DECK.fg, fontFace: "Arial" });
        });
        y += Math.ceil(b.items.length / cols) * 0.62 + 0.1;
      } else if (b.type === "table") {
        y = drawTable(b, 0.45, W - 0.9, y);
      } else if (b.type === "tables") {
        const n = Math.max(1, b.tables.length);
        const gap = 0.18;
        const cw = (W - 0.9 - gap * (n - 1)) / n;
        let maxY = y;
        b.tables.forEach((t, i) => {
          const endY = drawTable(t, 0.45 + i * (cw + gap), cw, y, n > 2 ? 7.5 : 8.5);
          maxY = Math.max(maxY, endY);
        });
        y = maxY + 0.1;
      } else if (b.type === "chart") {
        const h = b.height ?? 2.6;
        const data = b.series.map((se) => ({ name: se.name, labels: b.categories, values: se.values.map((v) => (v == null ? null : v)) as any }));
        slide.addChart(b.kind === "bar" ? pptx.ChartType.bar : pptx.ChartType.line, data as any, {
          x: 0.45, y, w: W - 0.9, h,
          chartColors: b.series.map((se) => toPptHex(se.color)),
          showLegend: true, legendPos: "b", legendFontSize: 8,
          catAxisLabelFontSize: 7, valAxisLabelFontSize: 7,
          lineDataSymbol: "none", lineSmooth: true,
          barGapWidthPct: 60,
        } as any);
        y += h + 0.12;
      } else if (b.type === "images") {
        const items = b.items.slice(0, 6);
        const n = Math.min(3, Math.max(1, items.length));
        const gap = 0.15;
        const cw = (W - 0.9 - gap * (n - 1)) / n;
        const ch = cw * 0.62;
        for (let i = 0; i < items.length; i++) {
          const r = Math.floor(i / n);
          const x = 0.45 + (i % n) * (cw + gap);
          const yy = y + r * (ch + 0.32);
          const dataUrl = await urlToDataUrl(items[i].url);
          if (dataUrl) slide.addImage({ data: dataUrl, x, y: yy, w: cw, h: ch, sizing: { type: "cover", w: cw, h: ch } } as any);
          else slide.addShape(pptx.ShapeType.rect, { x, y: yy, w: cw, h: ch, fill: { color: DECK.border } });
          if (items[i].caption) slide.addText(items[i].caption!, { x, y: yy + ch + 0.02, w: cw, h: 0.24, fontSize: 7.5, color: DECK.muted, fontFace: "Arial" });
        }
        y += Math.ceil(items.length / n) * (ch + 0.32);
      } else if (b.type === "list") {
        if (b.title) { slide.addText(b.title.toUpperCase(), { x: 0.45, y, w: W - 0.9, h: 0.24, fontSize: 9, bold: true, color: DECK.muted, fontFace: "Arial" }); y += 0.26; }
        slide.addText(b.items.map((t) => ({ text: t, options: { bullet: true, fontSize: 11, color: DECK.fg } })), { x: 0.55, y, w: W - 1.1, h: Math.max(0.3, b.items.length * 0.26), fontFace: "Arial" });
        y += Math.max(0.3, b.items.length * 0.26) + 0.15;
      } else if (b.type === "columns") {
        const n = b.columns.length || 1;
        const gap = 0.18;
        const cw = (W - 0.9 - gap * (n - 1)) / n;
        let maxH = 0.4;
        b.columns.forEach((c, i) => {
          const x = 0.45 + i * (cw + gap);
          const h = Math.max(0.5, 0.35 + c.items.length * 0.26);
          maxH = Math.max(maxH, h);
          slide.addShape(pptx.ShapeType.roundRect, { x, y, w: cw, h, fill: { color: DECK.card }, line: { color: DECK.border, width: 1 }, rectRadius: 0.06 });
          slide.addText(c.title.toUpperCase(), { x: x + 0.12, y: y + 0.08, w: cw - 0.24, h: 0.22, fontSize: 9, bold: true, color: DECK.primary, fontFace: "Arial" });
          slide.addText(
            (c.items.length ? c.items : ["—"]).map((t) => ({ text: t, options: { bullet: true, fontSize: 9.5, color: DECK.fg } })),
            { x: x + 0.2, y: y + 0.32, w: cw - 0.34, h: h - 0.4, fontFace: "Arial" },
          );
        });
        y += maxH + 0.15;
      } else if (b.type === "text") {
        slide.addText(b.value, { x: 0.45, y, w: W - 0.9, h: 0.5, fontSize: 11, color: DECK.fg, fontFace: "Arial" });
        y += 0.6;
      }
    }
  }

  await pptx.writeFile({ fileName });
}
