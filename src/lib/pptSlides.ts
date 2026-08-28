/**
 * Model slide laporan proyek — dipakai BERSAMA oleh halaman preview (React)
 * dan generator .pptx, sehingga isi file identik dengan yang tampil di preview.
 */

export type SlideKpi = { label: string; value: string; hint?: string; tone?: "default" | "success" | "warning" | "danger" | "primary" };
export type SlideBlock =
  | { type: "kpi"; items: SlideKpi[] }
  | { type: "table"; headers: string[]; rows: string[][]; align?: ("left" | "right")[] }
  | { type: "list"; title?: string; items: string[] }
  | { type: "text"; value: string }
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

    let y = s.cover ? 3.6 : 1.1;

    for (const b of s.blocks) {
      if (b.type === "kpi") {
        const n = Math.min(b.items.length, 4);
        const gap = 0.18;
        const cw = (W - 0.9 - gap * (n - 1)) / n;
        b.items.slice(0, 4).forEach((k, i) => {
          const x = 0.45 + i * (cw + gap);
          slide.addShape(pptx.ShapeType.roundRect, { x, y, w: cw, h: 1.0, fill: { color: DECK.card }, line: { color: DECK.border, width: 1 }, rectRadius: 0.06 });
          slide.addText(k.label.toUpperCase(), { x: x + 0.12, y: y + 0.1, w: cw - 0.24, h: 0.2, fontSize: 8, color: DECK.muted, fontFace: "Arial", bold: true });
          slide.addText(k.value, { x: x + 0.12, y: y + 0.33, w: cw - 0.24, h: 0.35, fontSize: 16, bold: true, color: toneHex(k.tone), fontFace: "Arial" });
          if (k.hint) slide.addText(k.hint, { x: x + 0.12, y: y + 0.7, w: cw - 0.24, h: 0.22, fontSize: 8, color: DECK.muted, fontFace: "Arial" });
        });
        y += 1.2;
      } else if (b.type === "table") {
        const rows: any[] = [
          b.headers.map((h) => ({ text: h, options: { bold: true, color: "FFFFFF", fill: { color: DECK.primary }, fontSize: 9 } })),
          ...b.rows.map((r) =>
            r.map((c, i) => ({ text: c, options: { fontSize: 9, color: DECK.fg, align: b.align?.[i] === "right" ? "right" : "left" } })),
          ),
        ];
        slide.addTable(rows, { x: 0.45, y, w: W - 0.9, border: { type: "solid", color: DECK.border, pt: 1 }, fill: { color: DECK.card }, fontFace: "Arial", autoPage: false });
        y += 0.28 + b.rows.length * 0.24;
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
