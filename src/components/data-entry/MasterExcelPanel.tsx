import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Download, Upload, Loader2, AlertTriangle } from "lucide-react";

// Order matters: parents before children (insert order). Restore deletes via project cascade.
const TABLES: { table: string; sheet: string; label: string; projectCol?: string; viaWorkArea?: boolean; viaWorkItem?: boolean; exportOnly?: boolean }[] = [
  { table: "projects", sheet: "Master_Projects", label: "Proyek", projectCol: "id" },
  { table: "work_areas", sheet: "WBS_Areas", label: "WBS Area", projectCol: "project_id" },
  { table: "work_items", sheet: "WBS_Items", label: "WBS Item", viaWorkArea: true },
  { table: "sub_tasks", sheet: "WBS_SubTasks", label: "WBS Sub-task", viaWorkItem: true },
  { table: "s_curve_data", sheet: "S_Curve_Weekly", label: "S-Curve", projectCol: "project_id" },
  { table: "milestones", sheet: "Milestones", label: "Milestones", projectCol: "project_id" },
  { table: "procurement_items", sheet: "Procurement", label: "Procurement", projectCol: "project_id" },
  { table: "purchase_orders", sheet: "Purchase_Orders", label: "PO", projectCol: "project_id" },
  { table: "finance_entries", sheet: "Finance_Cashflow", label: "Finance", projectCol: "project_id" },
  { table: "project_billings", sheet: "BAL_Termin", label: "BAL", projectCol: "project_id" },
  { table: "addendums", sheet: "Kontrak", label: "Kontrak", projectCol: "project_id" },
  { table: "project_alerts", sheet: "Risks", label: "Risk", projectCol: "project_id" },
  { table: "weekly_progress_reports", sheet: "Weekly_Reports", label: "Weekly Report", projectCol: "project_id" },
  { table: "project_photos", sheet: "Photos", label: "Foto", projectCol: "project_id" },
  { table: "project_tank_sites", sheet: "BoD_Tank_Sites", label: "Site Tangki", projectCol: "project_id" },
  { table: "project_tanks", sheet: "BoD_Tanks", label: "Tangki", projectCol: "project_id" },
  { table: "hr_personnel", sheet: "SDM", label: "SDM", projectCol: "project_id" },
  { table: "manpower_logs", sheet: "Manpower_Logs", label: "Manpower", projectCol: "project_id" },
  { table: "monthly_budgets", sheet: "Monthly_Budgets", label: "Monthly Budget" },
  { table: "notifications", sheet: "Notifications", label: "Notifikasi", projectCol: "project_id" },
  { table: "user_project_assignments", sheet: "Akses_Proyek", label: "Akses proyek akun", projectCol: "project_id" },
  { table: "activity_logs", sheet: "Activity_Logs", label: "Activity Log", projectCol: "project_id", exportOnly: true },
];
const JSON_COLS = new Set(["achievements", "outstanding_items", "next_week_targets", "escalations"]);
const HELPER = ["_kode_proyek", "_nama_proyek"];

async function fetchAll(table: string) {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await (supabase as any).from(table).select("*").order("id").range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function buildWorkbook(onStep: (s: string) => void) {
  const data: Record<string, any[]> = {};
  for (const t of TABLES) { onStep(`Mengambil ${t.label}…`); data[t.table] = await fetchAll(t.table); }
  const proj = new Map(data.projects.map((p: any) => [p.id, p]));
  const areaProj = new Map(data.work_areas.map((a: any) => [a.id, a.project_id]));
  const itemProj = new Map(data.work_items.map((i: any) => [i.id, areaProj.get(i.work_area_id)]));

  const wb = XLSX.utils.book_new();
  const colIndex: Record<string, Record<string, string>> = {};
  const readme = [
    ["MASTER EXPORT — Pamitra Control Tower"],
    [`Diekspor: ${new Date().toLocaleString("id-ID")}`],
    [""],
    ["Setiap sheet = satu jenis data. Kolom _kode_proyek & _nama_proyek hanya bantuan baca (diabaikan saat import)."],
    ["Kolom id/project_id adalah kunci relasi antar sheet — JANGAN diubah agar import kembali sinkron."],
    ["Baris baru: kosongkan kolom id (akan dibuat otomatis). project_id wajib diisi id dari Master_Projects."],
    ["Sheet Ringkasan memakai rumus SUMIFS/COUNTIFS ke sheet lain, otomatis berubah saat data diubah."],
    [""],
    ["Sheet", "Jumlah baris", "Keterangan"],
  ];
  const sheets: [string, XLSX.WorkSheet][] = [];
  for (const t of TABLES) {
    const rows = data[t.table];
    const cols = rows.length ? Object.keys(rows[0]) : ["id"];
    const header = [...HELPER, ...cols];
    const aoa: any[][] = [header];
    for (const r of rows) {
      const pid = t.table === "projects" ? r.id
        : t.viaWorkArea ? areaProj.get(r.work_area_id)
        : t.viaWorkItem ? itemProj.get(r.work_item_id)
        : t.projectCol ? r[t.projectCol] : null;
      const p: any = pid ? proj.get(pid) : null;
      aoa.push([p?.project_code ?? "", p?.name ?? "", ...cols.map(c => {
        const v = r[c];
        if (v === null || v === undefined) return "";
        if (typeof v === "object") return JSON.stringify(v);
        return v;
      })]);
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = header.map(h => ({ wch: Math.min(40, Math.max(10, h.length + 2)) }));
    ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(1, aoa.length - 1), c: header.length - 1 } }) };
    colIndex[t.sheet] = Object.fromEntries(header.map((h, i) => [h, XLSX.utils.encode_col(i)]));
    sheets.push([t.sheet, ws]);
    readme.push([t.sheet, String(rows.length), t.exportOnly ? `${t.label} (hanya export, tidak di-restore)` : t.label]);
  }

  // Ringkasan with live formulas
  const N = 200000;
  const ref = (sheet: string, col: string) => { const c = colIndex[sheet]?.[col]; return c ? `${sheet}!$${c}$2:$${c}$${N}` : null; };
  const sumifs = (sheet: string, sumCol: string, extra = "") => {
    const s = ref(sheet, sumCol), k = ref(sheet, "_kode_proyek");
    return s && k ? `SUMIFS(${s},${k},$A{r}${extra})` : "0";
  };
  const fin = (dir: string, kind: string) => {
    const d = ref("Finance_Cashflow", "direction"), k = ref("Finance_Cashflow", "entry_kind");
    return d && k ? sumifs("Finance_Cashflow", "amount", `,${d},"${dir}",${k},"${kind}"`) : "0";
  };
  const sumHead = ["Kode Proyek", "Nama Proyek", "Client", "Status", "Contract Value", "RAP", "BAL Plan", "BAL Terbayar", "Cash In Actual", "Cash Out Actual", "Net Cashflow", "Jml Kontrak", "Jml Risk", "Jml Tangki"];
  const sumAoa: any[][] = [sumHead];
  data.projects.forEach((p: any, i: number) => {
    const r = i + 2;
    const cnt = (sheet: string) => { const k = ref(sheet, "_kode_proyek"); return k ? { f: `COUNTIFS(${k},$A${r})` } : 0; };
    const f = (s: string) => ({ f: s.split("{r}").join(String(r)) });
    sumAoa.push([
      p.project_code, p.name, p.client, p.status, Number(p.contract_value) || 0, Number(p.rap) || 0,
      f(sumifs("BAL_Termin", "plan_amount")), f(sumifs("BAL_Termin", "paid_amount")),
      f(fin("in", "actual")), f(fin("out", "actual")), { f: `I${r}-J${r}` },
      cnt("Kontrak"), cnt("Risks"), cnt("BoD_Tanks"),
    ]);
  });
  const sws = XLSX.utils.aoa_to_sheet(sumAoa);
  sws["!cols"] = sumHead.map(() => ({ wch: 18 }));
  for (let r = 1; r < sumAoa.length; r++) for (let c = 4; c <= 10; c++) {
    const cell = sws[XLSX.utils.encode_cell({ r, c })]; if (cell) cell.z = "#,##0";
  }

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(readme), "README");
  XLSX.utils.book_append_sheet(wb, sws, "Ringkasan");
  for (const [n, ws] of sheets) XLSX.utils.book_append_sheet(wb, ws, n);
  return wb;
}

function downloadWb(wb: XLSX.WorkBook, prefix: string) {
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  XLSX.writeFile(wb, `${prefix}_${stamp}.xlsx`, { compression: true });
}

function clean(row: Record<string, any>) {
  const o: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    if (HELPER.includes(k) || k.startsWith("__")) continue;
    if (v === "" || v === undefined) { o[k] = null; continue; }
    if (JSON_COLS.has(k) && typeof v === "string") { try { o[k] = JSON.parse(v); } catch { o[k] = v; } continue; }
    o[k] = v;
  }
  if (!o.id) delete o.id;
  return o;
}

export function MasterExcelPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  const [mode, setMode] = useState<"upsert" | "replace">("upsert");
  const [log, setLog] = useState<string[]>([]);

  const doExport = async () => {
    setBusy(true); setLog([]);
    try { const wb = await buildWorkbook(setStep); downloadWb(wb, "Master_Pamitra_ControlTower"); setStep("Export selesai."); }
    catch (e: any) { setStep(`Gagal export: ${e.message}`); }
    finally { setBusy(false); }
  };

  const doImport = async (file: File) => {
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
    const present = TABLES.filter(t => !t.exportOnly && wb.Sheets[t.sheet]);
    if (!present.length) { setStep("File tidak berisi sheet Master yang dikenali."); return; }
    if (mode === "replace") {
      const ans = window.prompt(`MODE RESTORE: semua data proyek saat ini akan DIHAPUS lalu diganti isi file (${present.length} sheet).\nBackup otomatis akan diunduh dulu.\nKetik RESTORE untuk melanjutkan.`);
      if (ans !== "RESTORE") { setStep("Dibatalkan."); return; }
    }
    setBusy(true); const out: string[] = [];
    try {
      if (mode === "replace") {
        setStep("Membuat backup otomatis…");
        downloadWb(await buildWorkbook(setStep), "Backup_Sebelum_Restore");
        setStep("Menghapus data lama…");
        for (const t of ["monthly_budgets", "manpower_logs", "projects"]) {
          if (!present.some(p => p.table === t)) continue;
          const { error } = await (supabase as any).from(t).delete().not("id", "is", null);
          if (error) throw new Error(`Hapus ${t}: ${error.message}`);
        }
      }
      for (const t of present) {
        const rows = (XLSX.utils.sheet_to_json(wb.Sheets[t.sheet], { defval: "", raw: true }) as any[]).map(clean).filter(r => Object.values(r).some(v => v !== null));
        setStep(`Menyimpan ${t.label} (${rows.length} baris)…`);
        let ok = 0;
        for (let i = 0; i < rows.length; i += 500) {
          const batch = rows.slice(i, i + 500);
          const { error } = await (supabase as any).from(t.table).upsert(batch, { onConflict: "id" });
          if (error) { out.push(`✗ ${t.label} baris ${i + 2}-${i + batch.length + 1}: ${error.message}`); continue; }
          ok += batch.length;
        }
        out.push(`✓ ${t.label}: ${ok} baris`);
        setLog([...out]);
      }
      await supabase.from("activity_logs").insert({
        entity_type: "master_excel", action: mode === "replace" ? "delete" : "update",
        details: `Master Excel ${mode === "replace" ? "RESTORE (hapus & isi ulang)" : "sinkron"} dari ${file.name}`,
        user_id: user?.id ?? null, user_name: user?.email ?? null,
      });
      qc.invalidateQueries();
      setStep("Import selesai.");
    } catch (e: any) { out.push(`✗ ${e.message}`); setStep("Import berhenti karena error."); }
    finally { setLog(out); setBusy(false); }
  };

  return (
    <div className="glass-card rounded-lg shadow-card p-4 space-y-4 mb-5">
      <div>
        <h3 className="text-sm font-bold text-foreground">Master Excel — Seluruh Proyek</h3>
        <p className="text-xs text-muted-foreground">Satu file berisi semua data (proyek, S-Curve, finance, BAL, kontrak, WBS, risk, tangki, dll.) yang saling terhubung lewat kode proyek, plus sheet Ringkasan berumus.</p>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <button disabled={busy} onClick={doExport} className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium disabled:opacity-50">
          <Download className="h-3.5 w-3.5" /> Download Master Excel
        </button>
        <select disabled={busy} value={mode} onChange={e => setMode(e.target.value as any)} className="px-2 py-2 text-xs bg-card border border-border rounded-lg">
          <option value="upsert">Import: Sinkron (update + tambah, tidak menghapus)</option>
          <option value="replace">Import: Restore (hapus semua lalu isi ulang dari file)</option>
        </select>
        <button disabled={busy} onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border text-foreground rounded-lg text-xs font-medium hover:bg-muted disabled:opacity-50">
          <Upload className="h-3.5 w-3.5" /> Import Master Excel
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) doImport(f); }} />
        {busy && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        {step && <span className="text-xs text-muted-foreground">{step}</span>}
      </div>
      {mode === "replace" && (
        <p className="text-xs text-destructive flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Mode Restore menghapus semua data proyek sebelum mengisi ulang. Backup otomatis diunduh terlebih dahulu.</p>
      )}
      {log.length > 0 && (
        <div className="text-[11px] font-mono bg-muted/50 rounded p-2 max-h-48 overflow-auto">{log.map((l, i) => <div key={i}>{l}</div>)}</div>
      )}
    </div>
  );
}
